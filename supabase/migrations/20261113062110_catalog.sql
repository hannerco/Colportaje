-- HU-BASE-04 · Catálogo de títulos (compartido, sin owner_id) y bucket de portadas.
-- BR-TIT-01..07, ADR-0007, DATABASE.md.

create table public.title (
  id uuid primary key,                 -- estable: lo trae el archivo del catálogo (recargar actualiza, no duplica)
  name text not null check (btrim(name) <> ''),
  image_path text,                     -- ruta en el bucket title-images (DT-10); opcional hasta diseñar Admin
  author text,
  description text,
  public_price integer,
  colportor_price integer not null check (colportor_price >= 0),
  category public.title_category not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- BR-TIT-04. Ojo: "public_price > 0" solo no basta, porque con NULL el check no falla.
  constraint title_public_price_required check (
    category = 'minibook' or (public_price is not null and public_price > 0)
  ),
  constraint title_public_price_positive check (public_price is null or public_price > 0)
);

create trigger title_set_updated_at before update on public.title
  for each row execute function public.set_updated_at();

-- BR-TIT-01: lo leen los usuarios autenticados y activos; solo el admin lo escribe.
-- BR-TIT-03: un título no se borra (se desactiva): nadie tiene permiso de DELETE.
alter table public.title enable row level security;
create policy title_select on public.title for select to authenticated
  using ((select public.is_active_user()));
create policy title_admin_insert on public.title for insert to authenticated
  with check ((select public.is_admin()));
create policy title_admin_update on public.title for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
grant select, insert, update on public.title to authenticated;
-- scripts/load-catalog.ts (máquina del dueño) hace upsert con la service_role.
grant select, insert, update on public.title to service_role;

-- Portadas (DT-10): lectura pública, escritura solo admin (SECURITY.md).
insert into storage.buckets (id, name, public)
values ('title-images', 'title-images', true)
on conflict (id) do nothing;

create policy title_images_public_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'title-images');
create policy title_images_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'title-images' and (select public.is_admin()));
create policy title_images_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'title-images' and (select public.is_admin()))
  with check (bucket_id = 'title-images' and (select public.is_admin()));
create policy title_images_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'title-images' and (select public.is_admin()));
