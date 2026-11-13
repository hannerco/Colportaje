-- HU-ABO-02 · Cuota inicial, abono extra y corrección de cobros. BR-PAY-01/03/04/10/11, BR-CUS-16, AF-115.
-- El usuario solo LEE payment: estas funciones crean, corrigen y borran cobros, en una transacción con la
-- "última modificación" del cliente (R5). Los bloqueos de lo entregado (PAYMENT_LOCKED) vienen de HU-DIN-01.

-- ─── payment_guard: la cuota inicial puede corregir su fecha real ─────────────────────────────────
-- Igual a la versión de HU-ABO-01 salvo R4: en una cuota inicial, la fecha acordada y la original son
-- SIEMPRE la fecha real (BR-PAY-03, check payment_down_payment_dates); corregir la fecha real las mueve.
create or replace function public.payment_guard() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  today date := public.today_bogota();
  correcting boolean := coalesce(current_setting('colportor.payment_correction', true), '') = 'on';
begin
  -- R6: la fecha real no es futura.
  if new.paid_at is not null and new.paid_at > today
     and (tg_op = 'INSERT' or new.paid_at is distinct from old.paid_at) then
    raise exception 'PAID_AT_IN_FUTURE: la fecha real no puede ser futura' using errcode = 'P0001';
  end if;

  if tg_op = 'INSERT' then
    if new.kind = 'scheduled' and new.status = 'scheduled' then
      if new.due_date < today then
        raise exception 'DUE_DATE_IN_PAST: la fecha acordada no puede ser anterior a hoy' using errcode = 'P0001';
      end if;
      if new.original_due_date is distinct from new.due_date then
        raise exception 'INVALID_ORIGINAL_DUE_DATE: un abono programado nace con fecha original = acordada'
          using errcode = 'P0001';
      end if;
    end if;
    return new;
  end if;

  if new.owner_id <> old.owner_id or new.kind <> old.kind or new.created_at <> old.created_at then
    raise exception 'INVALID_TRANSITION: dueño, tipo y creación no cambian' using errcode = 'P0001';
  end if;

  if old.deleted_at is not null then
    raise exception 'INVALID_TRANSITION: un abono borrado no se edita' using errcode = 'P0001';
  end if;

  if new.deleted_at is not null and old.status not in ('scheduled', 'collected') then
    raise exception 'INVALID_TRANSITION: un abono % no se borra', old.status using errcode = 'P0001';
  end if;

  if new.status <> old.status and (old.status, new.status) not in (
    ('scheduled', 'collected'), ('scheduled', 'canceled'), ('collected', 'delivered'), ('delivered', 'collected')
  ) then
    raise exception 'INVALID_TRANSITION: % → %', old.status, new.status using errcode = 'P0001';
  end if;

  -- R4: la fecha original no cambia, salvo la corrección durante la creación (que mueve ambas) o la
  -- corrección de la fecha real de una cuota inicial (que mueve las tres).
  if new.original_due_date is distinct from old.original_due_date then
    if new.kind = 'down_payment' and new.original_due_date = new.paid_at then
      null;
    elsif not correcting or old.status <> 'scheduled' or new.original_due_date is distinct from new.due_date then
      raise exception 'ORIGINAL_DUE_DATE_LOCKED: la fecha original no cambia' using errcode = 'P0001';
    end if;
  end if;

  if new.status = 'scheduled' and new.due_date is distinct from old.due_date and new.due_date < today then
    raise exception 'DUE_DATE_IN_PAST: la fecha acordada no puede ser anterior a hoy' using errcode = 'P0001';
  end if;
  return new;
end
$$;

-- ─── Ayudas comunes ───────────────────────────────────────────────────────────────────────────────
-- Valida un cobro: valor entero > 0 y fecha real no futura. El campo va en el detail (VALIDATION).
create function public.assert_collected(p_paid_amount integer, p_paid_at date)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if p_paid_amount is not null and p_paid_amount <= 0 then
    raise exception 'VALIDATION: el valor real debe ser mayor que 0' using errcode = 'P0001', detail = 'paidAmount';
  end if;
  if p_paid_at is not null and p_paid_at > public.today_bogota() then
    raise exception 'VALIDATION: la fecha real no puede ser futura' using errcode = 'P0001', detail = 'paidAt';
  end if;
end
$$;

revoke all on function public.assert_collected(integer, date) from public, anon, authenticated, service_role;

-- Sesión activa o FORBIDDEN; devuelve el usuario.
create function public.require_active_user()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'FORBIDDEN: sin sesión o usuario inactivo' using errcode = 'P0001';
  end if;
  return auth.uid();
end
$$;

revoke all on function public.require_active_user() from public, anon, authenticated, service_role;

-- ─── Cuota inicial de la ficha nueva (una sola: crear, actualizar o borrar) ────────────────────────
-- p_amount 0 o null la borra (si existe); > 0 la crea con fecha de hoy o actualiza su valor y método.
-- Errores (P0001): FORBIDDEN, NOT_FOUND, CUSTOMER_ARCHIVED, VALIDATION, PAYMENT_LOCKED.
create function public.set_creation_down_payment(
  p_payment_id uuid, p_customer_id uuid, p_amount integer, p_method public.pay_method default 'transfer'
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
    update public.payment set paid_amount = p_amount, method = coalesce(p_method, 'transfer') where id = v_current.id;
  else
    insert into public.payment (id, owner_id, customer_id, kind, status, paid_amount, paid_at, method,
                                due_date, original_due_date)
    values (p_payment_id, v_owner, p_customer_id, 'down_payment', 'collected', p_amount, public.today_bogota(),
            coalesce(p_method, 'transfer'), public.today_bogota(), public.today_bogota());
  end if;

  update public.customer set updated_at = now() where id = p_customer_id;
end
$$;

revoke all on function public.set_creation_down_payment(uuid, uuid, integer, public.pay_method)
  from public, anon, authenticated, service_role;
grant execute on function public.set_creation_down_payment(uuid, uuid, integer, public.pay_method) to authenticated;

-- ─── Registrar un cobro en un cliente guardado (otra cuota inicial o abono extra) ─────────────────
-- Idempotente por p_payment_id. Errores (P0001): FORBIDDEN, NOT_FOUND, CUSTOMER_ARCHIVED, VALIDATION, CONFLICT.
create function public.register_collected_payment(
  p_payment_id uuid, p_customer_id uuid, p_kind public.payment_kind, p_paid_amount integer,
  p_paid_at date default null, p_method public.pay_method default 'transfer'
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_owner uuid := public.require_active_user();
  v_paid_at date := coalesce(p_paid_at, public.today_bogota());
  v_archived timestamptz;
  v_existing uuid;
begin
  select c.archived_at into v_archived from public.customer c
  where c.id = p_customer_id and c.owner_id = v_owner and c.deleted_at is null
  for update;
  if not found then
    raise exception 'NOT_FOUND: cliente inexistente' using errcode = 'P0001';
  end if;
  -- R7: un cobro nuevo en un archivado no; primero se restaura.
  if v_archived is not null then
    raise exception 'CUSTOMER_ARCHIVED: el cliente está archivado' using errcode = 'P0001';
  end if;
  if p_kind is null or p_kind not in ('down_payment', 'extra') then
    raise exception 'VALIDATION: tipo de cobro inválido' using errcode = 'P0001', detail = 'kind';
  end if;
  if p_paid_amount is null then
    raise exception 'VALIDATION: falta el valor' using errcode = 'P0001', detail = 'paidAmount';
  end if;
  perform public.assert_collected(p_paid_amount, v_paid_at);

  -- Reintento con el mismo id: no crea otro.
  select p.customer_id into v_existing from public.payment p where p.id = p_payment_id;
  if found then
    if v_existing = p_customer_id then
      return;
    end if;
    raise exception 'CONFLICT: el id del abono ya existe' using errcode = 'P0001';
  end if;

  insert into public.payment (id, owner_id, customer_id, kind, status, paid_amount, paid_at, method,
                              due_date, original_due_date)
  values (p_payment_id, v_owner, p_customer_id, p_kind, 'collected', p_paid_amount, v_paid_at,
          coalesce(p_method, 'transfer'),
          case when p_kind = 'down_payment' then v_paid_at end,
          case when p_kind = 'down_payment' then v_paid_at end);

  update public.customer set updated_at = now() where id = p_customer_id;
end
$$;

revoke all on function public.register_collected_payment(uuid, uuid, public.payment_kind, integer, date, public.pay_method)
  from public, anon, authenticated, service_role;
grant execute on function public.register_collected_payment(uuid, uuid, public.payment_kind, integer, date, public.pay_method)
  to authenticated;

-- ─── Corregir un cobro (valor, fecha real o método); nulo = no cambia ──────────────────────────────
-- Un cobro en un Abibono borrador se corrige y el borrador no cambia sus montos (R4); uno entregado no (R3).
-- Errores (P0001): FORBIDDEN, NOT_FOUND, PAYMENT_LOCKED, VALIDATION. Devuelve el cliente.
create function public.update_collected_payment(
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
  select p.status, p.kind, p.customer_id into v_payment from public.payment p
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

  -- R7: corregir un cobro de un archivado se permite; igual mueve su última modificación.
  update public.customer set updated_at = now() where id = v_payment.customer_id;
  return v_payment.customer_id;
end
$$;

revoke all on function public.update_collected_payment(uuid, integer, date, public.pay_method)
  from public, anon, authenticated, service_role;
grant execute on function public.update_collected_payment(uuid, integer, date, public.pay_method) to authenticated;

-- ─── Borrar (lógico) un abono por cobrar o cobrado ─────────────────────────────────────────────────
-- Lo quita de su Abibono borrador (BR-PAY-11). Un reintento sobre uno ya borrado no hace nada.
-- Errores (P0001): FORBIDDEN, NOT_FOUND, PAYMENT_LOCKED, INVALID_TRANSITION (cancelado).
-- Devuelve el cliente y el estado que tenía (el front elige el disparador de abonos que no cuadran).
create function public.delete_payment(p_payment_id uuid)
returns table (customer_id uuid, previous_status public.payment_status)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_owner uuid := public.require_active_user();
  v_payment record;
begin
  select p.status, p.customer_id, p.deleted_at into v_payment from public.payment p
  where p.id = p_payment_id and p.owner_id = v_owner
  for update;
  if not found then
    raise exception 'NOT_FOUND: abono inexistente' using errcode = 'P0001';
  end if;
  if v_payment.deleted_at is null then
    if v_payment.status = 'delivered' then
      raise exception 'PAYMENT_LOCKED: el cobro ya se entregó al líder' using errcode = 'P0001';
    end if;
    if v_payment.status not in ('scheduled', 'collected') then
      raise exception 'INVALID_TRANSITION: un abono % no se borra', v_payment.status using errcode = 'P0001';
    end if;
    update public.payment set deleted_at = now(), leader_deposit_id = null where id = p_payment_id;
    update public.customer c set updated_at = now() where c.id = v_payment.customer_id;
  end if;
  return query select v_payment.customer_id, v_payment.status;
end
$$;

revoke all on function public.delete_payment(uuid) from public, anon, authenticated, service_role;
grant execute on function public.delete_payment(uuid) to authenticated;
