-- HU-INV-06 · Precio acordado de un ejemplar vendido. BR-COPY-07, BR-PRC-01..03, BR-PAY-13, BR-CUS-16.
-- El evento price_changed lo escribe el trigger copy_write_events (HU-INV-01) cuando el precio cambia.

-- p_price: el precio nuevo (entero ≥ 0, mayor o menor que el público, R2); null = restaurar al precio
-- público copiado del ejemplar ("Restaurar"). Devuelve el cliente y los precios anterior y nuevo, para que
-- la app decida si hay que revisar los abonos (solo si bajó, R4).
-- Errores (P0001): FORBIDDEN, VALIDATION (price), NOT_FOUND, COPY_IS_MINIBOOK, COPY_NOT_SOLD.
create function public.update_agreed_price(p_copy_id uuid, p_price integer default null)
returns table (customer_id uuid, previous_price integer, agreed_price integer)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_owner uuid := public.require_active_user();
  v_copy record;
  v_price integer;
begin
  if p_price is not null and p_price < 0 then
    raise exception 'VALIDATION: el precio debe ser un entero mayor o igual a 0' using errcode = 'P0001', detail = 'price';
  end if;

  select cp.status, cp.customer_id, cp.agreed_price, cp.public_price_snapshot, t.category into v_copy
  from public.copy cp
  join public.title t on t.id = cp.title_id
  where cp.id = p_copy_id and cp.owner_id = v_owner and cp.deleted_at is null
  for update of cp;
  if not found then
    raise exception 'NOT_FOUND: ejemplar inexistente' using errcode = 'P0001';
  end if;
  -- R1: solo vendido y no minibook.
  if v_copy.category = 'minibook' then
    raise exception 'COPY_IS_MINIBOOK: el precio de un minibook no se edita aquí' using errcode = 'P0001';
  end if;
  if v_copy.status <> 'sold' or v_copy.customer_id is null then
    raise exception 'COPY_NOT_SOLD: el ejemplar no está vendido a un cliente' using errcode = 'P0001';
  end if;

  v_price := coalesce(p_price, v_copy.public_price_snapshot);
  -- R5: el mismo precio no cambia nada (ni evento ni última modificación).
  if v_price is distinct from v_copy.agreed_price then
    update public.copy set agreed_price = v_price where id = p_copy_id;
    -- R3 (BR-CUS-16): mueve la última modificación del cliente.
    update public.customer c set updated_at = now() where c.id = v_copy.customer_id;
  end if;
  return query select v_copy.customer_id, v_copy.agreed_price, v_price;
end
$$;

revoke all on function public.update_agreed_price(uuid, integer) from public, anon, authenticated, service_role;
grant execute on function public.update_agreed_price(uuid, integer) to authenticated;
