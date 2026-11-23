-- Ronda 34 (#41, #43): se entra solo con Google y solo con un correo que el admin autorizó (BR-USR-01, 02, 05, 07).
-- Sin la service_role en el servidor (DEPLOYMENT §2): el admin escribe aquí y el gancho de Auth «antes de crear un
-- usuario» deja pasar solo esos correos. Un correo autorizado que aún no entró está «Pendiente»; al entrar por primera
-- vez, `handle_new_user` le pone su nombre y, si se pidió, el rol admin.

create table public.authorized_email (
  email text primary key check (email = lower(btrim(email)) and email like '%_@_%'),
  full_name text not null check (length(btrim(full_name)) > 0),
  is_admin boolean not null default false,
  authorized_by uuid default auth.uid() references public.profile (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.authorized_email enable row level security;

-- Solo un admin activo ve, autoriza y quita. Quitar solo se puede mientras la persona no haya entrado (Pendiente).
create policy authorized_email_admin_select on public.authorized_email
  for select to authenticated using ((select public.is_admin()));
create policy authorized_email_admin_insert on public.authorized_email
  for insert to authenticated with check ((select public.is_admin()));
create policy authorized_email_admin_delete on public.authorized_email
  for delete to authenticated
  using (
    (select public.is_admin())
    and not exists (select 1 from public.profile p where lower(p.email) = authorized_email.email)
  );

grant select, insert, delete on public.authorized_email to authenticated;

-- Gancho de Auth «antes de crear un usuario» (se activa en Supabase → Authentication → Hooks; ver DEPLOYMENT §5.6):
-- un correo que el admin no autorizó no crea cuenta y Google muestra el mensaje.
create function public.hook_before_user_created(event jsonb) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(event -> 'user' ->> 'email'));
begin
  if v_email is not null and exists (select 1 from public.authorized_email a where a.email = v_email) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object(
    'error', jsonb_build_object('http_code', 403, 'message', 'Este correo no tiene acceso a Colportor.')
  );
end
$$;

revoke all on function public.hook_before_user_created(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;
grant usage on schema public to supabase_auth_admin;
grant select on public.authorized_email to supabase_auth_admin;
create policy authorized_email_auth_admin_select on public.authorized_email
  for select to supabase_auth_admin using (true);

-- El perfil toma el nombre que puso el admin y, si lo pidió, el rol admin (BR-USR-03).
create or replace function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_authorized public.authorized_email%rowtype;
begin
  select * into v_authorized from public.authorized_email a where a.email = lower(btrim(new.email));
  insert into public.profile (id, full_name, email)
  values (
    new.id,
    coalesce(
      nullif(trim(v_authorized.full_name), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      new.email,
      'Sin nombre'
    ),
    new.email
  );
  insert into public.user_role (user_id, role) values (new.id, 'colportor');
  if v_authorized.is_admin then
    insert into public.user_role (user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  return new;
end
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated, service_role;

-- Admin · Usuarios (BR-USR-07): todos los usuarios con su estado. «pending» = autorizado y aún no entra.
create function public.admin_users()
returns table (
  user_id uuid,
  email text,
  full_name text,
  is_admin boolean,
  status text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.email,
    p.full_name,
    exists (select 1 from public.user_role r where r.user_id = p.id and r.role = 'admin'),
    case when p.is_active then 'active' else 'inactive' end,
    p.created_at
  from public.profile p
  where (select public.is_admin())
  union all
  select null, a.email, a.full_name, a.is_admin, 'pending', a.created_at
  from public.authorized_email a
  where (select public.is_admin())
    and not exists (select 1 from public.profile p where lower(p.email) = a.email)
  order by 3
$$;

revoke all on function public.admin_users() from public, anon, authenticated, service_role;
grant execute on function public.admin_users() to authenticated;

-- Desactivar o reactivar (BR-USR-07): sin acceso a sus datos (RLS con is_active_user) y sus datos se conservan.
-- Un admin no se desactiva a sí mismo (quedaría sin nadie que lo reactive).
create function public.admin_set_user_active(p_user_id uuid, p_active boolean) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select public.is_admin()) then
    raise exception 'FORBIDDEN: solo un admin' using errcode = 'P0001';
  end if;
  if p_user_id = auth.uid() and not p_active then
    raise exception 'VALIDATION: no puedes desactivarte a ti mismo' using errcode = 'P0001', detail = 'self';
  end if;
  update public.profile set is_active = p_active where id = p_user_id;
  if not found then
    raise exception 'NOT_FOUND: no existe ese usuario' using errcode = 'P0001';
  end if;
end
$$;

revoke all on function public.admin_set_user_active(uuid, boolean) from public, anon, authenticated, service_role;
grant execute on function public.admin_set_user_active(uuid, boolean) to authenticated;
