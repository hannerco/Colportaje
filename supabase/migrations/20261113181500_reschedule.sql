-- HU-ABO-05 · Prórroga. BR-PAY-06, ADR-0033/0045/0047, OQ-31.
-- Mueve SOLO ese abono (R5). La fila de payment_reschedule (fecha anterior, nueva, momento y nota) la escribe
-- el trigger payment_write_history (HU-ABO-01); la fecha original no cambia (payment_guard, R4).
-- Errores (P0001): FORBIDDEN, NOT_FOUND, PAYMENT_NOT_SCHEDULED, CUSTOMER_ARCHIVED, VALIDATION, DATE_IN_PAST,
--                  DATE_NOT_LATER, RESCHEDULE_NEEDS_CONFIRMATION (detail = fechas en JSON).
create function public.reschedule_payment(
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

  -- R2: solo da más plazo, y nunca antes de hoy.
  if p_new_due_date < v_today then
    raise exception 'DATE_IN_PAST: la nueva fecha no puede ser anterior a hoy' using errcode = 'P0001';
  end if;
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

revoke all on function public.reschedule_payment(uuid, date, text, boolean) from public, anon, authenticated, service_role;
grant execute on function public.reschedule_payment(uuid, date, text, boolean) to authenticated;
