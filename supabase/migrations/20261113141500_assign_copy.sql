-- HU-CLI-09 · Agregar y quitar libros en la ficha. BR-COPY-06/08/09, BR-CUS-16, ADR-0044, AF-114.
-- El usuario solo LEE copy; vender y devolver pasan por estas funciones, en una transacción con la
-- "última modificación" del cliente. Los eventos sold / returned los escribe copy_write_events (HU-INV-01).

-- Asignar (vender) un ejemplar en físico a un cliente: precio acordado = su precio público copiado (R2).
-- Errores (P0001, prefijo = código): FORBIDDEN, NOT_FOUND, CUSTOMER_ARCHIVED, COPY_IS_MINIBOOK, COPY_NOT_IN_STOCK.
-- Reintentar con el mismo ejemplar y cliente no hace nada nuevo (idempotente).
create function public.assign_copy_to_customer(p_copy_id uuid, p_customer_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
  v_archived timestamptz;
  v_copy record;
begin
  if v_owner is null or not public.is_active_user() then
    raise exception 'FORBIDDEN: sin sesión o usuario inactivo' using errcode = 'P0001';
  end if;

  select c.archived_at into v_archived
  from public.customer c
  where c.id = p_customer_id and c.owner_id = v_owner and c.deleted_at is null
  for update;
  if not found then
    raise exception 'NOT_FOUND: cliente inexistente' using errcode = 'P0001';
  end if;
  -- R3: primero se restaura.
  if v_archived is not null then
    raise exception 'CUSTOMER_ARCHIVED: el cliente está archivado' using errcode = 'P0001';
  end if;

  -- R6: el ejemplar queda bloqueado; quien llegue después lo encuentra ya vendido.
  select cp.status, cp.customer_id, t.category into v_copy
  from public.copy cp
  join public.title t on t.id = cp.title_id
  where cp.id = p_copy_id and cp.owner_id = v_owner and cp.deleted_at is null
  for update of cp;
  if not found then
    raise exception 'NOT_FOUND: ejemplar inexistente' using errcode = 'P0001';
  end if;
  if v_copy.category = 'minibook' then
    raise exception 'COPY_IS_MINIBOOK: los minibooks no se agregan a un cliente' using errcode = 'P0001';
  end if;
  if v_copy.status = 'sold' and v_copy.customer_id = p_customer_id then
    return; -- reintento: ya quedó asignado a este cliente
  end if;
  if v_copy.status <> 'in_stock' then
    raise exception 'COPY_NOT_IN_STOCK: el ejemplar ya no está en físico' using errcode = 'P0001';
  end if;

  update public.copy
  set status = 'sold', customer_id = p_customer_id, sold_at = now(), agreed_price = public_price_snapshot
  where id = p_copy_id;
  -- BR-CUS-16: libros agregados mueven la última modificación.
  update public.customer set updated_at = now() where id = p_customer_id;
end
$$;

revoke all on function public.assign_copy_to_customer(uuid, uuid) from public, anon, authenticated, service_role;
grant execute on function public.assign_copy_to_customer(uuid, uuid) to authenticated;

-- Quitar un libro de un cliente: vuelve a físico sin cliente, precio ni fecha de venta; received_at intacto (R4).
-- p_reason: 'wrong_registration' (quitar durante la creación, AF-114, HU-CLI-09) o 'customer_returned'
-- (devolución, HU-CLI-10). Devuelve el cliente al que pertenecía.
-- Errores (P0001): FORBIDDEN, VALIDATION, NOT_FOUND, COPY_NOT_SOLD.
create function public.return_copy_from_customer(p_copy_id uuid, p_reason text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
  v_copy record;
begin
  if v_owner is null or not public.is_active_user() then
    raise exception 'FORBIDDEN: sin sesión o usuario inactivo' using errcode = 'P0001';
  end if;
  if p_reason is null or p_reason not in ('wrong_registration', 'customer_returned') then
    raise exception 'VALIDATION: motivo inválido' using errcode = 'P0001';
  end if;

  select cp.status, cp.customer_id into v_copy
  from public.copy cp
  where cp.id = p_copy_id and cp.owner_id = v_owner and cp.deleted_at is null
  for update;
  if not found then
    raise exception 'NOT_FOUND: ejemplar inexistente' using errcode = 'P0001';
  end if;
  if v_copy.status <> 'sold' or v_copy.customer_id is null then
    raise exception 'COPY_NOT_SOLD: el ejemplar no está vendido a un cliente' using errcode = 'P0001';
  end if;

  perform set_config('colportor.copy_event', jsonb_build_object('reason', p_reason)::text, true);
  update public.copy
  set status = 'in_stock', customer_id = null, agreed_price = null, sold_at = null
  where id = p_copy_id;
  perform set_config('colportor.copy_event', '', true);
  -- BR-CUS-16: libros quitados mueven la última modificación.
  update public.customer set updated_at = now() where id = v_copy.customer_id;
  return v_copy.customer_id;
end
$$;

revoke all on function public.return_copy_from_customer(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.return_copy_from_customer(uuid, text) to authenticated;
