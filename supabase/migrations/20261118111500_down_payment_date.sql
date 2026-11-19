-- HU-ABO-09 · Fecha de la cuota inicial en la ficha nueva. BR-GEN-16, BR-PAY-03/05, ADR-0049.
-- Reemplaza set_creation_down_payment de HU-ABO-02 (cuatro parámetros) por una con p_paid_on: la cuota inicial
-- puede llevar la fecha en que se recibió (no futura) y al actualizarla cambia también la fecha. Lo demás no cambia:
-- una sola cuota inicial por cliente, 0 la borra, idempotente por id y bloqueada si ya se entregó.
-- La fecha acordada y la original siguen a la fecha real (BR-PAY-03); payment_guard ya permite mover las tres
-- juntas en una cuota inicial (HU-ABO-02 R4).

drop function public.set_creation_down_payment(uuid, uuid, integer, public.pay_method);

-- p_amount 0 o null la borra (si existe); > 0 la crea con fecha p_paid_on (hoy si no viene) o actualiza su valor,
-- su método y, si viene p_paid_on, su fecha.
-- Errores (P0001): FORBIDDEN, NOT_FOUND, CUSTOMER_ARCHIVED, VALIDATION (paidAmount, paidOn), PAYMENT_LOCKED.
create function public.set_creation_down_payment(
  p_payment_id uuid, p_customer_id uuid, p_amount integer, p_method public.pay_method default 'transfer',
  p_paid_on date default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_owner uuid := public.require_active_user();
  v_archived timestamptz;
  v_current record;
  v_paid_on date := coalesce(p_paid_on, public.today_bogota());
begin
  select c.archived_at into v_archived from public.customer c
  where c.id = p_customer_id and c.owner_id = v_owner and c.deleted_at is null
  for update;
  if not found then
    raise exception 'NOT_FOUND: cliente inexistente' using errcode = 'P0001';
  end if;
  if v_archived is not null then
    raise exception 'CUSTOMER_ARCHIVED: el cliente está archivado' using errcode = 'P0001';
  end if;
  perform public.assert_collected(nullif(p_amount, 0), null);
  -- R3: la fecha de la cuota inicial no es futura (Bogotá). El campo de la ficha es paidOn.
  if p_paid_on is not null and p_paid_on > public.today_bogota() then
    raise exception 'VALIDATION: la fecha de la cuota inicial no puede ser futura' using errcode = 'P0001',
      detail = 'paidOn';
  end if;

  -- La cuota vigente: la de este id o, si no, la más antigua del cliente (en la ficha nueva hay una sola).
  select p.id, p.status into v_current from public.payment p
  where p.customer_id = p_customer_id and p.owner_id = v_owner and p.kind = 'down_payment' and p.deleted_at is null
  order by (p.id = p_payment_id) desc, p.created_at, p.id
  limit 1
  for update;

  if found and v_current.status = 'delivered' then
    raise exception 'PAYMENT_LOCKED: el cobro ya se entregó al líder' using errcode = 'P0001';
  end if;

  if coalesce(p_amount, 0) = 0 then
    if found then
      update public.payment set deleted_at = now(), leader_deposit_id = null where id = v_current.id;
    end if;
  elsif found then
    -- R2: valor, método y, si viene, la fecha (las tres fechas juntas, BR-PAY-03); sin fecha conserva la suya.
    update public.payment
    set paid_amount = p_amount,
        method = coalesce(p_method, 'transfer'),
        paid_at = coalesce(p_paid_on, paid_at),
        due_date = coalesce(p_paid_on, due_date),
        original_due_date = coalesce(p_paid_on, original_due_date)
    where id = v_current.id;
  else
    -- R1: nace cobrada con la fecha elegida.
    insert into public.payment (id, owner_id, customer_id, kind, status, paid_amount, paid_at, method,
                                due_date, original_due_date)
    values (p_payment_id, v_owner, p_customer_id, 'down_payment', 'collected', p_amount, v_paid_on,
            coalesce(p_method, 'transfer'), v_paid_on, v_paid_on);
  end if;

  update public.customer set updated_at = now() where id = p_customer_id;
end
$$;

revoke all on function public.set_creation_down_payment(uuid, uuid, integer, public.pay_method, date)
  from public, anon, authenticated, service_role;
grant execute on function public.set_creation_down_payment(uuid, uuid, integer, public.pay_method, date)
  to authenticated;
