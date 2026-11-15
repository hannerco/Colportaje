-- HU-CLI-11 · Archivar y restaurar un cliente. BR-CUS-09, BR-PAY-13 (archivar), ADR-0022, AF-47, AF-71.
-- Archivar reemplaza a eliminar. Ambas funciones bloquean el cliente (for update), como
-- assign_copy_to_customer: así no se le vende un libro mientras se archiva.

-- ─── Archivar (R1–R3) ─────────────────────────────────────────────────────────────────────────────
-- Idempotente: archivar un cliente ya archivado no cambia nada (reintento tras un fallo de red).
-- Errores (P0001): FORBIDDEN, NOT_FOUND (inexistente, ajeno o descartado), CUSTOMER_HAS_BOOKS.
create function public.archive_customer(p_customer_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_owner uuid := public.require_active_user();
  v_archived timestamptz;
begin
  select c.archived_at into v_archived from public.customer c
  where c.id = p_customer_id and c.owner_id = v_owner and c.deleted_at is null
  for update;
  if not found then
    raise exception 'NOT_FOUND: cliente inexistente' using errcode = 'P0001';
  end if;
  if v_archived is not null then
    return;
  end if;
  -- R1: primero se devuelven sus libros.
  if exists (
    select 1 from public.copy cp
    where cp.customer_id = p_customer_id and cp.status = 'sold' and cp.deleted_at is null
  ) then
    raise exception 'CUSTOMER_HAS_BOOKS: el cliente tiene ejemplares vendidos' using errcode = 'P0001';
  end if;

  -- R2: los programados se cancelan con motivo customer_archived (el trigger deja el evento canceled).
  -- R3: cobrados y entregados no se tocan.
  perform set_config('colportor.payment_event', jsonb_build_object('trigger', 'customer_archived')::text, true);
  update public.payment set status = 'canceled', canceled_at = now(), cancel_reason = 'customer_archived'
  where customer_id = p_customer_id and owner_id = v_owner and status = 'scheduled' and deleted_at is null;
  perform set_config('colportor.payment_event', '', true);

  update public.customer set archived_at = now(), updated_at = now() where id = p_customer_id;
end
$$;

revoke all on function public.archive_customer(uuid) from public, anon, authenticated, service_role;
grant execute on function public.archive_customer(uuid) to authenticated;

-- ─── Restaurar (R4) ───────────────────────────────────────────────────────────────────────────────
-- Quita archived_at; los abonos cancelados siguen cancelados (ronda 26).
-- Errores (P0001): FORBIDDEN, NOT_FOUND, CUSTOMER_NOT_ARCHIVED.
create function public.restore_customer(p_customer_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_owner uuid := public.require_active_user();
  v_archived timestamptz;
begin
  select c.archived_at into v_archived from public.customer c
  where c.id = p_customer_id and c.owner_id = v_owner and c.deleted_at is null
  for update;
  if not found then
    raise exception 'NOT_FOUND: cliente inexistente' using errcode = 'P0001';
  end if;
  if v_archived is null then
    raise exception 'CUSTOMER_NOT_ARCHIVED: el cliente no está archivado' using errcode = 'P0001';
  end if;
  update public.customer set archived_at = null, updated_at = now() where id = p_customer_id;
end
$$;

revoke all on function public.restore_customer(uuid) from public, anon, authenticated, service_role;
grant execute on function public.restore_customer(uuid) to authenticated;

-- ─── Archivar, restaurar y descartar solo por sus funciones ───────────────────────────────────────
-- El usuario edita los datos del cliente por la API (HU-CLI-02), pero archived_at y deleted_at solo
-- cambian con archive_customer, restore_customer y discard_new_customer (corren como su dueño, no como
-- `authenticated`): así no se archiva con libros vendidos ni se descarta dejando libros o abonos sueltos.
create function public.customer_guard_lifecycle() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated'
     and (new.archived_at is distinct from old.archived_at or new.deleted_at is distinct from old.deleted_at) then
    raise exception 'INVALID_TRANSITION: archivar, restaurar y descartar se hacen con sus funciones'
      using errcode = 'P0001';
  end if;
  return new;
end
$$;

revoke all on function public.customer_guard_lifecycle() from public, anon, authenticated, service_role;

create trigger customer_guard_lifecycle before update on public.customer
  for each row execute function public.customer_guard_lifecycle();
