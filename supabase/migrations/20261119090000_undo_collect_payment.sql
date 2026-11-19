-- HU-ABO-10 · Deshacer un cobro (decisión del dueño, 2026-11-19, para el «Deshacer» de HU-PAN-DIN-02 CA-3).
-- Un abono PROGRAMADO cobrado, que aún no está en un Abibono, vuelve a «por cobrar»: se borran su valor real, su
-- fecha real y su método; lo acordado (valor, fecha, original) no cambia. La cuota inicial y el abono extra nacen
-- cobrados y no se deshacen (se corrigen o se borran). Lo que el cobro hubiera provocado en otros abonos (p. ej. un
-- sobrante resuelto) NO se deshace. Errores (P0001): FORBIDDEN, NOT_FOUND, INVALID_TRANSITION (no está cobrado o no es
-- programado), PAYMENT_LOCKED (está en un Abibono, borrador o entregado), CUSTOMER_ARCHIVED.

-- ─── payment_guard: la tabla de transiciones suma cobrado → por cobrar ───────────────────────────
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
    ('scheduled', 'collected'), ('scheduled', 'canceled'), ('collected', 'delivered'), ('delivered', 'collected'),
    ('collected', 'scheduled')
  ) then
    raise exception 'INVALID_TRANSITION: % → %', old.status, new.status using errcode = 'P0001';
  end if;

  -- Deshacer un cobro: solo el de un abono programado (la cuota inicial y el abono extra nacen cobrados).
  if old.status = 'collected' and new.status = 'scheduled' and old.kind <> 'scheduled' then
    raise exception 'INVALID_TRANSITION: solo se deshace el cobro de un abono programado' using errcode = 'P0001';
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

-- ─── undo_collect_payment ────────────────────────────────────────────────────────────────────────
create function public.undo_collect_payment(p_payment_id uuid)
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
  select p.status, p.kind, p.customer_id, p.leader_deposit_id, c.archived_at into v_payment
  from public.payment p
  join public.customer c on c.id = p.customer_id
  where p.id = p_payment_id and p.owner_id = v_owner and p.deleted_at is null
  for update of p;
  if not found then
    raise exception 'NOT_FOUND: abono inexistente' using errcode = 'P0001';
  end if;
  if v_payment.status = 'delivered' or v_payment.leader_deposit_id is not null then
    raise exception 'PAYMENT_LOCKED: el cobro ya está en un Abibono' using errcode = 'P0001';
  end if;
  if v_payment.status <> 'collected' or v_payment.kind <> 'scheduled' then
    raise exception 'INVALID_TRANSITION: solo se deshace el cobro de un abono programado cobrado' using errcode = 'P0001';
  end if;
  if v_payment.archived_at is not null then
    raise exception 'CUSTOMER_ARCHIVED: el cliente está archivado' using errcode = 'P0001';
  end if;

  update public.payment set status = 'scheduled', paid_amount = null, paid_at = null, method = null
  where id = p_payment_id;

  update public.customer c set updated_at = now() where c.id = v_payment.customer_id;
  return v_payment.customer_id;
end
$$;

revoke all on function public.undo_collect_payment(uuid) from public, anon, authenticated, service_role;
grant execute on function public.undo_collect_payment(uuid) to authenticated;
