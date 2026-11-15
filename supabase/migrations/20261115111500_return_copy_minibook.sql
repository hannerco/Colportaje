-- HU-CLI-10 · Devolver un libro de un cliente guardado. BR-COPY-09, ADR-0025, AF-01..AF-12.
-- return_copy_from_customer (HU-CLI-09) ya devuelve con los dos motivos; aquí se agrega que un minibook no se
-- devuelve por este camino (COPY_IS_MINIBOOK): sus ventas y canjes son del módulo Minibooks.
-- Igual a la versión de HU-CLI-09 salvo esa comprobación (después de NOT_FOUND y antes de COPY_NOT_SOLD).
-- Errores (P0001): FORBIDDEN, VALIDATION, NOT_FOUND, COPY_IS_MINIBOOK, COPY_NOT_SOLD.
create or replace function public.return_copy_from_customer(p_copy_id uuid, p_reason text)
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

  select cp.status, cp.customer_id, t.category into v_copy
  from public.copy cp
  join public.title t on t.id = cp.title_id
  where cp.id = p_copy_id and cp.owner_id = v_owner and cp.deleted_at is null
  for update of cp;
  if not found then
    raise exception 'NOT_FOUND: ejemplar inexistente' using errcode = 'P0001';
  end if;
  if v_copy.category = 'minibook' then
    raise exception 'COPY_IS_MINIBOOK: los minibooks no se devuelven por aquí' using errcode = 'P0001';
  end if;
  if v_copy.status <> 'sold' or v_copy.customer_id is null then
    raise exception 'COPY_NOT_SOLD: el ejemplar no está vendido a un cliente' using errcode = 'P0001';
  end if;

  -- R2: en físico, sin cliente, precio acordado ni fecha de venta; received_at intacto; evento con el motivo.
  -- R3: abonos y Abibonos no se tocan.
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
