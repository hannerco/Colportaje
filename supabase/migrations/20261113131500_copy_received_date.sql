-- HU-INV-05 · Fecha de recibido de un ejemplar. BR-COPY-04, BR-AUD-01, AF-50.
-- La base valida la fecha en TODA escritura del ejemplar (no solo en esta acción) y la función
-- update_copy_received_date es la forma de cambiarla desde la app. El evento received_date_changed lo
-- escribe el trigger copy_write_events (HU-INV-01) con la fecha anterior y la nueva (R2).

-- R1: recibido no es futuro (Bogotá) ni posterior al día de la venta (Bogotá).
-- La MISMA regla que validateReceivedDate (src/domain/copy-detail.ts).
create function public.copy_guard_received_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.received_at = old.received_at and new.sold_at is not distinct from old.sold_at then
    return new;
  end if;
  if new.received_at > public.today_bogota()
     and (tg_op = 'INSERT' or new.received_at <> old.received_at) then
    raise exception 'DATE_IN_FUTURE: la fecha de recibido no puede ser futura' using errcode = 'P0001';
  end if;
  if new.sold_at is not null and new.received_at > (new.sold_at at time zone 'America/Bogota')::date then
    raise exception 'DATE_AFTER_SALE: la fecha de recibido no puede ser posterior a la venta' using errcode = 'P0001';
  end if;
  return new;
end
$$;

create trigger copy_guard_received_at before insert or update on public.copy
  for each row execute function public.copy_guard_received_at();

-- Cambiar la fecha de recibido (HU-INV-05). Solo cambia esa fecha: nada del cliente (R4).
-- Errores (P0001, prefijo = código): FORBIDDEN, NOT_FOUND, DATE_IN_FUTURE, DATE_AFTER_SALE.
create function public.update_copy_received_date(p_copy_id uuid, p_date date)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
begin
  if v_owner is null or not public.is_active_user() then
    raise exception 'FORBIDDEN: sin sesión o usuario inactivo' using errcode = 'P0001';
  end if;
  if p_date is null then
    raise exception 'VALIDATION: falta la fecha' using errcode = 'P0001';
  end if;
  update public.copy set received_at = p_date
  where id = p_copy_id and owner_id = v_owner and deleted_at is null;
  if not found then
    raise exception 'NOT_FOUND: ejemplar inexistente' using errcode = 'P0001';
  end if;
end
$$;

revoke all on function public.update_copy_received_date(uuid, date) from public, anon, authenticated, service_role;
grant execute on function public.update_copy_received_date(uuid, date) to authenticated;
