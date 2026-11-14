-- HU-ABO-06 · Cobrar un abono programado. BR-PAY-04/05/07/13, BR-CUS-16, AF-21/22/23.
-- Pasa el abono de `scheduled` a `collected` con lo realmente pagado, la fecha real y el método; el valor y la
-- fecha acordados se conservan (R1). Un pago parcial NO crea otro abono (R2, BR-PAY-07): el front calcula el
-- faltante con lo que devuelve esta función. Sin Abibono, el cobro cuenta "por entregar" (R5).
-- Errores (P0001): FORBIDDEN, NOT_FOUND, PAYMENT_NOT_SCHEDULED (también si ya está cobrado, CA-5),
--                  CUSTOMER_ARCHIVED, VALIDATION (detail = paidAmount | paidAt).
create function public.collect_payment(
  p_payment_id uuid, p_paid_amount integer default null, p_paid_at date default null,
  p_method public.pay_method default 'transfer'
)
returns table (customer_id uuid, agreed_amount integer, paid_amount integer)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_owner uuid := public.require_active_user();
  v_customer uuid := public.lock_scheduled_payment(v_owner, p_payment_id);
  v_agreed integer;
  v_paid integer;
begin
  select p.agreed_amount into v_agreed from public.payment p where p.id = p_payment_id;
  -- Por defecto: el valor acordado, la fecha de hoy y Transferencia (BR-PAY-04/05).
  v_paid := coalesce(p_paid_amount, v_agreed);
  perform public.assert_collected(v_paid, coalesce(p_paid_at, public.today_bogota()));

  update public.payment set
    status = 'collected',
    paid_amount = v_paid,
    paid_at = coalesce(p_paid_at, public.today_bogota()),
    method = coalesce(p_method, 'transfer')
  where id = p_payment_id;

  -- R4 (BR-CUS-16): cobrar es un cambio hecho en la ficha del cliente.
  update public.customer c set updated_at = now() where c.id = v_customer;
  return query select v_customer, v_agreed, v_paid;
end
$$;

revoke all on function public.collect_payment(uuid, integer, date, public.pay_method)
  from public, anon, authenticated, service_role;
grant execute on function public.collect_payment(uuid, integer, date, public.pay_method) to authenticated;
