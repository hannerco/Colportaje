-- HU-BASE-02 · Base común: privilegios, enums, utilidades, perfil, roles y ajustes.
-- Nombres y tipos: docs/02-datos/DATABASE.md. Seguridad: docs/03-arquitectura/SECURITY.md.
--
-- PATRÓN OBLIGATORIO para toda tabla de negocio (lo siguen las HU siguientes, cada una en su migración):
--
--   create table public.<tabla> (
--     id uuid primary key,                                   -- lo genera el cliente (BR-GEN-04)
--     owner_id uuid not null default auth.uid() references auth.users,
--     ...,
--     created_at timestamptz not null default now(),
--     updated_at timestamptz not null default now(),
--     deleted_at timestamptz                                 -- borrado lógico (BR-GEN-02)
--   );
--   create trigger <tabla>_set_updated_at before update on public.<tabla>
--     for each row execute function public.set_updated_at();
--   alter table public.<tabla> enable row level security;
--   create policy <tabla>_owner on public.<tabla> for all to authenticated
--     using (owner_id = (select auth.uid()) and (select public.is_active_user()))
--     with check (owner_id = (select auth.uid()) and (select public.is_active_user()));
--   grant select, insert, update, delete on public.<tabla> to authenticated;   -- nunca a anon
--
-- tests/rls/owner-tables.test.ts recorre sola toda tabla con owner_id y falla si le falta algo de esto.

-- ─── 1. Privilegios por defecto (R6) ──────────────────────────────────────────────────────────────
-- Como en la nube ("Automatically expose new tables" desactivado): una tabla, secuencia o función nueva
-- no es accesible por la API hasta que su migración otorga permisos explícitos.
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke all on functions from public, anon, authenticated, service_role;

-- ─── 2. Enums de la primera entrega (ADR-0041: los de visitas, recordatorios y minibooks llegan con sus módulos) ──
create type public.app_role as enum ('colportor', 'admin', 'leader');
create type public.title_category as enum ('cultural', 'religious', 'minibook');
create type public.copy_status as enum ('in_stock', 'sold', 'flagged', 'lost', 'returned_to_leader');
create type public.payment_kind as enum ('down_payment', 'scheduled', 'extra');
create type public.payment_status as enum ('scheduled', 'collected', 'delivered', 'canceled');
create type public.cancel_reason as enum ('book_returned', 'overpaid', 'manual', 'customer_archived');
create type public.time_format as enum ('12h', '24h');
create type public.pay_method as enum ('cash', 'transfer');
create type public.deposit_status as enum ('draft', 'confirmed');
create type public.photo_kind as enum ('customer_info', 'customer_invoice', 'deposit_receipt');
create type public.issue_resolution as enum ('found', 'lost', 'removed');

-- ─── 3. Utilidades sin dependencias ───────────────────────────────────────────────────────────────
create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

-- Fecha de negocio (BR-GEN-05). La zona es la misma de src/domain/config/business-config.ts.
create function public.today_bogota() returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Bogota')::date
$$;

-- ─── 4. Perfil, roles y ajustes ───────────────────────────────────────────────────────────────────
-- El trigger que crea profile + rol 'colportor' al crearse un usuario llega con HU-BASE-03.
create table public.profile (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  email text,
  time_format public.time_format not null default '12h',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profile_set_updated_at before update on public.profile
  for each row execute function public.set_updated_at();

create table public.user_role (
  user_id uuid not null references public.profile on delete cascade,
  role public.app_role not null,
  primary key (user_id, role)
);

create table public.app_settings (
  id smallint primary key default 1 check (id = 1),
  bonus_goal integer not null default 4000000 check (bonus_goal > 0)
);

insert into public.app_settings default values;

-- ─── 5. Funciones de seguridad (usadas en las políticas) ──────────────────────────────────────────
-- security definer: leen profile/user_role sin depender de las políticas de esas tablas.
-- BR-USR-07: un usuario desactivado no lee ni escribe nada de negocio.
create function public.is_active_user() returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.is_active from public.profile p where p.id = auth.uid()), false)
$$;

-- BR-GEN-01: admin no da acceso a datos de negocio ajenos; solo a catálogo, ajustes y usuarios.
-- Un admin desactivado no administra.
create function public.is_admin() returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_active_user()
     and exists (select 1 from public.user_role r where r.user_id = auth.uid() and r.role = 'admin')
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated, service_role;
revoke all on function public.today_bogota() from public, anon, authenticated, service_role;
revoke all on function public.is_active_user() from public, anon, authenticated, service_role;
revoke all on function public.is_admin() from public, anon, authenticated, service_role;
grant execute on function public.today_bogota() to authenticated;
grant execute on function public.is_active_user() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- ─── 6. RLS y permisos ────────────────────────────────────────────────────────────────────────────
-- profile: cada quien lee el suyo (aunque esté desactivado, para saberlo); el admin lee todos.
-- Nadie lo edita por la API todavía (Ajustes y el panel de admin no están diseñados).
alter table public.profile enable row level security;
create policy profile_select on public.profile for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
grant select on public.profile to authenticated;

-- user_role: cada quien lee los suyos; el admin los lee y gestiona todos (R4).
alter table public.user_role enable row level security;
create policy user_role_select on public.user_role for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy user_role_admin_insert on public.user_role for insert to authenticated
  with check ((select public.is_admin()));
create policy user_role_admin_delete on public.user_role for delete to authenticated
  using ((select public.is_admin()));
grant select, insert, delete on public.user_role to authenticated;

-- app_settings: lectura para autenticados; escritura solo admin (R4).
alter table public.app_settings enable row level security;
create policy app_settings_select on public.app_settings for select to authenticated
  using (true);
create policy app_settings_admin_update on public.app_settings for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
grant select, update on public.app_settings to authenticated;
