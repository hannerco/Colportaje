-- HU-BASE-05 · Fotos: tabla photo (columnas comunes) y bucket privado user-photos.
-- BR-PHO-01..04, ADR-0013. Las columnas de vínculo y sus checks por tipo las agregan las HU dueñas
-- con migraciones aditivas (R5): customer_id (HU-CLI-07), invoice_id (HU-CLI-08), leader_deposit_id (HU-DIN-01).

create table public.photo (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users,
  kind public.photo_kind not null,
  path text not null,
  thumb_path text,
  bytes integer not null check (bytes >= 0),   -- archivo + miniatura (uso de almacenamiento, BR-PHO-04)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,                       -- borrado lógico: el archivo se conserva (BR-PHO-03)
  -- BR-PHO-02: la ruta vive bajo la carpeta del dueño y del tipo: {owner_id}/{kind}/...
  constraint photo_path_in_owner_folder check (path like owner_id::text || '/' || kind::text || '/%'),
  constraint photo_thumb_in_owner_folder check (
    thumb_path is null or thumb_path like owner_id::text || '/' || kind::text || '/%'
  )
);

create trigger photo_set_updated_at before update on public.photo
  for each row execute function public.set_updated_at();

alter table public.photo enable row level security;
create policy photo_owner on public.photo for all to authenticated
  using (owner_id = (select auth.uid()) and (select public.is_active_user()))
  with check (owner_id = (select auth.uid()) and (select public.is_active_user()));
-- Sin DELETE: borrar es lógico. La única eliminación física (borrador de Abibono, BR-DEP-10) la hace la función de HU-DIN-04.
grant select, insert, update on public.photo to authenticated;

-- Uso de almacenamiento del usuario actual, incluidas las fotos borradas (sus archivos se conservan).
create function public.photo_total_bytes() returns bigint
language sql
stable
set search_path = ''
as $$
  select coalesce(sum(p.bytes), 0)::bigint from public.photo p
$$;

revoke all on function public.photo_total_bytes() from public, anon, authenticated, service_role;
grant execute on function public.photo_total_bytes() to authenticated;

-- Bucket privado (R2): cada usuario solo lee y escribe bajo {su id}/. Solo WebP comprimido (R1).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('user-photos', 'user-photos', false, 1048576, array['image/webp'])
on conflict (id) do nothing;

create policy user_photos_owner_select on storage.objects for select to authenticated
  using (
    bucket_id = 'user-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_active_user())
  );
create policy user_photos_owner_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'user-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_active_user())
  );
-- UPDATE permite reintentar una subida con la misma ruta sin duplicar (upsert).
create policy user_photos_owner_update on storage.objects for update to authenticated
  using (
    bucket_id = 'user-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_active_user())
  )
  with check (
    bucket_id = 'user-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_active_user())
  );
create policy user_photos_owner_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'user-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_active_user())
  );
