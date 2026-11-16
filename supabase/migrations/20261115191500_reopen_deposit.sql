-- HU-DIN-07 · Reabrir un Abibono confirmado. BR-DEP-12, BR-PAY-10, BR-AUD-01, AF-06, AF-44, AF-105.
-- La corrección y la nueva confirmación reutilizan save_deposit_draft y confirm_leader_deposit (HU-DIN-04/05).

-- Errores (P0001): FORBIDDEN, REASON_REQUIRED, NOT_FOUND, DEPOSIT_NOT_CONFIRMED.
create function public.reopen_leader_deposit(p_deposit_id uuid, p_reason text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_owner uuid := public.require_active_user();
  v_reason text := btrim(coalesce(p_reason, ''));
  v_status public.deposit_status;
begin
  -- R1: el motivo debe tener texto.
  if v_reason = '' then
    raise exception 'REASON_REQUIRED: el motivo es obligatorio' using errcode = 'P0001';
  end if;
  select d.status into v_status from public.leader_deposit d
  where d.id = p_deposit_id and d.owner_id = v_owner
  for update;
  if not found then
    raise exception 'NOT_FOUND: el Abibono no existe' using errcode = 'P0001';
  end if;
  -- R3: solo un confirmado (reabrir dos veces seguidas también cae aquí).
  if v_status <> 'confirmed' then
    raise exception 'DEPOSIT_NOT_CONFIRMED: el Abibono no está confirmado' using errcode = 'P0001';
  end if;

  -- R2 / R5: a borrador conservando su número (el trigger no lo toca) y con el evento del motivo; los abonos
  -- vuelven a cobrados, siguen vinculados y cada uno deja su payment_event reopened (trigger de HU-ABO-01).
  perform set_config('colportor.deposit_event', jsonb_build_object('reason', v_reason)::text, true);
  perform set_config('colportor.payment_event',
                     jsonb_build_object('reason', v_reason, 'depositId', p_deposit_id)::text, true);
  update public.leader_deposit set status = 'draft', confirmed_at = null where id = p_deposit_id;
  update public.payment set status = 'collected' where leader_deposit_id = p_deposit_id and status = 'delivered';
  perform set_config('colportor.deposit_event', '', true);
  perform set_config('colportor.payment_event', '', true);
end
$$;

revoke all on function public.reopen_leader_deposit(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.reopen_leader_deposit(uuid, text) to authenticated;
