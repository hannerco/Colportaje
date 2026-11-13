-- HU-DIN-01 · Abibono ("Entrega al líder"): tablas, vínculos, número y bloqueos.
-- BR-DEP-01..09/11/12, BR-PAY-09/10, BR-PHO-03, ADR-0010, ADR-0022, ADR-0041.
-- total, esperado y diferencia se DERIVAN en el dominio (src/domain/deposit.ts); aquí solo lo entregado (R1).
-- Las acciones (crear, confirmar, reabrir, borrar borrador) llegan con HU-DIN-04/05/07 como funciones SQL;
-- el usuario solo LEE estas tablas por la API.

-- ─── leader_deposit ───────────────────────────────────────────────────────────────────────────────
create table public.leader_deposit (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users,
  title text check (title is null or btrim(title) <> ''),   -- null = «Abibono (n)» automático (BR-DEP-02)
  deposit_number integer check (deposit_number >= 1),        -- R7: lo asigna el trigger al confirmar por primera vez
  deposit_date date not null default public.today_bogota(), -- BR-DEP-03
  cash_amount integer not null default 0 check (cash_amount >= 0),
  transfer_amount integer not null default 0 check (transfer_amount >= 0),
  note text,
  status public.deposit_status not null default 'draft',
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint leader_deposit_id_owner_key unique (id, owner_id),
  -- Confirmado ⇒ con número y fecha de confirmación; borrador ⇒ sin fecha de confirmación.
  constraint leader_deposit_confirmed_complete check (
    (status = 'confirmed') = (confirmed_at is not null) and (status <> 'confirmed' or deposit_number is not null)
  ),
  constraint leader_deposit_confirmed_not_deleted check (status <> 'confirmed' or deleted_at is null)
);

-- R7: único por colportor.
create unique index leader_deposit_owner_number_uq on public.leader_deposit (owner_id, deposit_number)
  where deposit_number is not null;
create index leader_deposit_owner_date_idx on public.leader_deposit (owner_id, deposit_date desc);

create trigger leader_deposit_set_updated_at before update on public.leader_deposit
  for each row execute function public.set_updated_at();

-- ─── Número consecutivo (R7, BR-DEP-02) ────────────────────────────────────────────────────────────
-- Contador por colportor: el upsert bloquea su fila, así dos confirmaciones simultáneas nunca repiten número.
create table public.leader_deposit_counter (
  owner_id uuid primary key references auth.users,
  last_number integer not null default 0
);

create function public.next_deposit_number(p_owner uuid) returns integer
language sql
volatile
security definer
set search_path = ''
as $$
  insert into public.leader_deposit_counter as c (owner_id, last_number)
  values (p_owner, 1)
  on conflict (owner_id) do update set last_number = c.last_number + 1
  returning c.last_number
$$;

revoke all on function public.next_deposit_number(uuid) from public, anon, authenticated, service_role;

-- ─── Historial (BR-DEP-12, BR-AUD-01): solo inserción, escrito por trigger ─────────────────────────
create table public.leader_deposit_event (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity,
  owner_id uuid not null,
  leader_deposit_id uuid not null,
  type text not null check (type in ('confirmed', 'reopened')),
  reason text,                                               -- motivo obligatorio al reabrir
  at timestamptz not null default clock_timestamp(),
  constraint leader_deposit_event_deposit_same_owner foreign key (leader_deposit_id, owner_id)
    references public.leader_deposit (id, owner_id),
  constraint leader_deposit_event_reopen_reason check (type <> 'reopened' or btrim(coalesce(reason, '')) <> '')
);

create index leader_deposit_event_deposit_idx on public.leader_deposit_event (leader_deposit_id, seq);

-- ─── Vínculos (migraciones aditivas sobre payment y photo) ─────────────────────────────────────────
alter table public.payment add column leader_deposit_id uuid;
alter table public.payment
  add constraint payment_deposit_same_owner foreign key (leader_deposit_id, owner_id)
    references public.leader_deposit (id, owner_id),
  -- R2 / BR-PAY-09: solo un abono cobrado (o ya entregado) puede estar en un Abibono.
  add constraint payment_deposit_only_collected check (
    leader_deposit_id is null or status in ('collected', 'delivered')
  ),
  -- BR-PAY-11: borrar un abono lo quita de su Abibono borrador.
  add constraint payment_deleted_unlinked check (deleted_at is null or leader_deposit_id is null);
create index payment_leader_deposit_idx on public.payment (leader_deposit_id) where leader_deposit_id is not null;

alter table public.photo add column leader_deposit_id uuid;
alter table public.photo
  add constraint photo_deposit_same_owner foreign key (leader_deposit_id, owner_id)
    references public.leader_deposit (id, owner_id),
  -- Un recibo siempre pertenece a un Abibono, y solo los recibos se vinculan a uno.
  add constraint photo_deposit_receipt_linked check ((kind = 'deposit_receipt') = (leader_deposit_id is not null));
create index photo_leader_deposit_idx on public.photo (leader_deposit_id) where leader_deposit_id is not null;

-- ─── Bloqueos del Abibono (R4, R7) ─────────────────────────────────────────────────────────────────
-- Contexto de la función que hace el cambio: colportor.deposit_event → {"reason":"…"} al reabrir.
create function public.leader_deposit_guard() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    -- R7: un borrador nuevo no consume número.
    if new.status <> 'draft' or new.deposit_number is not null or new.confirmed_at is not null then
      raise exception 'INVALID_TRANSITION: un Abibono nace como borrador sin número' using errcode = 'P0001';
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    -- Solo se borra (físicamente, BR-DEP-10) un borrador que nunca se confirmó: su número no se pierde.
    if old.status <> 'draft' or old.deposit_number is not null then
      raise exception 'INVALID_TRANSITION: solo se borra un borrador que nunca se confirmó' using errcode = 'P0001';
    end if;
    return old;
  end if;

  if new.owner_id <> old.owner_id or new.created_at <> old.created_at then
    raise exception 'INVALID_TRANSITION: dueño y creación no cambian' using errcode = 'P0001';
  end if;

  -- R7: el número no cambia nunca; solo se asigna al confirmar por primera vez.
  if new.deposit_number is distinct from old.deposit_number then
    raise exception 'INVALID_TRANSITION: el número del Abibono no cambia' using errcode = 'P0001';
  end if;
  if old.status = 'draft' and new.status = 'confirmed' and old.deposit_number is null then
    new.deposit_number := public.next_deposit_number(new.owner_id);
  end if;

  -- R4 / BR-DEP-12: confirmado → título, fecha y montos bloqueados (también al reabrir: se editan después).
  if old.status = 'confirmed' and (
       new.title is distinct from old.title or new.deposit_date <> old.deposit_date
       or new.cash_amount <> old.cash_amount or new.transfer_amount <> old.transfer_amount
       or (new.status = 'confirmed' and new.confirmed_at is distinct from old.confirmed_at)
     ) then
    raise exception 'DEPOSIT_LOCKED: un Abibono confirmado solo cambia su nota' using errcode = 'P0001';
  end if;
  return new;
end
$$;

revoke all on function public.leader_deposit_guard() from public, anon, authenticated, service_role;

create trigger leader_deposit_guard before insert or update or delete on public.leader_deposit
  for each row execute function public.leader_deposit_guard();

-- Confirmar y reabrir dejan su evento (BR-DEP-12).
create function public.leader_deposit_write_events() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ctx jsonb := coalesce(nullif(current_setting('colportor.deposit_event', true), '')::jsonb, '{}'::jsonb);
begin
  if old.status = 'draft' and new.status = 'confirmed' then
    insert into public.leader_deposit_event (owner_id, leader_deposit_id, type)
    values (new.owner_id, new.id, 'confirmed');
  elsif old.status = 'confirmed' and new.status = 'draft' then
    insert into public.leader_deposit_event (owner_id, leader_deposit_id, type, reason)
    values (new.owner_id, new.id, 'reopened', ctx ->> 'reason');
  end if;
  return new;
end
$$;

revoke all on function public.leader_deposit_write_events() from public, anon, authenticated, service_role;

create trigger leader_deposit_write_events after update on public.leader_deposit
  for each row execute function public.leader_deposit_write_events();

-- ─── Bloqueos del abono (R2, R3, BR-DEP-08) ────────────────────────────────────────────────────────
create function public.payment_deposit_guard() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- R3 / BR-PAY-10: un abono entregado no se edita ni se borra; solo vuelve a cobrado al reabrir (HU-DIN-07).
    if old.status = 'delivered' and (
         new.status not in ('delivered', 'collected')
         or (new.customer_id, new.kind, new.original_due_date, new.due_date, new.paid_at, new.agreed_amount,
             new.paid_amount, new.method, new.canceled_at, new.cancel_reason, new.deleted_at, new.leader_deposit_id)
            is distinct from
            (old.customer_id, old.kind, old.original_due_date, old.due_date, old.paid_at, old.agreed_amount,
             old.paid_amount, old.method, old.canceled_at, old.cancel_reason, old.deleted_at, old.leader_deposit_id)
       ) then
      raise exception 'PAYMENT_LOCKED: un abono entregado no se edita ni se borra' using errcode = 'P0001';
    end if;
    -- R2 / BR-DEP-08: un abono va en un solo Abibono; para cambiarlo de Abibono primero se quita del suyo.
    if old.leader_deposit_id is not null and new.leader_deposit_id is not null
       and new.leader_deposit_id <> old.leader_deposit_id then
      raise exception 'ALREADY_IN_DEPOSIT: el abono ya está en otro Abibono' using errcode = 'P0001';
    end if;
  return new;
end
$$;

create trigger payment_deposit_guard before update on public.payment
  for each row execute function public.payment_deposit_guard();

-- R5 / BR-PHO-03: los recibos de un Abibono confirmado no se borran ni se mueven; el vínculo no cambia.
create function public.photo_deposit_guard() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.leader_deposit_id is distinct from old.leader_deposit_id then
    raise exception 'INVALID_TRANSITION: el Abibono de una foto no cambia' using errcode = 'P0001';
  end if;
  if old.leader_deposit_id is not null and old.deleted_at is null and new.deleted_at is not null
     and exists (select 1 from public.leader_deposit d where d.id = old.leader_deposit_id and d.status = 'confirmed') then
    raise exception 'RECEIPT_LOCKED: un recibo de un Abibono confirmado no se borra' using errcode = 'P0001';
  end if;
  return new;
end
$$;

revoke all on function public.photo_deposit_guard() from public, anon, authenticated, service_role;

create trigger photo_deposit_guard before update on public.photo
  for each row execute function public.photo_deposit_guard();

-- ─── R6: entregado ⇔ Abibono confirmado (al cerrar la transacción) ─────────────────────────────────
-- Diferido: la función de confirmar o reabrir cambia el Abibono y sus abonos en cualquier orden, y la
-- regla se comprueba al final, sobre el estado definitivo.
create function public.payment_deposit_consistency() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  p record;
  deposit_status public.deposit_status;
begin
  select pay.status, pay.leader_deposit_id into p from public.payment pay where pay.id = new.id;
  if not found then
    return null;
  end if;
  if p.leader_deposit_id is not null then
    select d.status into deposit_status from public.leader_deposit d where d.id = p.leader_deposit_id;
  end if;
  if (p.status = 'delivered') <> (deposit_status is not distinct from 'confirmed') then
    raise exception 'DEPOSIT_MISMATCH: un abono entregado va siempre en un Abibono confirmado, y viceversa'
      using errcode = 'P0001';
  end if;
  return null;
end
$$;

revoke all on function public.payment_deposit_consistency() from public, anon, authenticated, service_role;

create constraint trigger payment_deposit_consistency after insert or update on public.payment
  deferrable initially deferred
  for each row execute function public.payment_deposit_consistency();

create function public.leader_deposit_consistency() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_status public.deposit_status;
begin
  select d.status into current_status from public.leader_deposit d where d.id = new.id;
  if not found then
    return null;
  end if;
  if exists (
    select 1 from public.payment pay
    where pay.leader_deposit_id = new.id
      and (pay.status = 'delivered') <> (current_status = 'confirmed')
  ) then
    raise exception 'DEPOSIT_MISMATCH: los abonos de un Abibono confirmado están entregados, y los de un borrador, cobrados'
      using errcode = 'P0001';
  end if;
  return null;
end
$$;

revoke all on function public.leader_deposit_consistency() from public, anon, authenticated, service_role;

create constraint trigger leader_deposit_consistency after update on public.leader_deposit
  deferrable initially deferred
  for each row execute function public.leader_deposit_consistency();

-- ─── RLS: cada usuario lee lo suyo; escribir es de las funciones de HU-DIN-04/05/07 ───────────────
alter table public.leader_deposit enable row level security;
create policy leader_deposit_owner_select on public.leader_deposit for select to authenticated
  using (owner_id = (select auth.uid()) and (select public.is_active_user()));
grant select on public.leader_deposit to authenticated;

alter table public.leader_deposit_event enable row level security;
create policy leader_deposit_event_owner_select on public.leader_deposit_event for select to authenticated
  using (owner_id = (select auth.uid()) and (select public.is_active_user()));
grant select on public.leader_deposit_event to authenticated;

alter table public.leader_deposit_counter enable row level security;
create policy leader_deposit_counter_owner_select on public.leader_deposit_counter for select to authenticated
  using (owner_id = (select auth.uid()) and (select public.is_active_user()));
grant select on public.leader_deposit_counter to authenticated;
