-- HU-CLI-01 · Cliente (agregado raíz, ADR-0005). Solo datos del cliente: deuda, saldo, estado, prospecto
-- y demás se DERIVAN en el dominio (computeCustomerAccount) y nunca se guardan (BR-GEN-03, R1).

create table public.customer (
  id uuid primary key,                                         -- lo genera el cliente (BR-GEN-04)
  owner_id uuid not null default auth.uid() references auth.users,
  name text not null check (btrim(name) <> ''),                -- R5: obligatorio y no vacío (BR-CUS-01)
  phone text,
  info text,
  address text,
  avatar_emoji text check (char_length(avatar_emoji) <= 16),   -- un solo emoji; validación fina en el dominio (BR-CUS-15)
  maps_url text,
  latitude numeric(9, 6) check (latitude between -90 and 90),
  longitude numeric(9, 6) check (longitude between -180 and 180),
  location_accuracy_m integer check (location_accuracy_m >= 0),
  archived_at timestamptz,                                     -- archivar (BR-CUS-09); distinto de deleted_at
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),               -- "Última modificación" (BR-CUS-16)
  deleted_at timestamptz,                                      -- borrado lógico, también "Descartar" (BR-CUS-14)
  constraint customer_coordinates_together check ((latitude is null) = (longitude is null))  -- BR-CUS-08
);

create trigger customer_set_updated_at before update on public.customer
  for each row execute function public.set_updated_at();

create index customer_owner_idx on public.customer (owner_id) where deleted_at is null;

alter table public.customer enable row level security;
create policy customer_owner on public.customer for all to authenticated
  using (owner_id = (select auth.uid()) and (select public.is_active_user()))
  with check (owner_id = (select auth.uid()) and (select public.is_active_user()));
-- Sin DELETE: borrar y descartar son lógicos (BR-GEN-02).
grant select, insert, update on public.customer to authenticated;
