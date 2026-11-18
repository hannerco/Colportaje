-- HU-CLI-13 · Fecha de venta del libro editable. BR-GEN-16, BR-COPY-06, BR-CUS-04/16, ADR-0049, I-32.
-- Amplía HU-CLI-09 sin editarla: la venta puede tener fecha pasada (no futura ni anterior al recibido) y se puede
-- cambiar después, con su evento en el historial.

-- ─── Tipo de evento nuevo ─────────────────────────────────────────────────────────────────────────
-- Se usa solo dentro de cuerpos de funciones (que se evalúan al llamarlas), así que puede ir en la misma migración.
alter type public.copy_event_type add value 'sold_at_changed';

-- ─── I-32: el instante que se guarda para un día de venta ────────────────────────────────────────
-- Hoy: el instante actual. Otro día: las 12:00 de ese día en Bogotá (el mediodía evita saltos de día por zona).
-- La MISMA regla que soldAtInstant (src/domain/copy-detail.ts).
create function public.sold_instant(p_day date) returns timestamptz
language sql
stable
set search_path = ''
as $$
  select case
    when p_day = public.today_bogota() then now()
    else (p_day + time '12:00') at time zone 'America/Bogota'
  end
$$;

revoke all on function public.sold_instant(date) from public, anon, authenticated, service_role;

-- ─── R2: la base valida ambas fechas en TODA escritura del ejemplar ──────────────────────────────
-- Reemplaza la versión de HU-INV-05 (copy_guard_received_at). Igual que antes para el recibido; además:
-- · SOLD_IN_FUTURE: la venta no es un día futuro (Bogotá).
-- · SOLD_BEFORE_RECEIVED: si lo que cambió es la venta, no puede quedar antes del día de recibido. Si lo que
--   cambió es el recibido, el error sigue siendo DATE_AFTER_SALE (R5: compara con la venta guardada).
-- La MISMA regla que validateSoldAt y validateReceivedDate (src/domain/copy-detail.ts).
create or replace function public.copy_guard_received_at() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_sold_day date := (new.sold_at at time zone 'America/Bogota')::date;
  v_received_changed boolean := tg_op = 'INSERT' or new.received_at <> old.received_at;
  v_sold_changed boolean := tg_op = 'INSERT' or new.sold_at is distinct from old.sold_at;
begin
  if not v_received_changed and not v_sold_changed then
    return new;
  end if;
  if v_received_changed and new.received_at > public.today_bogota() then
    raise exception 'DATE_IN_FUTURE: la fecha de recibido no puede ser futura' using errcode = 'P0001';
  end if;
  if new.sold_at is not null and v_sold_changed and v_sold_day > public.today_bogota() then
    raise exception 'SOLD_IN_FUTURE: la fecha de venta no puede ser futura' using errcode = 'P0001';
  end if;
  if new.sold_at is not null and new.received_at > v_sold_day then
    if v_sold_changed and not v_received_changed then
      raise exception 'SOLD_BEFORE_RECEIVED: la venta no puede ser anterior al recibido' using errcode = 'P0001';
    end if;
    raise exception 'DATE_AFTER_SALE: la fecha de recibido no puede ser posterior a la venta' using errcode = 'P0001';
  end if;
  return new;
end
$$;

-- ─── Historial: sold_at_changed (R3) ─────────────────────────────────────────────────────────────
-- Igual a la versión de HU-INV-07 más la rama de la fecha de venta de un ejemplar que sigue vendido.
create or replace function public.copy_write_events() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ctx jsonb := coalesce(nullif(current_setting('colportor.copy_event', true), '')::jsonb, '{}'::jsonb);
  ctx_note text := ctx ->> 'note';
  ctx_data jsonb := ctx - 'type' - 'note';
  state_type public.copy_event_type;
begin
  if tg_op = 'INSERT' then
    insert into public.copy_event (owner_id, copy_id, type, note, data)
    values (new.owner_id, new.id, 'received', ctx_note,
            ctx_data || jsonb_build_object('receivedAt', new.received_at));
    return new;
  end if;

  -- Eliminar / deshacer eliminar.
  if old.deleted_at is null and new.deleted_at is not null then
    insert into public.copy_event (owner_id, copy_id, type, note, data)
    values (new.owner_id, new.id, coalesce((ctx ->> 'type')::public.copy_event_type, 'deleted'), ctx_note,
            ctx_data || jsonb_build_object('previousStatus', old.status));
  elsif old.deleted_at is not null and new.deleted_at is null then
    insert into public.copy_event (owner_id, copy_id, type, note, data)
    values (new.owner_id, new.id, coalesce((ctx ->> 'type')::public.copy_event_type, 'undo_deleted'), ctx_note,
            ctx_data || jsonb_build_object('status', new.status));
  end if;

  -- Cambio de estado.
  if new.status <> old.status then
    state_type := coalesce(
      (ctx ->> 'type')::public.copy_event_type,
      case
        when old.status = 'in_stock' and new.status = 'sold' then 'sold'
        when old.status = 'sold' and new.status = 'in_stock' then 'returned'
        when old.status = 'in_stock' and new.status = 'flagged' then 'flagged'
        when old.status = 'flagged' and new.status in ('in_stock', 'lost') then 'resolved'
        when old.status = 'lost' and new.status = 'flagged' then 'undo_resolved'
        when old.status = 'in_stock' and new.status = 'returned_to_leader' then 'returned_to_leader'
        when old.status = 'returned_to_leader' and new.status = 'in_stock' then 'undo_returned_to_leader'
      end::public.copy_event_type
    );
    insert into public.copy_event (owner_id, copy_id, type, note, data)
    values (
      new.owner_id, new.id, state_type, ctx_note,
      ctx_data
        || case when new.status = 'sold'
             then jsonb_build_object('customerId', new.customer_id, 'agreedPrice', new.agreed_price)
             else '{}'::jsonb end
        || case when old.status = 'flagged' and new.status = 'in_stock' and not ctx ? 'resolution'
             then jsonb_build_object('resolution', 'found')
             when old.status = 'flagged' and new.status = 'lost' and not ctx ? 'resolution'
             then jsonb_build_object('resolution', 'lost')
             else '{}'::jsonb end
    );
  else
    if new.status = 'sold' and new.agreed_price is distinct from old.agreed_price then
      -- Precio acordado de un ejemplar ya vendido (BR-COPY-07).
      insert into public.copy_event (owner_id, copy_id, type, note, data)
      values (new.owner_id, new.id, 'price_changed', ctx_note,
              jsonb_build_object('oldPrice', old.agreed_price, 'newPrice', new.agreed_price));
    end if;
    -- Fecha de venta de un ejemplar que sigue vendido (HU-CLI-13 R3), por día de Bogotá.
    if new.status = 'sold' and old.sold_at is not null and new.sold_at is not null
       and (new.sold_at at time zone 'America/Bogota')::date <> (old.sold_at at time zone 'America/Bogota')::date then
      insert into public.copy_event (owner_id, copy_id, type, note, data)
      values (new.owner_id, new.id, 'sold_at_changed', ctx_note,
              jsonb_build_object(
                'customerId', new.customer_id,
                'oldDate', (old.sold_at at time zone 'America/Bogota')::date,
                'newDate', (new.sold_at at time zone 'America/Bogota')::date));
    end if;
  end if;

  -- Fecha de recibido (BR-COPY-04).
  if new.received_at <> old.received_at then
    insert into public.copy_event (owner_id, copy_id, type, note, data)
    values (new.owner_id, new.id, 'received_date_changed', ctx_note,
            jsonb_build_object('oldDate', old.received_at, 'newDate', new.received_at));
  end if;
  return new;
end
$$;

-- ─── R1: asignar con fecha de venta ──────────────────────────────────────────────────────────────
-- Reemplaza la versión de dos parámetros de HU-CLI-09 (mismo comportamiento; sin p_sold_on, hoy).
-- Errores (P0001): FORBIDDEN, NOT_FOUND, CUSTOMER_ARCHIVED, COPY_IS_MINIBOOK, COPY_NOT_IN_STOCK,
-- SOLD_IN_FUTURE, SOLD_BEFORE_RECEIVED (los dos últimos, del trigger).
drop function public.assign_copy_to_customer(uuid, uuid);

create function public.assign_copy_to_customer(p_copy_id uuid, p_customer_id uuid, p_sold_on date default null)
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
  if v_archived is not null then
    raise exception 'CUSTOMER_ARCHIVED: el cliente está archivado' using errcode = 'P0001';
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
    raise exception 'COPY_IS_MINIBOOK: los minibooks no se agregan a un cliente' using errcode = 'P0001';
  end if;
  if v_copy.status = 'sold' and v_copy.customer_id = p_customer_id then
    return; -- reintento: ya quedó asignado a este cliente
  end if;
  if v_copy.status <> 'in_stock' then
    raise exception 'COPY_NOT_IN_STOCK: el ejemplar ya no está en físico' using errcode = 'P0001';
  end if;

  update public.copy
  set status = 'sold',
      customer_id = p_customer_id,
      sold_at = public.sold_instant(coalesce(p_sold_on, public.today_bogota())),
      agreed_price = public_price_snapshot
  where id = p_copy_id;
  update public.customer set updated_at = now() where id = p_customer_id;
end
$$;

revoke all on function public.assign_copy_to_customer(uuid, uuid, date) from public, anon, authenticated, service_role;
grant execute on function public.assign_copy_to_customer(uuid, uuid, date) to authenticated;

-- ─── Cambiar la fecha de venta (R3, R4) ──────────────────────────────────────────────────────────
-- Solo cambia sold_at y la última modificación del cliente: ni precio, ni estado, ni abonos. Devuelve el cliente.
-- El mismo día que ya tenía no cambia nada (ni evento). Errores (P0001): FORBIDDEN, VALIDATION, NOT_FOUND,
-- COPY_IS_MINIBOOK, COPY_NOT_SOLD, SOLD_IN_FUTURE, SOLD_BEFORE_RECEIVED.
create function public.update_sold_at(p_copy_id uuid, p_sold_on date)
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
  if p_sold_on is null then
    raise exception 'VALIDATION: falta la fecha de venta' using errcode = 'P0001';
  end if;

  select cp.status, cp.customer_id, cp.sold_at, t.category into v_copy
  from public.copy cp
  join public.title t on t.id = cp.title_id
  where cp.id = p_copy_id and cp.owner_id = v_owner and cp.deleted_at is null
  for update of cp;
  if not found then
    raise exception 'NOT_FOUND: ejemplar inexistente' using errcode = 'P0001';
  end if;
  if v_copy.category = 'minibook' then
    raise exception 'COPY_IS_MINIBOOK: los minibooks tienen su propia fecha' using errcode = 'P0001';
  end if;
  if v_copy.status <> 'sold' or v_copy.customer_id is null or v_copy.sold_at is null then
    raise exception 'COPY_NOT_SOLD: el ejemplar no está vendido a un cliente' using errcode = 'P0001';
  end if;
  if (v_copy.sold_at at time zone 'America/Bogota')::date = p_sold_on then
    return v_copy.customer_id;
  end if;

  update public.copy set sold_at = public.sold_instant(p_sold_on) where id = p_copy_id;
  -- BR-CUS-16: cambiar la fecha de venta mueve la última modificación del cliente.
  update public.customer set updated_at = now() where id = v_copy.customer_id;
  return v_copy.customer_id;
end
$$;

revoke all on function public.update_sold_at(uuid, date) from public, anon, authenticated, service_role;
grant execute on function public.update_sold_at(uuid, date) to authenticated;
