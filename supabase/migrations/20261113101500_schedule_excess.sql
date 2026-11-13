-- HU-ABO-07 · Alerta de abonos que no cuadran: aplicar la opción elegida. BR-PAY-13, ADR-0033, OQ-30, OQ-36.
-- El servidor RECALCULA saldo, programado y sobrante sobre lo vigente (R3, CA-7): nunca usa el plan del front.
-- p_choice: {"action":"auto_trim","order":"nearest"|"farthest"} · {"action":"cancel_selected","paymentIds":[…]}
--           · {"action":"leave"}.
-- Errores (P0001, prefijo = código): FORBIDDEN, VALIDATION, NOT_FOUND, NO_EXCESS, LEAVE_NOT_ALLOWED, CONFLICT.
create function public.resolve_schedule_excess(p_customer_id uuid, p_choice jsonb, p_trigger text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
  v_uuid constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  v_action text := case when jsonb_typeof(p_choice) = 'object' then p_choice ->> 'action' end;
  v_order text;
  v_reason public.cancel_reason;
  v_balance bigint;
  v_scheduled bigint;
  v_excess bigint;
  v_left bigint;
  v_ids uuid[];
  r record;
begin
  if v_owner is null or not public.is_active_user() then
    raise exception 'FORBIDDEN: sin sesión o usuario inactivo' using errcode = 'P0001';
  end if;

  -- Motivo de cancelación por disparador: la MISMA tabla que EXCESS_TRIGGERS (src/domain/schedule-excess.ts);
  -- tests/rls/schedule-excess.test.ts verifica que coincidan.
  v_reason := case p_trigger
    when 'extra_payment' then 'overpaid'
    when 'overpayment' then 'overpaid'
    when 'return' then 'book_returned'
    when 'price_decrease' then 'manual'
    when 'edit_collected' then 'overpaid'
    when 'delete_collected' then 'manual'
    when 'form_edit' then 'manual'
    when 'review' then 'manual'
  end::public.cancel_reason;
  if v_reason is null or v_action is null or v_action not in ('auto_trim', 'cancel_selected', 'leave') then
    raise exception 'VALIDATION: disparador u opción inválidos' using errcode = 'P0001';
  end if;
  if v_action = 'auto_trim' then
    v_order := p_choice ->> 'order';
    if v_order is null or v_order not in ('nearest', 'farthest') then
      raise exception 'VALIDATION: orden inválido' using errcode = 'P0001';
    end if;
  elsif v_action = 'cancel_selected' then
    if jsonb_typeof(p_choice -> 'paymentIds') is distinct from 'array'
       or jsonb_array_length(p_choice -> 'paymentIds') = 0
       or exists (
         select 1 from jsonb_array_elements(p_choice -> 'paymentIds') e(id)
         where jsonb_typeof(e.id) <> 'string' or not (e.id #>> '{}') ~* v_uuid
       ) then
      raise exception 'VALIDATION: paymentIds inválidos' using errcode = 'P0001';
    end if;
    select array_agg(distinct (e.id #>> '{}')::uuid) into v_ids
    from jsonb_array_elements(p_choice -> 'paymentIds') e(id);
  end if;

  -- El cliente y sus programados quedan bloqueados: nadie cobra ni edita a mitad del recálculo.
  perform 1 from public.customer c
  where c.id = p_customer_id and c.owner_id = v_owner and c.deleted_at is null
  for update;
  if not found then
    raise exception 'NOT_FOUND: cliente inexistente' using errcode = 'P0001';
  end if;
  perform 1 from public.payment p
  where p.customer_id = p_customer_id and p.owner_id = v_owner and p.status = 'scheduled' and p.deleted_at is null
  for update;

  -- Cuenta vigente (BR-CUS-04, ADR-0033): balance = deuda − cobrado (+ canjes de saldo a favor, que llegan
  -- con el módulo Minibooks; hoy 0). Igual que computeCustomerAccount.
  select
    coalesce((select sum(c.agreed_price) from public.copy c
              where c.customer_id = p_customer_id and c.owner_id = v_owner
                and c.status = 'sold' and c.deleted_at is null), 0)
    - coalesce((select sum(p.paid_amount) from public.payment p
                where p.customer_id = p_customer_id and p.owner_id = v_owner
                  and p.status in ('collected', 'delivered') and p.deleted_at is null), 0)
  into v_balance;
  select coalesce(sum(p.agreed_amount), 0) into v_scheduled
  from public.payment p
  where p.customer_id = p_customer_id and p.owner_id = v_owner and p.status = 'scheduled' and p.deleted_at is null;
  v_excess := v_scheduled - greatest(0, v_balance);

  -- "Dejar como está": no guarda nada; solo si aún debe algo (R5).
  if v_action = 'leave' then
    if v_excess <= 0 then
      raise exception 'NO_EXCESS: no hay sobrante' using errcode = 'P0001';
    end if;
    if v_balance <= 0 then
      raise exception 'LEAVE_NOT_ALLOWED: con saldo 0 o a favor hay que recortar o cancelar' using errcode = 'P0001';
    end if;
    return;
  end if;

  -- Recortar o cancelar se eligieron sobre una evaluación con sobrante: si ya no lo hay, algo cambió (CA-7).
  if v_excess <= 0 then
    raise exception 'CONFLICT: ya no hay sobrante' using errcode = 'P0001';
  end if;

  -- El trigger payment_write_history deja los eventos con el disparador (R3).
  perform set_config('colportor.payment_event', jsonb_build_object('trigger', p_trigger)::text, true);

  if v_action = 'auto_trim' then
    -- R2: en el orden elegido; empates por creación y luego id (OQ-30), igual que sortForTrim.
    v_left := v_excess;
    for r in
      select p.id, p.agreed_amount
      from public.payment p
      where p.customer_id = p_customer_id and p.owner_id = v_owner and p.status = 'scheduled'
        and p.deleted_at is null
      order by
        case when v_order = 'nearest' then p.due_date end asc,
        case when v_order = 'farthest' then p.due_date end desc,
        p.created_at, p.id
    loop
      exit when v_left <= 0;
      if r.agreed_amount <= v_left then
        update public.payment set status = 'canceled', canceled_at = now(), cancel_reason = v_reason
        where id = r.id;
        v_left := v_left - r.agreed_amount;
      else
        update public.payment set agreed_amount = r.agreed_amount - v_left where id = r.id;
        v_left := 0;
      end if;
    end loop;
  else
    -- R4: solo los marcados, y todos deben seguir siendo programados vigentes de este cliente.
    if exists (
      select 1 from unnest(v_ids) u(id)
      where not exists (
        select 1 from public.payment p
        where p.id = u.id and p.customer_id = p_customer_id and p.owner_id = v_owner
          and p.status = 'scheduled' and p.deleted_at is null
      )
    ) then
      raise exception 'CONFLICT: algún abono marcado ya no está por cobrar' using errcode = 'P0001';
    end if;
    update public.payment set status = 'canceled', canceled_at = now(), cancel_reason = v_reason
    where id = any(v_ids);
  end if;

  perform set_config('colportor.payment_event', '', true);
  -- "Última modificación" del cliente (BR-CUS-16, 00-REGLAS-COMUNES §6).
  update public.customer set updated_at = now() where id = p_customer_id;
end
$$;

revoke all on function public.resolve_schedule_excess(uuid, jsonb, text) from public, anon, authenticated, service_role;
grant execute on function public.resolve_schedule_excess(uuid, jsonb, text) to authenticated;
