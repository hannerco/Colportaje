-- HU-INV-02 · Agregar ejemplares al inventario por lote. BR-COPY-02/03/04/05, BR-MBK-01, ADR-0043.
-- Una sola función transaccional crea todo el lote o nada (R2). Es la única forma de crear ejemplares
-- desde la app: el usuario solo LEE la tabla copy (HU-INV-01).

-- ─── El evento "received" guarda también el contexto de quien crea (p. ej. el batchId del lote) ─────
-- Igual a la versión de HU-INV-01 salvo la rama INSERT, que ahora suma ctx_data.
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
    values (new.owner_id, new.id, 'undo_deleted', ctx_note, ctx_data || jsonb_build_object('status', new.status));
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
  elsif new.status = 'sold' and new.agreed_price is distinct from old.agreed_price then
    -- Precio acordado de un ejemplar ya vendido (BR-COPY-07).
    insert into public.copy_event (owner_id, copy_id, type, note, data)
    values (new.owner_id, new.id, 'price_changed', ctx_note,
            jsonb_build_object('oldPrice', old.agreed_price, 'newPrice', new.agreed_price));
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

-- ─── add_copies ───────────────────────────────────────────────────────────────────────────────────
-- p_lines: [{"titleId": uuid, "copyIds": [uuid, …]}, …]. Los copyIds los genera el cliente (BR-GEN-04).
-- Devuelve los ejemplares creados en el orden de las líneas. Errores (P0001, prefijo = código):
--   FORBIDDEN, VALIDATION, BATCH_EMPTY, DATE_IN_FUTURE, TITLE_INACTIVE (detail = ids en JSON), CONFLICT.
create function public.add_copies(p_batch_id uuid, p_received_at date, p_lines jsonb)
returns table (copy_id uuid, title_id uuid, number integer)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_owner uuid := auth.uid();
  v_uuid constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  v_copy_ids uuid[];
  v_title_ids uuid[];
  v_existing integer;
  v_inactive uuid[];
begin
  if v_owner is null or not public.is_active_user() then
    raise exception 'FORBIDDEN: sin sesión o usuario inactivo' using errcode = 'P0001';
  end if;

  if p_batch_id is null or p_received_at is null or jsonb_typeof(p_lines) is distinct from 'array'
     or exists (
       select 1 from jsonb_array_elements(p_lines) l(line)
       where jsonb_typeof(l.line) <> 'object'
          or jsonb_typeof(l.line -> 'titleId') is distinct from 'string'
          or not (l.line ->> 'titleId') ~* v_uuid
          or jsonb_typeof(l.line -> 'copyIds') is distinct from 'array'
          or exists (
            select 1 from jsonb_array_elements(l.line -> 'copyIds') c(id)
            where jsonb_typeof(c.id) <> 'string' or not (c.id #>> '{}') ~* v_uuid
          )
     ) then
    raise exception 'VALIDATION: lote mal formado' using errcode = 'P0001';
  end if;

  -- Un elemento por ejemplar, en el orden de las líneas: así se numeran.
  select coalesce(array_agg((c.id #>> '{}')::uuid order by l.ord, c.ord), '{}'),
         coalesce(array_agg((l.line ->> 'titleId')::uuid order by l.ord, c.ord), '{}')
    into v_copy_ids, v_title_ids
  from jsonb_array_elements(p_lines) with ordinality l(line, ord)
  cross join lateral jsonb_array_elements(l.line -> 'copyIds') with ordinality c(id, ord);

  if cardinality(v_copy_ids) = 0 then
    raise exception 'BATCH_EMPTY: el lote no tiene ejemplares' using errcode = 'P0001';
  end if;

  -- R4 / BR-COPY-04: la fecha del lote no es futura (Bogotá).
  if p_received_at > public.today_bogota() then
    raise exception 'DATE_IN_FUTURE: la fecha de recibido no puede ser futura' using errcode = 'P0001';
  end if;

  if (select count(distinct x) from unnest(v_copy_ids) x) <> cardinality(v_copy_ids) then
    raise exception 'VALIDATION: copyIds repetidos' using errcode = 'P0001';
  end if;

  -- R6: reintento con los mismos copyIds → devuelve los ya creados, sin duplicar.
  select count(*) into v_existing from public.copy c where c.id = any(v_copy_ids);
  if v_existing > 0 then
    if v_existing = cardinality(v_copy_ids) and not exists (
      select 1
      from unnest(v_copy_ids, v_title_ids) u(id, title)
      join public.copy c on c.id = u.id
      where c.owner_id <> v_owner or c.title_id <> u.title
    ) then
      return query
        select c.id, c.title_id, c.number
        from unnest(v_copy_ids) with ordinality u(id, ord)
        join public.copy c on c.id = u.id
        order by u.ord;
      return;
    end if;
    raise exception 'CONFLICT: algunos copyIds ya existen con otros datos' using errcode = 'P0001';
  end if;

  -- R5: los títulos se bloquean (nadie los desactiva a mitad) y deben seguir activos.
  perform 1 from public.title t where t.id = any(v_title_ids) for share;
  select coalesce(array_agg(distinct u.title order by u.title), '{}') into v_inactive
  from unnest(v_title_ids) u(title)
  left join public.title t on t.id = u.title
  where t.id is null or not t.is_active;
  if cardinality(v_inactive) > 0 then
    raise exception 'TITLE_INACTIVE: hay títulos que ya no están activos' using errcode = 'P0001',
      detail = to_jsonb(v_inactive)::text;
  end if;

  -- R2/R3: todo en esta transacción. El número lo asigna copy_assign_number; el evento "received",
  -- copy_write_events (con el batchId del lote). Precios: los vigentes del título (BR-COPY-03).
  perform set_config('colportor.copy_event', jsonb_build_object('batchId', p_batch_id)::text, true);
  begin
    insert into public.copy (id, owner_id, title_id, number, status, public_price_snapshot,
                             colportor_price_snapshot, received_at)
    select u.id, v_owner, t.id, 0, 'in_stock', t.public_price, t.colportor_price, p_received_at
    from unnest(v_copy_ids, v_title_ids) with ordinality u(id, title, ord)
    join public.title t on t.id = u.title
    order by u.ord;
  exception when unique_violation then
    -- Otro envío con los mismos copyIds terminó primero: el cliente reintenta y recibe lo creado.
    raise exception 'CONFLICT: el lote se está creando en otra petición' using errcode = 'P0001';
  end;
  perform set_config('colportor.copy_event', '', true);

  return query
    select c.id, c.title_id, c.number
    from unnest(v_copy_ids) with ordinality u(id, ord)
    join public.copy c on c.id = u.id
    order by u.ord;
end
$$;

revoke all on function public.add_copies(uuid, date, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.add_copies(uuid, date, jsonb) to authenticated;
