-- HU-BASE-03 · Al crearse un usuario en Auth se crean su perfil y su rol `colportor`
-- en la misma transacción (BR-USR-03, R2).

-- El nombre viene en los metadatos (`full_name`: script local o, más adelante, la invitación).
-- Si no viene (usuario creado a mano en el panel de Supabase), se usa el correo para no bloquear el alta.
create function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profile (id, full_name, email)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), new.email, 'Sin nombre'),
    new.email
  );
  insert into public.user_role (user_id, role) values (new.id, 'colportor');
  return new;
end
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated, service_role;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- scripts/create-user.ts (solo en la máquina del dueño) lee el perfil creado y asigna el rol admin.
-- La service_role salta RLS, pero sin estos GRANT no llega a las tablas (HU-BASE-02 R6).
grant select on public.profile to service_role;
grant select, insert on public.user_role to service_role;
