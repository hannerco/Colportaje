-- Ronda 38 · Propuesta 12 del lienzo «Abono cobrado: corregir o eliminar el cobro» (25/11/2026).
-- Corregir un cobro (valor, fecha o medio de pago) deja un evento `collect_corrected` en el historial del abono con lo
-- de antes y lo nuevo. Eliminar el cobro usa lo que ya existe: deshacer el cobro (BR-PAY-17) para un abono programado,
-- y borrar (BR-PAY-11) la cuota inicial o un abono extra.
alter type public.payment_event_type add value if not exists 'collect_corrected';

create or replace function public.update_collected_payment(
  p_payment_id uuid, p_paid_amount integer default null, p_paid_at date default null,
  p_method public.pay_method default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_owner uuid := public.require_active_user();
  v_payment record;
begin
  select p.status, p.kind, p.customer_id, p.paid_amount, p.paid_at, p.method into v_payment from public.payment p
  where p.id = p_payment_id and p.owner_id = v_owner and p.deleted_at is null
  for update;
  if not found then
    raise exception 'NOT_FOUND: abono inexistente' using errcode = 'P0001';
  end if;
  if v_payment.status = 'delivered' then
    raise exception 'PAYMENT_LOCKED: el cobro ya se entregó al líder' using errcode = 'P0001';
  end if;
  if v_payment.status <> 'collected' then
    raise exception 'VALIDATION: solo se corrige un abono cobrado' using errcode = 'P0001', detail = 'status';
  end if;
  perform public.assert_collected(p_paid_amount, p_paid_at);

  update public.payment set
    paid_amount = coalesce(p_paid_amount, paid_amount),
    paid_at = coalesce(p_paid_at, paid_at),
    method = coalesce(p_method, method),
    -- BR-PAY-03: la cuota inicial lleva la fecha real como acordada y original.
    due_date = case when kind = 'down_payment' then coalesce(p_paid_at, paid_at) else due_date end,
    original_due_date = case when kind = 'down_payment' then coalesce(p_paid_at, paid_at) else original_due_date end
  where id = p_payment_id;

  -- Ronda 38 (propuesta 12): la corrección queda en el historial del abono, con lo de antes y lo nuevo.
  if coalesce(p_paid_amount, v_payment.paid_amount) is distinct from v_payment.paid_amount
     or coalesce(p_paid_at, v_payment.paid_at) is distinct from v_payment.paid_at
     or coalesce(p_method, v_payment.method) is distinct from v_payment.method then
    insert into public.payment_event (owner_id, payment_id, type, data)
    values (v_owner, p_payment_id, 'collect_corrected', jsonb_build_object(
      'previousAmount', v_payment.paid_amount, 'newAmount', coalesce(p_paid_amount, v_payment.paid_amount),
      'previousPaidAt', v_payment.paid_at, 'newPaidAt', coalesce(p_paid_at, v_payment.paid_at),
      'previousMethod', v_payment.method, 'newMethod', coalesce(p_method, v_payment.method)));
  end if;

  -- R7: corregir un cobro de un archivado se permite; igual mueve su última modificación.
  update public.customer set updated_at = now() where id = v_payment.customer_id;
  return v_payment.customer_id;
end
$$;
