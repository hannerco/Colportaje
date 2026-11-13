-- HU-ABO-04 · Programar, editar, corregir y cancelar abonos programados. BR-PAY-06/11/15/16, ADR-0045/0047.
-- Borrar un programado usa delete_payment (HU-ABO-02). Todas mueven la última modificación del cliente (R5).

-- Valida valor (> 0) y fecha acordada (no anterior a hoy, BR-PAY-16). El campo va en el detail.
create function public.assert_scheduled(p_agreed_amount integer, p_due_date date)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if p_agreed_amount is not null and p_agreed_amount <= 0 then
    raise exception 'VALIDATION: el valor debe ser mayor que 0' using errcode = 'P0001', detail = 'agreedAmount';
  end if;
  if p_due_date is not null and p_due_date < public.today_bogota() then
    raise exception 'VALIDATION: la fecha no puede ser anterior a hoy' using errcode = 'P0001', detail = 'dueDate';
  end if;
end
$$;

revoke all on function public.assert_scheduled(integer, date) from public, anon, authenticated, service_role;

-- El abono programado vigente del usuario, bloqueado; si no está por cobrar → PAYMENT_NOT_SCHEDULED.
-- Si su cliente está archivado → CUSTOMER_ARCHIVED. Devuelve el cliente.
create function public.lock_scheduled_payment(p_owner uuid, p_payment_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_payment record;
begin
  select p.status, p.customer_id, c.archived_at into v_payment
  from public.payment p
  join public.customer c on c.id = p.customer_id
  where p.id = p_payment_id and p.owner_id = p_owner and p.deleted_at is null
  for update of p;
  if not found then
    raise exception 'NOT_FOUND: abono inexistente' using errcode = 'P0001';
  end if;
  if v_payment.status <> 'scheduled' then
    raise exception 'PAYMENT_NOT_SCHEDULED: el abono no está por cobrar' using errcode = 'P0001';
  end if;
  if v_payment.archived_at is not null then
    raise exception 'CUSTOMER_ARCHIVED: el cliente está archivado' using errcode = 'P0001';
  end if;
  return v_payment.customer_id;
end
$$;

revoke all on function public.lock_scheduled_payment(uuid, uuid) from public, anon, authenticated, service_role;

-- ─── Programar un abono suelto (siempre se puede, aunque no haya libro) ────────────────────────────
-- Idempotente por p_payment_id. Errores (P0001): FORBIDDEN, NOT_FOUND, CUSTOMER_ARCHIVED, VALIDATION, CONFLICT.
create function public.schedule_single_payment(
  p_payment_id uuid, p_customer_id uuid, p_agreed_amount integer, p_due_date date
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
  v_existing uuid;
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
  if p_agreed_amount is null then
    raise exception 'VALIDATION: falta el valor' using errcode = 'P0001', detail = 'agreedAmount';
  end if;
  if p_due_date is null then
    raise exception 'VALIDATION: falta la fecha' using errcode = 'P0001', detail = 'dueDate';
  end if;
  perform public.assert_scheduled(p_agreed_amount, p_due_date);

  select p.customer_id into v_existing from public.payment p where p.id = p_payment_id;
  if found then
    if v_existing = p_customer_id then
      return; -- reintento
    end if;
    raise exception 'CONFLICT: el id del abono ya existe' using errcode = 'P0001';
  end if;

  -- R1: fecha acordada = fecha original.
  insert into public.payment (id, owner_id, customer_id, kind, status, agreed_amount, due_date, original_due_date)
  values (p_payment_id, v_owner, p_customer_id, 'scheduled', 'scheduled', p_agreed_amount, p_due_date, p_due_date);
  update public.customer set updated_at = now() where id = p_customer_id;
end
$$;

revoke all on function public.schedule_single_payment(uuid, uuid, integer, date) from public, anon, authenticated, service_role;
grant execute on function public.schedule_single_payment(uuid, uuid, integer, date) to authenticated;

-- ─── Editar el valor de un programado (cualquier entero > 0) ───────────────────────────────────────
-- Bajarlo deja payment_event amount_reduced (HU-ABO-01) con el disparador form_edit.
-- Errores (P0001): FORBIDDEN, NOT_FOUND, PAYMENT_NOT_SCHEDULED, CUSTOMER_ARCHIVED, VALIDATION. Devuelve el cliente.
create function public.update_scheduled_amount(p_payment_id uuid, p_agreed_amount integer)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_owner uuid := public.require_active_user();
  v_customer uuid := public.lock_scheduled_payment(v_owner, p_payment_id);
begin
  if p_agreed_amount is null then
    raise exception 'VALIDATION: falta el valor' using errcode = 'P0001', detail = 'agreedAmount';
  end if;
  perform public.assert_scheduled(p_agreed_amount, null);
  perform set_config('colportor.payment_event', '{"trigger":"form_edit"}', true);
  update public.payment set agreed_amount = p_agreed_amount where id = p_payment_id;
  perform set_config('colportor.payment_event', '', true);
  update public.customer set updated_at = now() where id = v_customer;
  return v_customer;
end
$$;

revoke all on function public.update_scheduled_amount(uuid, integer) from public, anon, authenticated, service_role;
grant execute on function public.update_scheduled_amount(uuid, integer) to authenticated;

-- ─── Corregir la fecha (solo durante la creación del cliente; el front decide) ─────────────────────
-- R3: mueve la fecha acordada y la original de ESE abono, sin prórroga (marca colportor.payment_correction).
-- Errores (P0001): FORBIDDEN, NOT_FOUND, PAYMENT_NOT_SCHEDULED, CUSTOMER_ARCHIVED, VALIDATION.
create function public.correct_scheduled_date(p_payment_id uuid, p_due_date date)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_owner uuid := public.require_active_user();
  v_customer uuid := public.lock_scheduled_payment(v_owner, p_payment_id);
begin
  if p_due_date is null then
    raise exception 'VALIDATION: falta la fecha' using errcode = 'P0001', detail = 'dueDate';
  end if;
  perform public.assert_scheduled(null, p_due_date);
  perform set_config('colportor.payment_correction', 'on', true);
  update public.payment set due_date = p_due_date, original_due_date = p_due_date where id = p_payment_id;
  perform set_config('colportor.payment_correction', '', true);
  update public.customer set updated_at = now() where id = v_customer;
  return v_customer;
end
$$;

revoke all on function public.correct_scheduled_date(uuid, date) from public, anon, authenticated, service_role;
grant execute on function public.correct_scheduled_date(uuid, date) to authenticated;

-- ─── Cancelar programados (motivo manual; quedan en Cancelados) ────────────────────────────────────
-- Todo o nada; todos del mismo cliente. Los ya cancelados se ignoran (reintento).
-- Errores (P0001): FORBIDDEN, VALIDATION, NOT_FOUND, PAYMENT_NOT_SCHEDULED. Devuelve el cliente.
create function public.cancel_scheduled_payments(p_payment_ids uuid[])
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_owner uuid := public.require_active_user();
  v_customers uuid[];
  v_found integer;
begin
  if p_payment_ids is null or cardinality(p_payment_ids) = 0 then
    raise exception 'VALIDATION: no hay abonos para cancelar' using errcode = 'P0001', detail = 'paymentIds';
  end if;

  perform 1 from public.payment p
  where p.id = any(p_payment_ids) and p.owner_id = v_owner and p.deleted_at is null
  for update;
  select count(*), array_agg(distinct p.customer_id) into v_found, v_customers from public.payment p
  where p.id = any(p_payment_ids) and p.owner_id = v_owner and p.deleted_at is null;
  if v_found <> (select count(distinct x) from unnest(p_payment_ids) x) then
    raise exception 'NOT_FOUND: algún abono no existe' using errcode = 'P0001';
  end if;
  if cardinality(v_customers) <> 1 then
    raise exception 'VALIDATION: los abonos deben ser de un mismo cliente' using errcode = 'P0001', detail = 'paymentIds';
  end if;
  if exists (
    select 1 from public.payment p
    where p.id = any(p_payment_ids) and p.status not in ('scheduled', 'canceled')
  ) then
    raise exception 'PAYMENT_NOT_SCHEDULED: algún abono no está por cobrar' using errcode = 'P0001';
  end if;

  -- R4: cancelado con fecha y motivo manual; el trigger deja payment_event canceled.
  update public.payment set status = 'canceled', canceled_at = now(), cancel_reason = 'manual'
  where id = any(p_payment_ids) and status = 'scheduled';
  update public.customer set updated_at = now() where id = v_customers[1];
  return v_customers[1];
end
$$;

revoke all on function public.cancel_scheduled_payments(uuid[]) from public, anon, authenticated, service_role;
grant execute on function public.cancel_scheduled_payments(uuid[]) to authenticated;
