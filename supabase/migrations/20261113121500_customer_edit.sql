-- HU-CLI-02 · Crear y editar un cliente (ficha viva). BR-CUS-01/11/14/15/16, ADR-0037, ADR-0038.
-- El usuario crea y edita su cliente directo por la API (RLS de HU-CLI-01); la base refuerza lo que
-- protege a otros: el enlace de Maps (SECURITY.md) y que un archivado no se edite (R6).

-- R3: el enlace de Maps solo se usa en un href; se limita a https y a los dominios de Google Maps.
-- La MISMA regla que isValidMapsUrl (src/domain/customer-data.ts); tests/rls/customer-edit.test.ts las compara.
alter table public.customer
  add constraint customer_maps_url_allowed check (
    maps_url is null or (
      maps_url !~ '\s'
      and maps_url ~ '^https://((www\.)?google\.com/maps([/?#]|$)|maps\.google\.com([/?#]|$)|maps\.app\.goo\.gl([/?#]|$))'
    )
  );

-- R6: un cliente archivado no se edita hasta restaurarlo (archived_at = null). Restaurar, y los cambios
-- de la "última modificación" que hagan otras funciones, sí se permiten.
create function public.customer_guard_archived() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.archived_at is not null and new.archived_at is not null
     and (new.name, new.phone, new.info, new.address, new.avatar_emoji, new.maps_url, new.latitude, new.longitude,
          new.location_accuracy_m, new.deleted_at)
         is distinct from
         (old.name, old.phone, old.info, old.address, old.avatar_emoji, old.maps_url, old.latitude, old.longitude,
          old.location_accuracy_m, old.deleted_at) then
    raise exception 'CUSTOMER_ARCHIVED: un cliente archivado no se edita hasta restaurarlo' using errcode = 'P0001';
  end if;
  return new;
end
$$;

create trigger customer_guard_archived before update on public.customer
  for each row execute function public.customer_guard_archived();
