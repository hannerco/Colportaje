-- HU-INV-07 · Marcar con novedad, resolver y deshacer. BR-COPY-10/11, ADR-0028, ADR-0043, AF-52.
-- Escribir novedades es de estas funciones; el usuario solo LEE copy y copy_issue (HU-INV-01).

-- ─── copy_write_events: deshacer un borrado también toma el tipo del contexto ─────────────────────
-- Igual a la versión de HU-INV-02 salvo esa rama: deshacer "Eliminar" de una novedad registra
-- undo_resolved (no undo_deleted); sin contexto sigue siendo undo_deleted (HU-INV-08).
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

-- ─── Marcar con novedad (R1, R2) ──────────────────────────────────────────────────────────────────
-- Errores (P0001): FORBIDDEN, VALIDATION (note), NOT_FOUND, COPY_NOT_IN_STOCK (también si ya tiene novedad).
create function public.flag_copy(p_copy_id uuid, p_note text)
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
    raise exception 'VALIDATION: la nota es obligatoria' using errcode = 'P0001', detail = 'note';
  end if;
  select cp.status into v_status from public.copy cp
  where cp.id = p_copy_id and cp.owner_id = v_owner and cp.deleted_at is null
  for update;
  if not found then
    raise exception 'NOT_FOUND: ejemplar inexistente' using errcode = 'P0001';
  end if;
  if v_status <> 'in_stock' then
    raise exception 'COPY_NOT_IN_STOCK: solo un ejemplar en físico se marca con novedad' using errcode = 'P0001';
  end if;

  insert into public.copy_issue (id, owner_id, copy_id, note) values (gen_random_uuid(), v_owner, p_copy_id, v_note);
  perform set_config('colportor.copy_event', jsonb_build_object('note', v_note)::text, true);
  update public.copy set status = 'flagged' where id = p_copy_id;
  perform set_config('colportor.copy_event', '', true);
end
$$;

revoke all on function public.flag_copy(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.flag_copy(uuid, text) to authenticated;

-- ─── Resolver (R3) ────────────────────────────────────────────────────────────────────────────────
-- p_resolution: found (Apareció → in_stock), lost (Perdido → lost), removed (Eliminar → borrado lógico).
-- p_note opcional (vacía = sin nota). El evento es `resolved` con la resolución, también al eliminar.
-- Errores (P0001): FORBIDDEN, VALIDATION (resolution), NOT_FOUND, COPY_NOT_FLAGGED.
create function public.resolve_copy_issue(p_copy_id uuid, p_resolution text, p_note text default null)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_owner uuid := public.require_active_user();
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_status public.copy_status;
  v_issue uuid;
  v_ctx jsonb;
begin
  if p_resolution is null or p_resolution not in ('found', 'lost', 'removed') then
    raise exception 'VALIDATION: resolución inválida' using errcode = 'P0001', detail = 'resolution';
  end if;
  select cp.status into v_status from public.copy cp
  where cp.id = p_copy_id and cp.owner_id = v_owner and cp.deleted_at is null
  for update;
  if not found then
    raise exception 'NOT_FOUND: ejemplar inexistente' using errcode = 'P0001';
  end if;
  select i.id into v_issue from public.copy_issue i where i.copy_id = p_copy_id and i.resolved_at is null;
  if v_status <> 'flagged' or v_issue is null then
    raise exception 'COPY_NOT_FLAGGED: el ejemplar no tiene una novedad abierta' using errcode = 'P0001';
  end if;

  update public.copy_issue
  set resolution = p_resolution::public.issue_resolution, resolution_note = v_note, resolved_at = now()
  where id = v_issue;

  v_ctx := jsonb_build_object('type', 'resolved', 'resolution', p_resolution);
  if v_note is not null then
    v_ctx := v_ctx || jsonb_build_object('note', v_note);
  end if;
  perform set_config('colportor.copy_event', v_ctx::text, true);
  if p_resolution = 'found' then
    update public.copy set status = 'in_stock' where id = p_copy_id;
  elsif p_resolution = 'lost' then
    update public.copy set status = 'lost' where id = p_copy_id;
  else
    update public.copy set deleted_at = now() where id = p_copy_id;
  end if;
  perform set_config('colportor.copy_event', '', true);
end
$$;

revoke all on function public.resolve_copy_issue(uuid, text, text) from public, anon, authenticated, service_role;
grant execute on function public.resolve_copy_issue(uuid, text, text) to authenticated;

-- ─── Deshacer una resolución (R4) ─────────────────────────────────────────────────────────────────
-- Solo si el cambio de estado más reciente del ejemplar es esa resolución y sigue vigente: found y sigue
-- en físico, lost y sigue perdido, removed y sigue borrado. Vuelve a flagged y reabre la MISMA novedad.
-- Los tipos de evento de estado son los mismos que STATE_EVENTS en src/domain/copy-detail.ts.
-- Errores (P0001): FORBIDDEN, NOT_FOUND, UNDO_NOT_AVAILABLE.
create function public.undo_resolve_copy_issue(p_copy_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_owner uuid := public.require_active_user();
  v_copy record;
  v_last record;
  v_issue record;
begin
  select cp.status, cp.deleted_at into v_copy from public.copy cp
  where cp.id = p_copy_id and cp.owner_id = v_owner
  for update;
  if not found then
    raise exception 'NOT_FOUND: ejemplar inexistente' using errcode = 'P0001';
  end if;

  select e.type, e.data into v_last from public.copy_event e
  where e.copy_id = p_copy_id and e.type in (
    'sold', 'returned', 'flagged', 'resolved', 'undo_resolved', 'deleted', 'undo_deleted', 'minibook_sold',
    'returned_to_leader', 'undo_returned_to_leader'
  )
  order by e.seq desc limit 1;
  select i.id, i.resolution into v_issue from public.copy_issue i
  where i.copy_id = p_copy_id and i.resolved_at is not null
  order by i.resolved_at desc limit 1;

  if v_last.type is distinct from 'resolved'
     or v_issue.id is null
     or (v_last.data ->> 'resolution') is distinct from v_issue.resolution::text
     or not (
       (v_issue.resolution = 'found' and v_copy.status = 'in_stock' and v_copy.deleted_at is null)
       or (v_issue.resolution = 'lost' and v_copy.status = 'lost' and v_copy.deleted_at is null)
       or (v_issue.resolution = 'removed' and v_copy.deleted_at is not null)
     ) then
    raise exception 'UNDO_NOT_AVAILABLE: la resolución ya no se puede deshacer' using errcode = 'P0001';
  end if;

  update public.copy_issue set resolution = null, resolution_note = null, resolved_at = null where id = v_issue.id;
  perform set_config('colportor.copy_event', jsonb_build_object('type', 'undo_resolved')::text, true);
  if v_issue.resolution = 'removed' then
    update public.copy set deleted_at = null where id = p_copy_id; -- sigue flagged (no cambió al eliminar)
  else
    update public.copy set status = 'flagged' where id = p_copy_id;
  end if;
  perform set_config('colportor.copy_event', '', true);
end
$$;

revoke all on function public.undo_resolve_copy_issue(uuid) from public, anon, authenticated, service_role;
grant execute on function public.undo_resolve_copy_issue(uuid) to authenticated;
