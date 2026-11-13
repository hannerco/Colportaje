-- HU-ABO-01 · Abonos: tabla, transiciones, fechas e historial. BR-PAY-01..12, BR-AUD-01, ADR-0009/0040/0046.
-- El enlace con el Abibono (leader_deposit_id) y el bloqueo de lo entregado llegan con HU-DIN-01.
-- Cada acción (cuota inicial, plan, cobrar, prórroga, cancelar…) llega con su HU como función SQL;
-- el usuario solo LEE estas tablas por la API.

-- ─── payment ──────────────────────────────────────────────────────────────────────────────────────
create table public.payment (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users,
  customer_id uuid not null,                            -- BR-PAY-12: sobrevive al archivado del cliente
  kind public.payment_kind not null,
  status public.payment_status not null,
  original_due_date date,                               -- R4: no cambia salvo la corrección al crear (HU-ABO-04)
  due_date date,
  paid_at date,
  agreed_amount integer check (agreed_amount > 0),
  paid_amount integer check (paid_amount > 0),
  method public.pay_method,
  canceled_at timestamptz,
  cancel_reason public.cancel_reason,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,                               -- borrado lógico (BR-PAY-11)
  constraint payment_id_owner_key unique (id, owner_id),
  constraint payment_customer_same_owner foreign key (customer_id, owner_id) references public.customer (id, owner_id),
  -- R2: cobrado o entregado → valor real, fecha real y método.
  constraint payment_paid_complete check (
    status in ('scheduled', 'canceled') or (paid_amount is not null and paid_at is not null and method is not null)
  ),
  -- R1: por cobrar o cancelado → abono programado con valor acordado, fecha acordada y fecha original.
  constraint payment_scheduled_complete check (
    status not in ('scheduled', 'canceled')
    or (kind = 'scheduled' and agreed_amount is not null and due_date is not null and original_due_date is not null)
  ),
  -- R3: cancelado → fecha y motivo.
  constraint payment_canceled_complete check (
    status <> 'canceled' or (canceled_at is not null and cancel_reason is not null)
  ),
  -- BR-PAY-03: el abono extra no tiene fecha acordada; la cuota inicial usa la fecha de pago como acordada.
  constraint payment_extra_without_due_date check (
    kind <> 'extra' or (due_date is null and original_due_date is null)
  ),
  constraint payment_down_payment_dates check (
    kind <> 'down_payment' or (due_date = paid_at and original_due_date = paid_at)
  )
);

create index payment_owner_status_due_idx on public.payment (owner_id, status, due_date);
create index payment_customer_idx on public.payment (customer_id);

create trigger payment_set_updated_at before update on public.payment
  for each row execute function public.set_updated_at();

-- ─── Historial (R7, BR-AUD-01): solo inserción ─────────────────────────────────────────────────────
create table public.payment_reschedule (                -- prórrogas (BR-PAY-06)
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity,
  owner_id uuid not null,
  payment_id uuid not null,
  previous_due_date date not null,
  new_due_date date not null,
  changed_at timestamptz not null default clock_timestamp(),
  note text,
  constraint payment_reschedule_payment_same_owner foreign key (payment_id, owner_id)
    references public.payment (id, owner_id)
);

create index payment_reschedule_payment_idx on public.payment_reschedule (payment_id, seq);

create type public.payment_event_type as enum ('amount_reduced', 'canceled', 'reopened');

create table public.payment_event (                     -- recortes, cancelaciones y reaperturas (BR-PAY-13, BR-DEP-12)
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity,
  owner_id uuid not null,
  payment_id uuid not null,
  type public.payment_event_type not null,
  data jsonb not null default '{}'::jsonb,
  at timestamptz not null default clock_timestamp(),
  constraint payment_event_payment_same_owner foreign key (payment_id, owner_id)
    references public.payment (id, owner_id)
);

create index payment_event_payment_idx on public.payment_event (payment_id, seq);

-- ─── Reglas de fechas y transiciones (R3–R6) ───────────────────────────────────────────────────────
-- Contexto que deja la función que hace el cambio, en la misma transacción:
--   colportor.payment_event      → jsonb con datos del evento (p. ej. {"trigger":"book_returned","note":"…"})
--   colportor.payment_correction → 'on' durante la CORRECCIÓN de fechas al crear el cliente (HU-ABO-04):
--                                  cambia también original_due_date y no deja prórroga.
create function public.payment_guard() returns trigger
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
      -- R5 (BR-PAY-06/16): no se programa en el pasado. BR-PAY-03: nace con original = acordada.
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

  -- Un abono borrado no se edita.
  if old.deleted_at is not null then
    raise exception 'INVALID_TRANSITION: un abono borrado no se edita' using errcode = 'P0001';
  end if;

  -- Borrar (lógico) un abono por cobrar o cobrado (BR-PAY-11); lo entregado está bloqueado (ADR-0010).
  if new.deleted_at is not null and old.status not in ('scheduled', 'collected') then
    raise exception 'INVALID_TRANSITION: un abono % no se borra', old.status using errcode = 'P0001';
  end if;

  -- Transiciones: la MISMA tabla que PAYMENT_TRANSITIONS en src/domain/payment.ts.
  if new.status <> old.status and (old.status, new.status) not in (
    ('scheduled', 'collected'), ('scheduled', 'canceled'), ('collected', 'delivered'), ('delivered', 'collected')
  ) then
    raise exception 'INVALID_TRANSITION: % → %', old.status, new.status using errcode = 'P0001';
  end if;

  -- R4: la fecha original no cambia, salvo la corrección durante la creación (que mueve ambas).
  if new.original_due_date is distinct from old.original_due_date then
    if not correcting or old.status <> 'scheduled' or new.original_due_date is distinct from new.due_date then
      raise exception 'ORIGINAL_DUE_DATE_LOCKED: la fecha original no cambia' using errcode = 'P0001';
    end if;
  end if;

  -- R5: cambiar la fecha acordada de un abono por cobrar nunca la deja antes de hoy.
  if new.status = 'scheduled' and new.due_date is distinct from old.due_date and new.due_date < today then
    raise exception 'DUE_DATE_IN_PAST: la fecha acordada no puede ser anterior a hoy' using errcode = 'P0001';
  end if;
  return new;
end
$$;

create trigger payment_guard before insert or update on public.payment
  for each row execute function public.payment_guard();

-- R7: cancelaciones, recortes y reaperturas → payment_event; prórrogas → payment_reschedule.
create function public.payment_write_history() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ctx jsonb := coalesce(nullif(current_setting('colportor.payment_event', true), '')::jsonb, '{}'::jsonb);
  correcting boolean := coalesce(current_setting('colportor.payment_correction', true), '') = 'on';
begin
  if old.status = 'scheduled' and new.status = 'canceled' then
    insert into public.payment_event (owner_id, payment_id, type, data)
    values (new.owner_id, new.id, 'canceled',
            ctx || jsonb_build_object('reason', new.cancel_reason, 'agreedAmount', new.agreed_amount));
  elsif old.status = 'delivered' and new.status = 'collected' then
    insert into public.payment_event (owner_id, payment_id, type, data)
    values (new.owner_id, new.id, 'reopened', ctx);
  end if;

  -- Recorte o ajuste a la baja del valor acordado de un abono por cobrar (BR-PAY-13).
  if old.status = 'scheduled' and new.status = 'scheduled' and new.agreed_amount < old.agreed_amount then
    insert into public.payment_event (owner_id, payment_id, type, data)
    values (new.owner_id, new.id, 'amount_reduced',
            ctx || jsonb_build_object('previousAmount', old.agreed_amount, 'newAmount', new.agreed_amount));
  end if;

  -- Prórroga (BR-PAY-06): cambiar la fecha acordada fuera de una corrección.
  if new.status = 'scheduled' and new.due_date is distinct from old.due_date and not correcting then
    insert into public.payment_reschedule (owner_id, payment_id, previous_due_date, new_due_date, note)
    values (new.owner_id, new.id, old.due_date, new.due_date, ctx ->> 'note');
  end if;
  return new;
end
$$;

revoke all on function public.payment_write_history() from public, anon, authenticated, service_role;

create trigger payment_write_history after update on public.payment
  for each row execute function public.payment_write_history();

-- ─── RLS: cada usuario lee lo suyo; escribir es de las funciones de cada HU de Abonos ──────────────
alter table public.payment enable row level security;
create policy payment_owner_select on public.payment for select to authenticated
  using (owner_id = (select auth.uid()) and (select public.is_active_user()));
grant select on public.payment to authenticated;

alter table public.payment_reschedule enable row level security;
create policy payment_reschedule_owner_select on public.payment_reschedule for select to authenticated
  using (owner_id = (select auth.uid()) and (select public.is_active_user()));
grant select on public.payment_reschedule to authenticated;

alter table public.payment_event enable row level security;
create policy payment_event_owner_select on public.payment_event for select to authenticated
  using (owner_id = (select auth.uid()) and (select public.is_active_user()));
grant select on public.payment_event to authenticated;
