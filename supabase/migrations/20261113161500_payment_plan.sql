-- HU-ABO-03 · Aplicar un plan de abonos. BR-PAY-15, ADR-0039/0045/0047, AF-113, AF-116.
-- El plan lo arma el dominio (buildPaymentPlan); el servidor RECALCULA la base y valida que los abonos sumen
-- exactamente esa base antes de guardar (R4). No se guarda la frecuencia: solo abonos programados normales.
-- p_mode: 'replace_all' (ficha nueva: reemplaza los programados; base = lo que falta pagar) o
--         'unscheduled_only' (cliente guardado: no toca los existentes; base = lo sin programar).
-- p_items: [{"paymentId": uuid, "dueDate": "AAAA-MM-DD", "amount": entero > 0}, …]
-- Errores (P0001): FORBIDDEN, NOT_FOUND, CUSTOMER_ARCHIVED, VALIDATION (detail = campo),
--                  PLAN_REQUIRES_BALANCE, PLAN_TOTAL_MISMATCH, CONFLICT.
create function public.apply_payment_plan(p_customer_id uuid, p_mode text, p_items jsonb)
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
    if exists (
      select 1 from jsonb_array_elements(p_items) i(item) where (i.item ->> 'dueDate')::date < public.today_bogota()
    ) then
      raise exception 'VALIDATION: la fecha de un abono no puede ser anterior a hoy' using errcode = 'P0001',
        detail = 'dueDate';
    end if;
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

revoke all on function public.apply_payment_plan(uuid, text, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.apply_payment_plan(uuid, text, jsonb) to authenticated;
