# Base de datos (borrador de esquema y seguridad)

> **Estado: BORRADOR de diseño.** Sirve de punto de partida para las migraciones de Supabase CLI (`supabase/migrations/`). El siguiente agente debe convertirlo en migraciones reales, revisarlo, y **probar las políticas RLS** (ver `03-arquitectura/TESTING.md`). Nombres y tipos son normativos; el SQL exacto no lo es.

Convenciones: `snake_case`, tablas en singular, enums de Postgres, todos los timestamps `timestamptz`, zona de negocio America/Bogota (se aplica en consultas/dominio; el servidor guarda UTC).

## Enums

```sql
create type app_role         as enum ('colportor','admin','leader');
create type title_category   as enum ('cultural','religious','minibook');
create type copy_status      as enum ('in_stock','sold','flagged','lost','returned_to_leader');
create type payment_kind     as enum ('down_payment','scheduled','extra');
create type payment_status   as enum ('scheduled','collected','delivered','canceled');
create type cancel_reason    as enum ('book_returned','overpaid','manual','customer_archived');
create type time_format      as enum ('12h','24h');
create type pay_method       as enum ('cash','transfer');
create type deposit_status   as enum ('draft','confirmed');
create type visit_status     as enum ('pending','done','canceled');
create type reminder_kind    as enum ('start_of_day','one_day_before','one_week_before','custom');
create type photo_kind       as enum ('customer_info','customer_invoice','deposit_receipt');
create type issue_resolution as enum ('found','lost','removed');
create type minibook_source  as enum ('cash','client_credit');
```

## Esquema (resumen ejecutable)

```sql
-- Utilidades
create function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create function is_admin() returns boolean language sql stable security definer as $$
  select exists (select 1 from user_role where user_id = auth.uid() and role = 'admin');
$$;

create table profile (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  email text,
  time_format time_format not null default '12h',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Trigger sobre auth.users: al aceptar una invitación crea profile + user_role('colportor').

create table user_role (
  user_id uuid references profile on delete cascade,
  role app_role not null,
  primary key (user_id, role)
);

create table app_settings (
  id smallint primary key default 1 check (id = 1),
  bonus_goal integer not null default 4000000 check (bonus_goal > 0),
  max_favorites smallint not null default 6 check (max_favorites > 0)
);
insert into app_settings default values;

create table title (
  id uuid primary key,
  name text not null,
  image_path text,
  author text,
  description text,
  public_price integer,
  colportor_price integer not null check (colportor_price >= 0),
  category title_category not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (category = 'minibook' or public_price > 0)
);

create table customer (
  id uuid primary key,
  owner_id uuid not null references auth.users,
  name text not null,
  phone text,
  info text,
  address text,
  avatar_emoji text check (char_length(avatar_emoji) <= 16),   -- un solo emoji; validación fina en el dominio (BR-CUS-15)
  maps_url text,
  latitude numeric(9,6) check (latitude between -90 and 90),
  longitude numeric(9,6) check (longitude between -180 and 180),
  location_accuracy_m integer check (location_accuracy_m >= 0),
  check ((latitude is null) = (longitude is null)),   -- ambas o ninguna (BR-CUS-08)
  archived_at timestamptz,            -- archivar (BR-CUS-09); distinto de deleted_at
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz              -- también "Descartar" un cliente recién creado (BR-CUS-14); sin campo de "guardado" (ADR-0038)
);

create table leader_deposit (
  id uuid primary key,
  owner_id uuid not null references auth.users,
  title text not null,
  deposit_date date not null,
  cash_amount integer not null default 0 check (cash_amount >= 0),
  transfer_amount integer not null default 0 check (transfer_amount >= 0),
  note text,
  status deposit_status not null default 'draft',
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table minibook_sale (
  id uuid primary key,
  owner_id uuid not null references auth.users,
  title_id uuid not null references title,
  quantity integer not null check (quantity >= 1),
  amount integer not null check (amount >= 0),
  method pay_method not null,
  payment_source minibook_source not null default 'cash',
  customer_id uuid references customer,
  sold_at date not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (payment_source <> 'client_credit' or customer_id is not null)
);

create table copy (
  id uuid primary key,
  owner_id uuid not null references auth.users,
  title_id uuid not null references title,
  number integer not null,
  status copy_status not null default 'in_stock',
  customer_id uuid references customer,
  minibook_sale_id uuid references minibook_sale,
  agreed_price integer check (agreed_price >= 0),
  public_price_snapshot integer,
  colportor_price_snapshot integer not null,
  received_at date not null default (now() at time zone 'America/Bogota')::date,  -- editable (BR-COPY-04); validar <= hoy y <= sold_at en dominio/trigger
  sold_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (owner_id, title_id, number),
  check (status = 'sold' or (customer_id is null and agreed_price is null and sold_at is null and minibook_sale_id is null)),
  check (customer_id is null or status = 'sold')
);
create index on copy (owner_id, status);
create index on copy (owner_id, title_id, status);
create index on copy (customer_id);

create table copy_counter (           -- numeración consecutiva sin reutilizar
  owner_id uuid, title_id uuid, last_number integer not null default 0,
  primary key (owner_id, title_id)
);

create table copy_event (
  id uuid primary key, owner_id uuid not null, copy_id uuid not null references copy,
  type text not null, data jsonb, at timestamptz not null default now()
);

create table copy_issue (
  id uuid primary key, owner_id uuid not null, copy_id uuid not null references copy,
  note text not null, resolution issue_resolution, resolution_note text, resolved_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index copy_issue_one_open on copy_issue (copy_id) where resolved_at is null;

create table payment (
  id uuid primary key,
  owner_id uuid not null references auth.users,
  customer_id uuid not null references customer,
  kind payment_kind not null,
  status payment_status not null,
  original_due_date date,
  due_date date,
  paid_at date,
  agreed_amount integer check (agreed_amount > 0),
  paid_amount integer check (paid_amount > 0),
  method pay_method,
  leader_deposit_id uuid references leader_deposit,
  canceled_at timestamptz,
  cancel_reason cancel_reason,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (status in ('scheduled','canceled') or (paid_amount is not null and paid_at is not null and method is not null)),
  check (status not in ('scheduled','canceled') or (kind = 'scheduled' and agreed_amount is not null and due_date is not null and original_due_date is not null)),
  check (status <> 'canceled' or (canceled_at is not null and cancel_reason is not null))
);
create index on payment (owner_id, status, due_date);
create index on payment (customer_id);

create table payment_reschedule (
  id uuid primary key, owner_id uuid not null,
  payment_id uuid not null references payment,
  previous_due_date date not null, new_due_date date not null,
  changed_at timestamptz not null default now(), note text
);

create table payment_event (            -- solo inserción: recortes y cancelaciones (BR-PAY-13), reaperturas
  id uuid primary key, owner_id uuid not null,
  payment_id uuid not null references payment,
  type text not null check (type in ('amount_reduced','canceled','reopened')),
  data jsonb, at timestamptz not null default now()
);

create table leader_deposit_event (     -- solo inserción: confirmaciones y reaperturas (BR-DEP-12)
  id uuid primary key, owner_id uuid not null,
  leader_deposit_id uuid not null references leader_deposit,
  type text not null check (type in ('confirmed','reopened')),
  reason text,                          -- obligatorio en 'reopened'
  at timestamptz not null default now(),
  check (type <> 'reopened' or reason is not null)
);

create table leader_deposit_minibook_allocation (
  leader_deposit_id uuid references leader_deposit,
  minibook_sale_id uuid references minibook_sale,
  owner_id uuid not null,
  amount integer not null check (amount > 0),
  primary key (leader_deposit_id, minibook_sale_id)
);

create table visit (
  id uuid primary key, owner_id uuid not null references auth.users,
  customer_id uuid references customer, label text,
  scheduled_date date not null, scheduled_time time,
  note text, status visit_status not null default 'pending',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  check (customer_id is not null or label is not null)
);

create table training (
  id uuid primary key, owner_id uuid not null references auth.users,
  title text not null, place text, scheduled_at timestamptz not null, note text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);

create table reminder (
  id uuid primary key, owner_id uuid not null references auth.users,
  target_type text not null check (target_type in ('visit','training')),
  target_id uuid not null,
  kind reminder_kind not null, custom_minutes_before integer check (custom_minutes_before > 0),
  dismissed_at timestamptz,
  check (kind <> 'custom' or custom_minutes_before is not null)
);

create table title_favorite (
  owner_id uuid references auth.users, title_id uuid references title,
  primary key (owner_id, title_id)
);

create table photo (
  id uuid primary key, owner_id uuid not null references auth.users,
  kind photo_kind not null,
  customer_id uuid references customer, leader_deposit_id uuid references leader_deposit,
  path text not null, thumb_path text, bytes integer,
  invoice_number text, invoice_date date,   -- solo kind = 'customer_invoice' (BR-CUS-17)
  created_at timestamptz not null default now(), deleted_at timestamptz,
  check ((kind = 'deposit_receipt') = (leader_deposit_id is not null)),
  check ((kind <> 'deposit_receipt') = (customer_id is not null)),
  check (kind = 'customer_invoice' or (invoice_number is null and invoice_date is null))
);
```

Cambios respecto a la primera versión del borrador (por si el agente anterior ya generó migraciones): `copy_status` suma `returned_to_leader`; `payment_status` suma `canceled` (+ `canceled_at`, `cancel_reason`); `issue_resolution` pasa de `corrected` a `removed`; `customer.archived_at`; `profile.time_format` e `is_active`; `copy.received_at` es `date`; tablas nuevas `payment_event` y `leader_deposit_event`.

Triggers `set_updated_at` en todas las tablas con `updated_at`. Triggers/funciones de servicio adicionales:
- Asignar `copy.number` desde `copy_counter` (transaccional).
- Bloquear UPDATE/DELETE de `payment` con `status = 'delivered'` y de `leader_deposit` con `status = 'confirmed'` (salvo `note` y alta de fotos), excepto mediante `reopen_leader_deposit`.
- Confirmar un Abibono: función `confirm_leader_deposit(id)` que valida recibo, total > 0, nota si hay diferencia, y marca los abonos `delivered` **en una sola transacción**.
- `reopen_leader_deposit(id, reason)`: exige motivo, devuelve el Abibono a `draft` y los abonos a `collected`, y registra `leader_deposit_event` + `payment_event`.
- `return_copy(id, reason)`: aplica BR-COPY-09 (conserva `received_at`) y registra el evento; el recorte de abonos programados lo confirma el usuario con `resolve_schedule_excess(customer_id, plan)` (cancela/reduce y registra `payment_event`).
- `return_copies_to_leader(ids[], note)` y su deshacer.
- Validar en trigger: `copy.received_at <= hoy` y `<= sold_at::date`; `payment.paid_at <= hoy`; `minibook_sale.amount <= saldo a favor` cuando `payment_source = 'client_credit'`.
- Filtrar en toda consulta de listas: `deleted_at is null` y (para clientes) `archived_at is null` salvo la vista Archivados.
- Vender minibooks: función `record_minibook_sale(...)` que consume stock FIFO y valida disponibilidad.
- Mantener límite de `title_favorite` ≤ `app_settings.max_favorites`.

## Seguridad (RLS)

```sql
-- patrón para tablas con owner_id (customer, copy, payment, leader_deposit, minibook_sale, visit, training, reminder, photo, copy_event, copy_issue, ...)
alter table customer enable row level security;
create policy "owner all" on customer for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- title: lectura para autenticados, escritura solo admin
alter table title enable row level security;
create policy "read titles"  on title for select to authenticated using (true);
create policy "admin write"  on title for all    to authenticated using (is_admin()) with check (is_admin());

-- app_settings: lectura autenticados, escritura admin
-- profile / user_role: cada quien lee lo suyo; admin lee todos los profile y gestiona user_role
```

Reglas: nunca desactivar RLS en tablas con datos de usuario; la `service_role key` solo se usa en servidor (scripts y rutas de admin), **jamás** en el cliente. Storage: políticas por prefijo `owner_id/` (ver `03-arquitectura/SECURITY.md`).

## Vistas útiles (opcionales; el dominio TS es la fuente de la lógica)

`customer_balance_v` (debt, paid_total, credit_applied, balance por cliente), `copy_stock_v` (conteo por título y estado), `deposit_summary_v` (total, expected, difference). Si una vista y el dominio discrepan, **gana el dominio** y se corrige la vista.

## Storage (Supabase)

| Bucket | Acceso | Contenido |
|---|---|---|
| `title-images` | lectura pública, escritura admin | portadas |
| `user-photos` | privado, políticas por `owner_id/` | fotos de cliente, facturas, recibos (+ miniaturas) |
