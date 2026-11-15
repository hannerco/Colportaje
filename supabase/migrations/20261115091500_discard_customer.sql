-- HU-CLI-03 · Descartar un cliente recién creado. BR-CUS-14, BR-GEN-02, BR-COPY-09 (AF-114), ADR-0038, AF-112.
-- La base no sabe si el cliente está en creación: el front decide cuándo llamar (ADR-0038).

-- ─── payment_guard: el descarte también borra los abonos cancelados ───────────────────────────────
-- Igual a la versión de HU-ABO-02 salvo una cosa: con colportor.customer_discard = 'on' (solo lo pone
-- discard_new_customer, en su transacción) un abono cancelado también puede quedar con deleted_at (R2).
-- Lo entregado sigue sin borrarse: siempre está en un Abibono y el descarte se rechaza antes (R1).
create or replace function public.payment_guard() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  today date := public.today_bogota();
  correcting boolean := coalesce(current_setting('colportor.payment_correction', true), '') = 'on';
  discarding boolean := coalesce(current_setting('colportor.customer_discard', true), '') = 'on';
begin
  -- R6: la fecha real no es futura.
  if new.paid_at is not null and new.paid_at > today
     and (tg_op = 'INSERT' or new.paid_at is distinct from old.paid_at) then
    raise exception 'PAID_AT_IN_FUTURE: la fecha real no puede ser futura' using errcode = 'P0001';
  end if;

  if tg_op = 'INSERT' then
    if new.kind = 'scheduled' and new.status = 'scheduled' then
      if new.due_date < today then
        raise exception 'DUE_DATE_IN_PAST: la fecha acordada no puede ser anterior a hoy' using errcode = 'P0001';
      end if;
      if new.original_due_date is distinct from new.due_date then
        raise exception 'INVALID_ORIGINAL_DUE_DATE: un abono programado nace con fecha original = acordada'
          using errcode = 'P0001';
      end if;
    end if;
    return new;
  end if;

  if new.owner_id <> old.owner_id or new.kind <> old.kind or new.created_at <> old.created_at then
    raise exception 'INVALID_TRANSITION: dueño, tipo y creación no cambian' using errcode = 'P0001';
  end if;

  if old.deleted_at is not null then
    raise exception 'INVALID_TRANSITION: un abono borrado no se edita' using errcode = 'P0001';
  end if;

  if new.deleted_at is not null
     and old.status not in ('scheduled', 'collected')
     and not (discarding and old.status = 'canceled') then
    raise exception 'INVALID_TRANSITION: un abono % no se borra', old.status using errcode = 'P0001';
  end if;

  if new.status <> old.status and (old.status, new.status) not in (
    ('scheduled', 'collected'), ('scheduled', 'canceled'), ('collected', 'delivered'), ('delivered', 'collected')
  ) then
    raise exception 'INVALID_TRANSITION: % → %', old.status, new.status using errcode = 'P0001';
  end if;

  -- R4: la fecha original no cambia, salvo la corrección durante la creación (que mueve ambas) o la
  -- corrección de la fecha real de una cuota inicial (que mueve las tres).
  if new.original_due_date is distinct from old.original_due_date then
    if new.kind = 'down_payment' and new.original_due_date = new.paid_at then
      null;
    elsif not correcting or old.status <> 'scheduled' or new.original_due_date is distinct from new.due_date then
      raise exception 'ORIGINAL_DUE_DATE_LOCKED: la fecha original no cambia' using errcode = 'P0001';
    end if;
  end if;

  if new.status = 'scheduled' and new.due_date is distinct from old.due_date and new.due_date < today then
    raise exception 'DUE_DATE_IN_PAST: la fecha acordada no puede ser anterior a hoy' using errcode = 'P0001';
  end if;
  return new;
end
$$;

-- ─── Resumen de lo que se perderá ("Se quitarán 2 libros y 1 abono") ──────────────────────────────
-- books: ejemplares vendidos al cliente. payments: abonos no borrados ni cancelados. invoices: facturas
-- activas. photos: fotos de información activas (las de factura van dentro de cada factura).
-- blocked_by_deposit: algún abono está en un Abibono (borrador o confirmado) → el descarte se rechazará.
-- Errores (P0001): FORBIDDEN, NOT_FOUND.
create function public.customer_discard_summary(p_customer_id uuid)
returns table (books integer, payments integer, invoices integer, photos integer, blocked_by_deposit boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_owner uuid := public.require_active_user();
begin
  if not exists (
    select 1 from public.customer c
    where c.id = p_customer_id and c.owner_id = v_owner and c.deleted_at is null
  ) then
    raise exception 'NOT_FOUND: cliente inexistente' using errcode = 'P0001';
  end if;
  return query select
    (select count(*)::integer from public.copy cp
      where cp.customer_id = p_customer_id and cp.status = 'sold' and cp.deleted_at is null),
    (select count(*)::integer from public.payment p
      where p.customer_id = p_customer_id and p.deleted_at is null and p.status <> 'canceled'),
    (select count(*)::integer from public.customer_invoice i
      where i.customer_id = p_customer_id and i.deleted_at is null),
    (select count(*)::integer from public.photo ph
      where ph.customer_id = p_customer_id and ph.kind = 'customer_info' and ph.deleted_at is null),
    exists (select 1 from public.payment p
      where p.customer_id = p_customer_id and p.deleted_at is null and p.leader_deposit_id is not null);
end
$$;

revoke all on function public.customer_discard_summary(uuid) from public, anon, authenticated, service_role;
grant execute on function public.customer_discard_summary(uuid) to authenticated;

-- ─── Descartar (R1, R2): todo o nada ──────────────────────────────────────────────────────────────
-- Bloquea el cliente y sus abonos (for update) para que nadie los meta en un Abibono a la vez.
-- Errores (P0001): FORBIDDEN, NOT_FOUND (inexistente, ajeno o ya descartado), CUSTOMER_ARCHIVED,
-- CUSTOMER_DISCARD_BLOCKED.
create function public.discard_new_customer(p_customer_id uuid)
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
  -- Un cliente archivado no se está creando (Archivar no aparece al crear) y no se edita (HU-CLI-02 R6).
  if v_archived is not null then
    raise exception 'CUSTOMER_ARCHIVED: el cliente está archivado' using errcode = 'P0001';
  end if;

  perform 1 from public.payment p
  where p.customer_id = p_customer_id and p.owner_id = v_owner and p.deleted_at is null
  for update;
  -- R1: un abono en un Abibono (borrador o confirmado) bloquea el descarte.
  if exists (
    select 1 from public.payment p
    where p.customer_id = p_customer_id and p.deleted_at is null and p.leader_deposit_id is not null
  ) then
    raise exception 'CUSTOMER_DISCARD_BLOCKED: un abono del cliente ya está en un Abibono' using errcode = 'P0001';
  end if;

  -- R2 / R4: los libros vuelven a físico como un error de captura (wrong_registration); received_at intacto.
  perform set_config('colportor.copy_event', jsonb_build_object('reason', 'wrong_registration')::text, true);
  update public.copy
  set status = 'in_stock', customer_id = null, agreed_price = null, sold_at = null
  where customer_id = p_customer_id and owner_id = v_owner and status = 'sold' and deleted_at is null;
  perform set_config('colportor.copy_event', '', true);

  perform set_config('colportor.customer_discard', 'on', true);
  update public.payment set deleted_at = now()
  where customer_id = p_customer_id and owner_id = v_owner and deleted_at is null;
  perform set_config('colportor.customer_discard', '', true);

  -- Fotos (de información y de factura) y facturas: la verificación diferida de HU-CLI-08 queda cumplida
  -- porque se borran juntas.
  update public.photo set deleted_at = now()
  where customer_id = p_customer_id and owner_id = v_owner and deleted_at is null;
  update public.customer_invoice set deleted_at = now()
  where customer_id = p_customer_id and owner_id = v_owner and deleted_at is null;

  update public.customer set deleted_at = now() where id = p_customer_id;
end
$$;

revoke all on function public.discard_new_customer(uuid) from public, anon, authenticated, service_role;
grant execute on function public.discard_new_customer(uuid) to authenticated;
