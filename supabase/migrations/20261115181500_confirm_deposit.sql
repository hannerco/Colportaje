-- HU-DIN-05 · Confirmar un Abibono y editar su nota. BR-DEP-02/05/06/07/09/12, BR-PAY-10, BR-PHO-03, AF-40/41/45/92.

-- ─── Diferencia de un Abibono: total entregado − Σ lo cobrado de sus abonos (BR-DEP-05) ───────────
create function public.deposit_difference(p_deposit_id uuid)
returns bigint
language sql
stable
set search_path = ''
as $$
  select d.cash_amount::bigint + d.transfer_amount
         - coalesce((select sum(p.paid_amount) from public.payment p where p.leader_deposit_id = d.id), 0)
  from public.leader_deposit d
  where d.id = p_deposit_id
$$;

revoke all on function public.deposit_difference(uuid) from public, anon, authenticated, service_role;

-- ─── Confirmar (R1–R6) ────────────────────────────────────────────────────────────────────────────
-- p_deposit: lo mismo que save_deposit_draft. En una transacción: guarda el borrador (lo crea si no existía,
-- con las filas de sus stagedReceipts), valida los bloqueos (confirmBlockers de src/domain/deposit.ts), pasa
-- el Abibono a confirmed (el trigger asigna el número la primera vez y registra el evento) y sus abonos a
-- delivered. Cualquier error revierte todo, también el contador de números: la secuencia no deja huecos.
-- Errores (P0001): los de save_deposit_draft y, en este orden de prioridad, TOTAL_ZERO, NOTE_REQUIRED,
-- NO_RECEIPT (detail = todos los bloqueos en JSON).
create function public.confirm_leader_deposit(p_deposit jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_id uuid := public.save_deposit_draft(p_deposit);
  v_deposit record;
  v_blockers text[] := '{}';
begin
  select d.cash_amount, d.transfer_amount, d.note into v_deposit from public.leader_deposit d where d.id = v_id;

  -- BR-DEP-09/06: total > 0, nota si hay diferencia, al menos un recibo activo (R4: sin fila no hay recibo).
  if v_deposit.cash_amount + v_deposit.transfer_amount <= 0 then
    v_blockers := array_append(v_blockers, 'TOTAL_ZERO');
  end if;
  if public.deposit_difference(v_id) <> 0 and v_deposit.note is null then
    v_blockers := array_append(v_blockers, 'NOTE_REQUIRED');
  end if;
  if not exists (
    select 1 from public.photo ph where ph.leader_deposit_id = v_id and ph.deleted_at is null
  ) then
    v_blockers := array_append(v_blockers, 'NO_RECEIPT');
  end if;
  if cardinality(v_blockers) > 0 then
    raise exception '%: el Abibono aún no se puede confirmar', v_blockers[1]
      using errcode = 'P0001', detail = to_jsonb(v_blockers)::text;
  end if;

  update public.leader_deposit set status = 'confirmed', confirmed_at = now() where id = v_id;
  update public.payment set status = 'delivered' where leader_deposit_id = v_id;
  return v_id;
end
$$;

revoke all on function public.confirm_leader_deposit(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.confirm_leader_deposit(jsonb) to authenticated;

-- ─── Editar la nota (borrador o confirmado, BR-DEP-12) ────────────────────────────────────────────
-- Vacía = sin nota; en un confirmado no puede quedar vacía si la diferencia no es 0 (I-27).
-- Errores (P0001): FORBIDDEN, NOT_FOUND, NOTE_REQUIRED.
create function public.update_deposit_note(p_deposit_id uuid, p_note text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_owner uuid := public.require_active_user();
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_status public.deposit_status;
begin
  select d.status into v_status from public.leader_deposit d
  where d.id = p_deposit_id and d.owner_id = v_owner
  for update;
  if not found then
    raise exception 'NOT_FOUND: el Abibono no existe' using errcode = 'P0001';
  end if;
  if v_status = 'confirmed' and v_note is null and public.deposit_difference(p_deposit_id) <> 0 then
    raise exception 'NOTE_REQUIRED: con diferencia, la nota es obligatoria' using errcode = 'P0001';
  end if;
  update public.leader_deposit set note = v_note where id = p_deposit_id;
end
$$;

revoke all on function public.update_deposit_note(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.update_deposit_note(uuid, text) to authenticated;
