-- HU-INV-09 · Devolver al líder y deshacer. BR-COPY-16, ADR-0043, AF-54, OQ-30.
-- Libros por unidad (copyIds) y minibooks por cantidad (los de recibido más antiguo). Todo o nada (R2).

-- Buscar si un opId ya se aplicó (R6): los eventos de esa operación llevan el opId.
create index copy_event_return_op_idx on public.copy_event (owner_id, (data ->> 'opId'))
  where type = 'returned_to_leader';

-- ─── Devolver en lote ─────────────────────────────────────────────────────────────────────────────
-- p_minibook_lines: [{"titleId": uuid, "quantity": n ≥ 1}, …] de títulos minibook.
-- Devuelve los ids devueltos. Reintentar con el mismo p_op_id devuelve los mismos ids sin tocar nada.
-- Errores (P0001): FORBIDDEN, NOTE_REQUIRED, SELECTION_EMPTY, VALIDATION (minibookLines),
-- COPY_NOT_IN_STOCK (detail = ids en JSON), NOT_ENOUGH_STOCK (detail = titleId).
create function public.return_copies_to_leader(
  p_op_id uuid,
  p_copy_ids uuid[],
  p_minibook_lines jsonb,
  p_note text
)
returns uuid[]
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_owner uuid := public.require_active_user();
  v_note text := btrim(coalesce(p_note, ''));
  v_books uuid[] := coalesce((select array_agg(distinct x) from unnest(p_copy_ids) x), '{}');
  v_lines jsonb := coalesce(p_minibook_lines, '[]'::jsonb);
  v_line jsonb;
  v_title uuid;
  v_quantity integer;
  v_picked uuid[];
  v_all uuid[];
  v_bad uuid[];
  v_done uuid[];
begin
  if p_op_id is null then
    raise exception 'VALIDATION: falta el id de la operación' using errcode = 'P0001', detail = 'opId';
  end if;
  -- R6: dos llamadas con el mismo opId no corren a la vez, y la segunda devuelve lo de la primera.
  perform pg_advisory_xact_lock(hashtextextended(v_owner::text || p_op_id::text, 0));
  select array_agg(e.copy_id order by e.copy_id) into v_done from public.copy_event e
  where e.owner_id = v_owner and e.type = 'returned_to_leader' and e.data ->> 'opId' = p_op_id::text;
  if v_done is not null then
    return v_done;
  end if;

  if v_note = '' then
    raise exception 'NOTE_REQUIRED: la nota es obligatoria' using errcode = 'P0001';
  end if;
  if jsonb_typeof(v_lines) <> 'array' then
    raise exception 'VALIDATION: líneas de minibooks inválidas' using errcode = 'P0001', detail = 'minibookLines';
  end if;
  if cardinality(v_books) = 0 and jsonb_array_length(v_lines) = 0 then
    raise exception 'SELECTION_EMPTY: no hay ejemplares para devolver' using errcode = 'P0001';
  end if;

  -- Libros por unidad: todos deben ser del usuario, no eliminados y estar en físico.
  perform 1 from public.copy cp where cp.id = any(v_books) and cp.owner_id = v_owner for update;
  select array_agg(x order by x) into v_bad from unnest(v_books) x
  where not exists (
    select 1 from public.copy cp
    where cp.id = x and cp.owner_id = v_owner and cp.deleted_at is null and cp.status = 'in_stock'
  );
  if v_bad is not null then
    raise exception 'COPY_NOT_IN_STOCK: algún ejemplar ya no está en físico'
      using errcode = 'P0001', detail = to_jsonb(v_bad)::text;
  end if;
  v_all := v_books;

  -- Minibooks por cantidad (R3): los de recibido más antiguo; desempate por número y luego por id.
  for v_line in select * from jsonb_array_elements(v_lines) loop
    begin
      v_title := (v_line ->> 'titleId')::uuid;
      v_quantity := (v_line ->> 'quantity')::integer;
    exception when others then
      raise exception 'VALIDATION: línea de minibooks inválida' using errcode = 'P0001', detail = 'minibookLines';
    end;
    if v_title is null or v_quantity is null or v_quantity < 1 or not exists (
      select 1 from public.title t where t.id = v_title and t.category = 'minibook'
    ) then
      raise exception 'VALIDATION: línea de minibooks inválida' using errcode = 'P0001', detail = 'minibookLines';
    end if;
    select array_agg(id) into v_picked from (
      select cp.id from public.copy cp
      where cp.owner_id = v_owner and cp.title_id = v_title and cp.status = 'in_stock' and cp.deleted_at is null
        and not (cp.id = any(v_all))
      order by cp.received_at, cp.number, cp.id
      limit v_quantity
      for update
    ) picked;
    if coalesce(cardinality(v_picked), 0) < v_quantity then
      raise exception 'NOT_ENOUGH_STOCK: no hay suficientes en físico' using errcode = 'P0001', detail = v_title::text;
    end if;
    v_all := v_all || v_picked;
  end loop;

  -- R4: cada uno pasa a returned_to_leader con la nota y el opId en su evento.
  perform set_config('colportor.copy_event', jsonb_build_object('note', v_note, 'opId', p_op_id)::text, true);
  update public.copy set status = 'returned_to_leader' where id = any(v_all);
  perform set_config('colportor.copy_event', '', true);
  return (select array_agg(x order by x) from unnest(v_all) x);
end
$$;

revoke all on function public.return_copies_to_leader(uuid, uuid[], jsonb, text)
  from public, anon, authenticated, service_role;
grant execute on function public.return_copies_to_leader(uuid, uuid[], jsonb, text) to authenticated;

-- ─── Deshacer por ejemplar (R5) ───────────────────────────────────────────────────────────────────
-- Errores (P0001): FORBIDDEN, NOTE_REQUIRED, NOT_FOUND, UNDO_NOT_AVAILABLE.
create function public.undo_return_to_leader(p_copy_id uuid, p_note text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_owner uuid := public.require_active_user();
  v_note text := btrim(coalesce(p_note, ''));
  v_status public.copy_status;
begin
  if v_note = '' then
    raise exception 'NOTE_REQUIRED: la nota es obligatoria' using errcode = 'P0001';
  end if;
  select cp.status into v_status from public.copy cp
  where cp.id = p_copy_id and cp.owner_id = v_owner and cp.deleted_at is null
  for update;
  if not found then
    raise exception 'NOT_FOUND: ejemplar inexistente' using errcode = 'P0001';
  end if;
  if v_status <> 'returned_to_leader' then
    raise exception 'UNDO_NOT_AVAILABLE: el ejemplar no está devuelto al líder' using errcode = 'P0001';
  end if;
  perform set_config('colportor.copy_event', jsonb_build_object('note', v_note)::text, true);
  update public.copy set status = 'in_stock' where id = p_copy_id;
  perform set_config('colportor.copy_event', '', true);
end
$$;

revoke all on function public.undo_return_to_leader(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.undo_return_to_leader(uuid, text) to authenticated;
