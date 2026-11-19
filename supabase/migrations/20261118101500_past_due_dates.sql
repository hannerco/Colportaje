-- HU-ABO-08 · Abonos programados con fecha pasada. BR-GEN-16, BR-PAY-06/08/15/16, ADR-0049.
-- Reemplaza (copiadas de su última versión, sin otro cambio) las validaciones «la fecha acordada no puede ser
-- anterior a hoy»: el trigger payment_guard (HU-ABO-01 R5, versión de HU-CLI-03), assert_scheduled (lo usan
-- schedule_single_payment y correct_scheduled_date, HU-ABO-04), apply_payment_plan (HU-ABO-03) y
-- reschedule_payment (HU-ABO-05). Un abono con fecha pasada nace por cobrar y ya cuenta como vencido (derivado,
-- BR-PAY-08). Lo demás no cambia: la fecha real de un cobro sigue sin poder ser futura, la prórroga sigue siendo
-- posterior a la actual y pide confirmar más allá de 2 meses desde hoy. El aviso «Esta fecha ya pasó» es del front.

-- ─── payment_guard (R3) ───────────────────────────────────────────────────────────────────────────
create or replace function public.payment_guard() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  today date := public.today_bogota();
  correcting boolean := coalesce(current_setting('colportor.payment_correction', true), '') = 'on';
  discarding boolean := coalesce(current_setting('colportor.customer_discard', true), '') = 'on';
begin
  -- R6: la fecha real no es futura.
  if new.paid_at is not null and new.paid_at > today
     and (tg_op = 'INSERT' or new.paid_at is distinct from old.paid_at) then
    raise exception 'PAID_AT_IN_FUTURE: la fecha real no puede ser futura' using errcode = 'P0001';
  end if;

  if tg_op = 'INSERT' then
    if new.kind = 'scheduled' and new.status = 'scheduled' then
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

  if new.deleted_at is not null
     and old.status not in ('scheduled', 'collected')
     and not (discarding and old.status = 'canceled') then
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
  return new;
end
$$;

-- ─── assert_scheduled: programar y corregir (R1) ─────────────────────────────────────────────────
create or replace function public.assert_scheduled(p_agreed_amount integer, p_due_date date)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if p_agreed_amount is not null and p_agreed_amount <= 0 then
    raise exception 'VALIDATION: el valor debe ser mayor que 0' using errcode = 'P0001', detail = 'agreedAmount';
  end if;
end
$$;

-- ─── apply_payment_plan: el primer abono puede ser pasado (R1, R4) ───────────────────────────────
create or replace function public.apply_payment_plan(p_customer_id uuid, p_mode text, p_items jsonb)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_owner uuid := public.require_active_user();
  v_uuid constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  v_archived timestamptz;
  v_balance bigint;
  v_scheduled bigint;
  v_base bigint;
  v_total bigint;
  v_count integer;
  v_existing integer;
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
  if p_mode is null or p_mode not in ('replace_all', 'unscheduled_only') then
    raise exception 'VALIDATION: modo inválido' using errcode = 'P0001', detail = 'mode';
  end if;

  -- R4: forma de cada abono (antes de convertir nada).
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0
     or exists (
       select 1 from jsonb_array_elements(p_items) i(item)
       where jsonb_typeof(i.item) <> 'object'
          or jsonb_typeof(i.item -> 'paymentId') is distinct from 'string'
          or not (i.item ->> 'paymentId') ~* v_uuid
          or jsonb_typeof(i.item -> 'dueDate') is distinct from 'string'
          or not (i.item ->> 'dueDate') ~ '^\d{4}-\d{2}-\d{2}$'
          or jsonb_typeof(i.item -> 'amount') is distinct from 'number'
          or (i.item ->> 'amount') !~ '^[1-9][0-9]{0,9}$'
     ) then
    raise exception 'VALIDATION: abonos del plan mal formados' using errcode = 'P0001', detail = 'items';
  end if;

  select count(*), count(distinct i.item ->> 'paymentId'), coalesce(sum((i.item ->> 'amount')::bigint), 0)
    into v_count, v_existing, v_total
  from jsonb_array_elements(p_items) i(item);
  if v_existing <> v_count then
    raise exception 'VALIDATION: ids de abono repetidos' using errcode = 'P0001', detail = 'items';
  end if;
  begin
    -- HU-ABO-08: la fecha puede ser anterior a hoy; solo tiene que ser una fecha que exista.
    perform (i.item ->> 'dueDate')::date from jsonb_array_elements(p_items) i(item);
  exception when datetime_field_overflow or invalid_datetime_format then
    raise exception 'VALIDATION: fecha inexistente' using errcode = 'P0001', detail = 'dueDate';
  end;

  -- Reintento: si todos los abonos ya existen para este cliente, el plan ya se aplicó.
  select count(*) into v_existing from public.payment p
  where p.id in (select (i.item ->> 'paymentId')::uuid from jsonb_array_elements(p_items) i(item));
  if v_existing > 0 then
    if v_existing = v_count and not exists (
      select 1 from jsonb_array_elements(p_items) i(item)
      left join public.payment p on p.id = (i.item ->> 'paymentId')::uuid
      where p.id is null or p.customer_id <> p_customer_id or p.owner_id <> v_owner or p.kind <> 'scheduled'
    ) then
      return;
    end if;
    raise exception 'CONFLICT: algunos abonos del plan ya existen' using errcode = 'P0001';
  end if;

  -- R1: la base sale de la cuenta vigente (igual que computeCustomerAccount; canjes de minibooks: 0 hoy).
  perform 1 from public.payment p
  where p.customer_id = p_customer_id and p.owner_id = v_owner and p.status = 'scheduled' and p.deleted_at is null
  for update;
  select
    coalesce((select sum(c.agreed_price) from public.copy c
              where c.customer_id = p_customer_id and c.owner_id = v_owner
                and c.status = 'sold' and c.deleted_at is null), 0)
    - coalesce((select sum(p.paid_amount) from public.payment p
                where p.customer_id = p_customer_id and p.owner_id = v_owner
                  and p.status in ('collected', 'delivered') and p.deleted_at is null), 0)
  into v_balance;
  select coalesce(sum(p.agreed_amount), 0) into v_scheduled from public.payment p
  where p.customer_id = p_customer_id and p.owner_id = v_owner and p.status = 'scheduled' and p.deleted_at is null;

  v_base := case when p_mode = 'replace_all' then greatest(0, v_balance)
                 else greatest(0, greatest(0, v_balance) - v_scheduled) end;
  if v_base = 0 then
    raise exception 'PLAN_REQUIRES_BALANCE: no hay saldo para programar' using errcode = 'P0001';
  end if;
  if v_total <> v_base then
    raise exception 'PLAN_TOTAL_MISMATCH: los abonos suman % y deben sumar %', v_total, v_base
      using errcode = 'P0001';
  end if;

  -- R5: en la ficha nueva el plan reemplaza los programados (borrado lógico, sin evento).
  if p_mode = 'replace_all' then
    update public.payment set deleted_at = now()
    where customer_id = p_customer_id and owner_id = v_owner and status = 'scheduled' and deleted_at is null;
  end if;

  -- R6: programados con fecha acordada = fecha original.
  insert into public.payment (id, owner_id, customer_id, kind, status, agreed_amount, due_date, original_due_date)
  select (i.item ->> 'paymentId')::uuid, v_owner, p_customer_id, 'scheduled', 'scheduled',
         (i.item ->> 'amount')::integer, (i.item ->> 'dueDate')::date, (i.item ->> 'dueDate')::date
  from jsonb_array_elements(p_items) i(item);

  update public.customer set updated_at = now() where id = p_customer_id;
end
$$;

-- ─── reschedule_payment (R2) ─────────────────────────────────────────────────────────────────────
create or replace function public.reschedule_payment(
  p_payment_id uuid, p_new_due_date date, p_note text default null, p_confirmed boolean default false
)
returns table (payment_id uuid, previous_due_date date, new_due_date date)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_owner uuid := public.require_active_user();
  v_customer uuid := public.lock_scheduled_payment(v_owner, p_payment_id);
  v_current date;
  v_last record;
  v_today date := public.today_bogota();
begin
  if p_new_due_date is null then
    raise exception 'VALIDATION: falta la fecha' using errcode = 'P0001', detail = 'newDueDate';
  end if;
  select p.due_date into v_current from public.payment p where p.id = p_payment_id;

  -- Reintento: la misma prórroga ya quedó guardada.
  if p_new_due_date = v_current then
    select r.previous_due_date, r.new_due_date into v_last from public.payment_reschedule r
    where r.payment_id = p_payment_id order by r.seq desc limit 1;
    if found and v_last.new_due_date = p_new_due_date then
      return query select p_payment_id, v_last.previous_due_date, v_last.new_due_date;
      return;
    end if;
  end if;

  -- R2: solo da más plazo; puede quedar antes de hoy (HU-ABO-08, ADR-0049).
  if p_new_due_date <= v_current then
    raise exception 'DATE_NOT_LATER: la nueva fecha debe ser posterior a la actual' using errcode = 'P0001';
  end if;
  -- R3: más allá de hoy + 2 meses calendario pide confirmar (businessConfig.reschedule.confirmBeyondMonths;
  -- tests/rls/reschedule.test.ts compara este límite con el del dominio). El límite exacto se acepta (OQ-31).
  if p_new_due_date > (v_today + interval '2 months')::date and not coalesce(p_confirmed, false) then
    raise exception 'RESCHEDULE_NEEDS_CONFIRMATION: la nueva fecha pasa de 2 meses' using errcode = 'P0001',
      detail = jsonb_build_array(p_new_due_date)::text;
  end if;

  perform set_config('colportor.payment_event',
                     jsonb_strip_nulls(jsonb_build_object('note', nullif(btrim(p_note), '')))::text, true);
  update public.payment set due_date = p_new_due_date where id = p_payment_id;
  perform set_config('colportor.payment_event', '', true);

  update public.customer set updated_at = now() where id = v_customer;
  return query select p_payment_id, v_current, p_new_due_date;
end
$$;
