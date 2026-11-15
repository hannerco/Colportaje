-- HU-INV-08 · Eliminar un ejemplar y deshacer. BR-COPY-17, BR-COPY-11, BR-GEN-02, AF-51, ADR-0043.
-- Borrado lógico: no cuenta en nada y su número no se reutiliza (el contador de copy_counter no retrocede).
-- La nota obligatoria es configuración de la app (copyDelete.noteRequired, BR-GEN-15): la valida el dominio.

-- ─── Eliminar (R1–R3) ─────────────────────────────────────────────────────────────────────────────
-- En físico → deleted_at y evento `deleted` (estado anterior y nota). Con novedad → se resuelve como
-- `removed` con resolve_copy_issue (HU-INV-07). Vendido, perdido o devuelto al líder → COPY_NOT_DELETABLE.
-- Errores (P0001): FORBIDDEN, NOT_FOUND (también si ya está eliminado), COPY_NOT_DELETABLE.
create function public.delete_copy(p_copy_id uuid, p_note text default null)
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
begin
  select cp.status into v_status from public.copy cp
  where cp.id = p_copy_id and cp.owner_id = v_owner and cp.deleted_at is null
  for update;
  if not found then
    raise exception 'NOT_FOUND: ejemplar inexistente' using errcode = 'P0001';
  end if;

  if v_status = 'flagged' then
    perform public.resolve_copy_issue(p_copy_id, 'removed', v_note);
  elsif v_status = 'in_stock' then
    perform set_config('colportor.copy_event',
      case when v_note is null then '{}' else jsonb_build_object('note', v_note)::text end, true);
    update public.copy set deleted_at = now() where id = p_copy_id;
    perform set_config('colportor.copy_event', '', true);
  else
    raise exception 'COPY_NOT_DELETABLE: un ejemplar % no se elimina', v_status using errcode = 'P0001';
  end if;
end
$$;

revoke all on function public.delete_copy(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.delete_copy(uuid, text) to authenticated;

-- ─── Deshacer (R5, R6) ────────────────────────────────────────────────────────────────────────────
-- Solo si el último cambio de estado del ejemplar es la eliminación: `deleted` → vuelve a físico
-- (evento undo_deleted); `resolved` con `removed` → undo_resolve_copy_issue (vuelve a flagged con la misma
-- novedad, evento undo_resolved). El tiempo del aviso lo controla el front (undo.toastSeconds).
-- Errores (P0001): FORBIDDEN, NOT_FOUND, UNDO_NOT_AVAILABLE.
create function public.undo_delete_copy(p_copy_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_owner uuid := public.require_active_user();
  v_deleted timestamptz;
  v_last record;
begin
  select cp.deleted_at into v_deleted from public.copy cp
  where cp.id = p_copy_id and cp.owner_id = v_owner
  for update;
  if not found then
    raise exception 'NOT_FOUND: ejemplar inexistente' using errcode = 'P0001';
  end if;

  -- Los tipos de evento de estado son los de STATE_EVENT_TYPES (src/domain/copy-issue.ts).
  select e.type, e.data into v_last from public.copy_event e
  where e.copy_id = p_copy_id and e.type in (
    'sold', 'returned', 'flagged', 'resolved', 'undo_resolved', 'deleted', 'undo_deleted', 'minibook_sold',
    'returned_to_leader', 'undo_returned_to_leader'
  )
  order by e.seq desc limit 1;

  if v_deleted is not null and v_last.type = 'resolved' and v_last.data ->> 'resolution' = 'removed' then
    perform public.undo_resolve_copy_issue(p_copy_id);
  elsif v_deleted is not null and v_last.type = 'deleted' then
    update public.copy set deleted_at = null where id = p_copy_id; -- el estado no cambió al eliminar
  else
    raise exception 'UNDO_NOT_AVAILABLE: la eliminación ya no se puede deshacer' using errcode = 'P0001';
  end if;
end
$$;

revoke all on function public.undo_delete_copy(uuid) from public, anon, authenticated, service_role;
grant execute on function public.undo_delete_copy(uuid) to authenticated;
