-- Ajustes (versión mínima, 2026-11-20, decisión del dueño): cada usuario elige su formato de hora (BR-GEN-07).
-- El perfil sigue sin `update` por la API (el nombre y la cuenta los administra el admin): solo esta función cambia
-- `time_format`, y solo el del propio usuario activo. Errores (P0001): FORBIDDEN (sin sesión o desactivado).
create function public.update_my_time_format(p_time_format public.time_format)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := public.require_active_user();
begin
  update public.profile set time_format = p_time_format where id = v_user;
end
$$;

revoke all on function public.update_my_time_format(public.time_format) from public, anon, authenticated, service_role;
grant execute on function public.update_my_time_format(public.time_format) to authenticated;
