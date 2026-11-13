-- HU-INV-01 · Ejemplar: tabla, numeración, transiciones e historial. BR-COPY-*, BR-AUD-01, ADR-0008/0023/0043.
-- Las acciones (agregar, vender, novedades, eliminar, devolver al líder) llegan con sus HU como funciones
-- SQL; aquí está lo que todas comparten. El usuario solo LEE estas tablas por la API.

-- Para claves foráneas compuestas: un ejemplar solo apunta a clientes de su mismo dueño.
alter table public.customer add constraint customer_id_owner_key unique (id, owner_id);

-- ─── copy ─────────────────────────────────────────────────────────────────────────────────────────
-- Sin minibook_sale_id: llega con el módulo Minibooks (ADR-0041).
create table public.copy (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users,
  title_id uuid not null references public.title,
  number integer not null check (number >= 1),          -- lo asigna el trigger copy_assign_number (R1)
  status public.copy_status not null default 'in_stock',
  customer_id uuid,
  agreed_price integer check (agreed_price >= 0),
  public_price_snapshot integer check (public_price_snapshot > 0),
  colportor_price_snapshot integer not null check (colportor_price_snapshot >= 0),
  received_at date not null default public.today_bogota(),
  sold_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,                              -- borrado lógico; el número sigue ocupado (R5)
  constraint copy_owner_title_number_key unique (owner_id, title_id, number),
  constraint copy_id_owner_key unique (id, owner_id),
  constraint copy_customer_same_owner foreign key (customer_id, owner_id) references public.customer (id, owner_id),
  -- R2 / BR-COPY-08: sin vender no hay cliente, precio acordado ni fecha de venta.
  constraint copy_unsold_has_no_sale check (
    status = 'sold' or (customer_id is null and agreed_price is null and sold_at is null)
  ),
  constraint copy_customer_only_when_sold check (customer_id is null or status = 'sold'),
  -- Vendido a un cliente: con precio acordado y fecha (las ventas de minibooks sin cliente llegan con su módulo).
  constraint copy_customer_sale_complete check (
    customer_id is null or (agreed_price is not null and sold_at is not null)
  )
);

create index copy_owner_status_idx on public.copy (owner_id, status);
create index copy_owner_title_status_idx on public.copy (owner_id, title_id, status);
create index copy_customer_idx on public.copy (customer_id);

create trigger copy_set_updated_at before update on public.copy
  for each row execute function public.set_updated_at();

-- ─── Numeración (R1, BR-COPY-05, ADR-0023) ─────────────────────────────────────────────────────────
create table public.copy_counter (
  owner_id uuid not null references auth.users,
  title_id uuid not null references public.title,
  last_number integer not null default 0,
  primary key (owner_id, title_id)
);

-- Siguiente número del (usuario, título). El upsert bloquea la fila del contador hasta el final de la
-- transacción: dos inserciones simultáneas nunca obtienen el mismo número, y nada se reutiliza.
create function public.next_copy_number(p_owner uuid, p_title uuid) returns integer
language sql
volatile
security definer
set search_path = ''
as $$
  insert into public.copy_counter as c (owner_id, title_id, last_number)
  values (p_owner, p_title, 1)
  on conflict (owner_id, title_id) do update set last_number = c.last_number + 1
  returning c.last_number
$$;

-- Solo la usan las funciones y triggers de la base: nadie la llama por la API (podría saltar números ajenos).
revoke all on function public.next_copy_number(uuid, uuid) from public, anon, authenticated, service_role;

-- El número siempre lo asigna la base, aunque el cliente envíe otro.
create function public.copy_assign_number() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.number := public.next_copy_number(new.owner_id, new.title_id);
  return new;
end
$$;

revoke all on function public.copy_assign_number() from public, anon, authenticated, service_role;

create trigger copy_assign_number before insert on public.copy
  for each row execute function public.copy_assign_number();

-- ─── Transiciones (R3): la MISMA tabla que COPY_TRANSITIONS en src/domain/copy.ts ──────────────────
-- Refuerza en la base lo que protege el dinero; tests/rls/copy.test.ts verifica que coincidan.
create function public.copy_guard_update() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.owner_id <> old.owner_id or new.title_id <> old.title_id or new.number <> old.number
     or new.public_price_snapshot is distinct from old.public_price_snapshot
     or new.colportor_price_snapshot <> old.colportor_price_snapshot then
    raise exception 'INVALID_TRANSITION: dueño, título, número y precios copiados no cambian (BR-COPY-03/05)'
      using errcode = 'P0001';
  end if;

  if old.deleted_at is not null then
    -- Eliminado: solo se permite deshacer la eliminación, sin cambiar nada más.
    if new.deleted_at is not null or new.status <> old.status then
      raise exception 'INVALID_TRANSITION: un ejemplar eliminado solo admite deshacer' using errcode = 'P0001';
    end if;
    return new;
  end if;

  if new.deleted_at is not null then
    -- Eliminar: desde En físico (BR-COPY-17) o desde una novedad (BR-COPY-11), sin cambiar el estado.
    if old.status not in ('in_stock', 'flagged') or new.status <> old.status then
      raise exception 'INVALID_TRANSITION: % no se puede eliminar', old.status using errcode = 'P0001';
    end if;
    return new;
  end if;

  if new.status <> old.status and (old.status, new.status) not in (
    ('in_stock', 'sold'), ('sold', 'in_stock'),
    ('in_stock', 'flagged'), ('flagged', 'in_stock'), ('flagged', 'lost'), ('lost', 'flagged'),
    ('in_stock', 'returned_to_leader'), ('returned_to_leader', 'in_stock')
  ) then
    raise exception 'INVALID_TRANSITION: % → %', old.status, new.status using errcode = 'P0001';
  end if;
  return new;
end
$$;

create trigger copy_guard_update before update on public.copy
  for each row execute function public.copy_guard_update();

-- ─── Historial (R4, BR-AUD-01): solo inserción, escrito por trigger en la misma transacción ─────────
create type public.copy_event_type as enum (
  'received', 'sold', 'returned', 'flagged', 'resolved', 'undo_resolved', 'deleted', 'undo_deleted',
  'price_changed', 'received_date_changed', 'minibook_sold', 'returned_to_leader', 'undo_returned_to_leader'
);

create table public.copy_event (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity,             -- orden determinista dentro de una transacción
  owner_id uuid not null,
  copy_id uuid not null,
  type public.copy_event_type not null,
  note text,
  data jsonb not null default '{}'::jsonb,
  at timestamptz not null default clock_timestamp(),
  constraint copy_event_copy_same_owner foreign key (copy_id, owner_id) references public.copy (id, owner_id)
);

create index copy_event_copy_idx on public.copy_event (copy_id, seq desc);

-- Contexto que la función que hace el cambio deja para el trigger (motivo, nota, tipo de evento):
--   select set_config('colportor.copy_event', '{"type":"returned","reason":"customer_returned","note":"…"}', true);
-- "type" solo hace falta cuando el cambio de estado es ambiguo (p. ej. deshacer Apareció o una novedad eliminada).
create function public.copy_write_events() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ctx jsonb := coalesce(nullif(current_setting('colportor.copy_event', true), '')::jsonb, '{}'::jsonb);
  ctx_note text := ctx ->> 'note';
  ctx_data jsonb := ctx - 'type' - 'note';
  state_type public.copy_event_type;
begin
  if tg_op = 'INSERT' then
    insert into public.copy_event (owner_id, copy_id, type, note, data)
    values (new.owner_id, new.id, 'received', ctx_note, jsonb_build_object('receivedAt', new.received_at));
    return new;
  end if;

  -- Eliminar / deshacer eliminar.
  if old.deleted_at is null and new.deleted_at is not null then
    insert into public.copy_event (owner_id, copy_id, type, note, data)
    values (new.owner_id, new.id, coalesce((ctx ->> 'type')::public.copy_event_type, 'deleted'), ctx_note,
            ctx_data || jsonb_build_object('previousStatus', old.status));
  elsif old.deleted_at is not null and new.deleted_at is null then
    insert into public.copy_event (owner_id, copy_id, type, note, data)
    values (new.owner_id, new.id, 'undo_deleted', ctx_note, ctx_data || jsonb_build_object('status', new.status));
  end if;

  -- Cambio de estado.
  if new.status <> old.status then
    state_type := coalesce(
      (ctx ->> 'type')::public.copy_event_type,
      case
        when old.status = 'in_stock' and new.status = 'sold' then 'sold'
        when old.status = 'sold' and new.status = 'in_stock' then 'returned'
        when old.status = 'in_stock' and new.status = 'flagged' then 'flagged'
        when old.status = 'flagged' and new.status in ('in_stock', 'lost') then 'resolved'
        when old.status = 'lost' and new.status = 'flagged' then 'undo_resolved'
        when old.status = 'in_stock' and new.status = 'returned_to_leader' then 'returned_to_leader'
        when old.status = 'returned_to_leader' and new.status = 'in_stock' then 'undo_returned_to_leader'
      end::public.copy_event_type
    );
    insert into public.copy_event (owner_id, copy_id, type, note, data)
    values (
      new.owner_id, new.id, state_type, ctx_note,
      ctx_data
        || case when new.status = 'sold'
             then jsonb_build_object('customerId', new.customer_id, 'agreedPrice', new.agreed_price)
             else '{}'::jsonb end
        || case when old.status = 'flagged' and new.status = 'in_stock' and not ctx ? 'resolution'
             then jsonb_build_object('resolution', 'found')
             when old.status = 'flagged' and new.status = 'lost' and not ctx ? 'resolution'
             then jsonb_build_object('resolution', 'lost')
             else '{}'::jsonb end
    );
  elsif new.status = 'sold' and new.agreed_price is distinct from old.agreed_price then
    -- Precio acordado de un ejemplar ya vendido (BR-COPY-07).
    insert into public.copy_event (owner_id, copy_id, type, note, data)
    values (new.owner_id, new.id, 'price_changed', ctx_note,
            jsonb_build_object('oldPrice', old.agreed_price, 'newPrice', new.agreed_price));
  end if;

  -- Fecha de recibido (BR-COPY-04).
  if new.received_at <> old.received_at then
    insert into public.copy_event (owner_id, copy_id, type, note, data)
    values (new.owner_id, new.id, 'received_date_changed', ctx_note,
            jsonb_build_object('oldDate', old.received_at, 'newDate', new.received_at));
  end if;
  return new;
end
$$;

revoke all on function public.copy_write_events() from public, anon, authenticated, service_role;

create trigger copy_write_events after insert or update on public.copy
  for each row execute function public.copy_write_events();

-- ─── Novedades (BR-COPY-10/11) ─────────────────────────────────────────────────────────────────────
create table public.copy_issue (
  id uuid primary key,
  owner_id uuid not null default auth.uid(),
  copy_id uuid not null,
  note text not null check (btrim(note) <> ''),         -- nota obligatoria al marcar (BR-COPY-10)
  resolution public.issue_resolution,
  resolution_note text,                                 -- opcional (BR-COPY-11)
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint copy_issue_copy_same_owner foreign key (copy_id, owner_id) references public.copy (id, owner_id),
  constraint copy_issue_resolution_complete check ((resolution is null) = (resolved_at is null))
);

-- R6: como máximo una novedad abierta por ejemplar.
create unique index copy_issue_one_open on public.copy_issue (copy_id) where resolved_at is null;

create trigger copy_issue_set_updated_at before update on public.copy_issue
  for each row execute function public.set_updated_at();

-- ─── RLS: cada usuario lee lo suyo; escribir es de las funciones de cada HU ────────────────────────
alter table public.copy enable row level security;
create policy copy_owner_select on public.copy for select to authenticated
  using (owner_id = (select auth.uid()) and (select public.is_active_user()));
grant select on public.copy to authenticated;

alter table public.copy_counter enable row level security;
create policy copy_counter_owner_select on public.copy_counter for select to authenticated
  using (owner_id = (select auth.uid()) and (select public.is_active_user()));
grant select on public.copy_counter to authenticated;

alter table public.copy_event enable row level security;
create policy copy_event_owner_select on public.copy_event for select to authenticated
  using (owner_id = (select auth.uid()) and (select public.is_active_user()));
grant select on public.copy_event to authenticated;

alter table public.copy_issue enable row level security;
create policy copy_issue_owner_select on public.copy_issue for select to authenticated
  using (owner_id = (select auth.uid()) and (select public.is_active_user()));
grant select on public.copy_issue to authenticated;
