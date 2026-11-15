-- HU-CLI-08 · Facturas. BR-CUS-17, BR-PHO-03, BR-CUS-16, ADR-0042, AF-117, HU-BASE-05 R5.
-- Una factura nace con su primera foto y no existe sin fotos activas (R1). El usuario solo LEE
-- customer_invoice; crear, agregar fotos, editar N.º y fecha, y borrar fotos pasa por estas funciones.

-- ─── customer_invoice ─────────────────────────────────────────────────────────────────────────────
create table public.customer_invoice (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users,
  customer_id uuid not null,
  invoice_number text,                -- opcional; puede repetirse entre facturas (R3)
  invoice_date date,                  -- por defecto el día (Bogotá) de la primera foto; editable o vacía (R2)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint customer_invoice_id_owner_key unique (id, owner_id),
  constraint customer_invoice_customer_same_owner foreign key (customer_id, owner_id)
    references public.customer (id, owner_id)
);

create index customer_invoice_customer_idx on public.customer_invoice (customer_id);

create trigger customer_invoice_set_updated_at before update on public.customer_invoice
  for each row execute function public.set_updated_at();

alter table public.customer_invoice enable row level security;
create policy customer_invoice_owner_select on public.customer_invoice for select to authenticated
  using (owner_id = (select auth.uid()) and (select public.is_active_user()));
-- CA-6: sin INSERT/UPDATE/DELETE por la API; solo las funciones de abajo.
grant select on public.customer_invoice to authenticated;

-- ─── photo.invoice_id (migración aditiva) ─────────────────────────────────────────────────────────
alter table public.photo add column invoice_id uuid;
alter table public.photo
  add constraint photo_invoice_same_owner foreign key (invoice_id, owner_id)
    references public.customer_invoice (id, owner_id);
alter table public.photo
  add constraint photo_invoice_linked check ((kind = 'customer_invoice') = (invoice_id is not null));
create index photo_invoice_idx on public.photo (invoice_id) where invoice_id is not null;

-- Las fotos de factura solo se crean y borran con las funciones (que corren como su dueño, no como
-- `authenticated`): así no queda una factura sin foto ni una foto sin factura (R1, R4).
create function public.photo_invoice_guard() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.kind = 'customer_invoice' or (tg_op = 'UPDATE' and old.kind = 'customer_invoice'))
     and current_user = 'authenticated' then
    raise exception 'INVALID_TRANSITION: las fotos de factura se manejan con sus funciones' using errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE' and new.invoice_id is distinct from old.invoice_id then
    raise exception 'INVALID_TRANSITION: la factura de una foto no cambia' using errcode = 'P0001';
  end if;
  return new;
end
$$;

revoke all on function public.photo_invoice_guard() from public, anon, authenticated, service_role;

create trigger photo_invoice_guard before insert or update on public.photo
  for each row execute function public.photo_invoice_guard();

-- R1: al cerrar la transacción, toda factura activa tiene al menos una foto activa, y toda foto activa de
-- factura pertenece a una factura activa del mismo cliente.
create function public.invoice_photo_consistency() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invoice uuid;
begin
  -- Cada rama solo lee columnas de su propia tabla.
  if tg_table_name = 'customer_invoice' then
    v_invoice := new.id;
  else
    v_invoice := new.invoice_id;
  end if;
  if v_invoice is null then
    return null;
  end if;
  if exists (select 1 from public.customer_invoice i where i.id = v_invoice and i.deleted_at is null)
     and not exists (select 1 from public.photo p where p.invoice_id = v_invoice and p.deleted_at is null) then
    raise exception 'INVOICE_WITHOUT_PHOTO: una factura activa necesita al menos una foto' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.photo p join public.customer_invoice i on i.id = p.invoice_id
    where p.invoice_id = v_invoice and p.deleted_at is null
      and (i.deleted_at is not null or p.customer_id <> i.customer_id)
  ) then
    raise exception 'INVALID_TRANSITION: la foto de factura no coincide con su factura' using errcode = 'P0001';
  end if;
  return null;
end
$$;

revoke all on function public.invoice_photo_consistency() from public, anon, authenticated, service_role;

create constraint trigger customer_invoice_photo_consistency after insert or update on public.customer_invoice
  deferrable initially deferred for each row execute function public.invoice_photo_consistency();
create constraint trigger photo_invoice_consistency after insert or update on public.photo
  deferrable initially deferred for each row execute function public.invoice_photo_consistency();

-- ─── Crear una factura con su primera foto (R1, R2) ────────────────────────────────────────────────
-- Los archivos ya están subidos (HU-BASE-05). Idempotente por p_invoice_id + p_photo_id.
-- Errores (P0001): FORBIDDEN, NOT_FOUND, CUSTOMER_ARCHIVED, CONFLICT.
create function public.create_invoice_with_photo(
  p_invoice_id uuid, p_photo_id uuid, p_customer_id uuid, p_path text, p_thumb_path text, p_bytes integer
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_owner uuid := public.require_active_user();
  v_archived timestamptz;
  v_existing record;
begin
  select c.archived_at into v_archived from public.customer c
  where c.id = p_customer_id and c.owner_id = v_owner and c.deleted_at is null
  for update;
  if not found then
    raise exception 'NOT_FOUND: cliente inexistente' using errcode = 'P0001';
  end if;

  -- Reintento: la factura ya nació con esta foto.
  select i.customer_id, exists (select 1 from public.photo p where p.id = p_photo_id and p.invoice_id = i.id) as same_photo
  into v_existing from public.customer_invoice i where i.id = p_invoice_id;
  if found then
    if v_existing.customer_id = p_customer_id and v_existing.same_photo then
      return;
    end if;
    raise exception 'CONFLICT: el id de la factura ya existe' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.photo p where p.id = p_photo_id) then
    raise exception 'CONFLICT: el id de la foto ya existe' using errcode = 'P0001';
  end if;
  if v_archived is not null then
    raise exception 'CUSTOMER_ARCHIVED: el cliente está archivado' using errcode = 'P0001';
  end if;

  insert into public.customer_invoice (id, owner_id, customer_id, invoice_date)
  values (p_invoice_id, v_owner, p_customer_id, public.today_bogota());
  insert into public.photo (id, owner_id, kind, path, thumb_path, bytes, customer_id, invoice_id)
  values (p_photo_id, v_owner, 'customer_invoice', p_path, p_thumb_path, p_bytes, p_customer_id, p_invoice_id);
  -- R5: el trigger photo_touch_customer ya movió la última modificación del cliente.
end
$$;

revoke all on function public.create_invoice_with_photo(uuid, uuid, uuid, text, text, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.create_invoice_with_photo(uuid, uuid, uuid, text, text, integer) to authenticated;

-- ─── Agregar otra foto a una factura (frente y reverso, p. ej.) ────────────────────────────────────
-- Idempotente por p_photo_id. Errores (P0001): FORBIDDEN, NOT_FOUND, CUSTOMER_ARCHIVED, CONFLICT.
create function public.add_invoice_photo(
  p_invoice_id uuid, p_photo_id uuid, p_path text, p_thumb_path text, p_bytes integer
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_owner uuid := public.require_active_user();
  v_customer uuid;
  v_existing uuid;
begin
  select i.customer_id into v_customer from public.customer_invoice i
  where i.id = p_invoice_id and i.owner_id = v_owner and i.deleted_at is null
  for update;
  if not found then
    raise exception 'NOT_FOUND: factura inexistente' using errcode = 'P0001';
  end if;
  select p.invoice_id into v_existing from public.photo p where p.id = p_photo_id;
  if found then
    if v_existing = p_invoice_id then
      return;
    end if;
    raise exception 'CONFLICT: el id de la foto ya existe' using errcode = 'P0001';
  end if;
  -- photo_customer_guard rechaza un cliente archivado (CUSTOMER_ARCHIVED).
  insert into public.photo (id, owner_id, kind, path, thumb_path, bytes, customer_id, invoice_id)
  values (p_photo_id, v_owner, 'customer_invoice', p_path, p_thumb_path, p_bytes, v_customer, p_invoice_id);
end
$$;

revoke all on function public.add_invoice_photo(uuid, uuid, text, text, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.add_invoice_photo(uuid, uuid, text, text, integer) to authenticated;

-- ─── Editar N.º y fecha (R2, R3) ───────────────────────────────────────────────────────────────────
-- p_patch: {"number"?: text|null, "date"?: "YYYY-MM-DD"|null}; una clave ausente no cambia, null la vacía.
-- El N.º se recorta y vacío = null. No se compara con otras facturas (R3).
-- Errores (P0001): FORBIDDEN, NOT_FOUND, CUSTOMER_ARCHIVED, VALIDATION (detail = number | date).
create function public.update_invoice(p_invoice_id uuid, p_patch jsonb)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_owner uuid := public.require_active_user();
  v_invoice record;
  v_number text;
  v_date date;
begin
  select i.customer_id, i.invoice_number, i.invoice_date, c.archived_at into v_invoice
  from public.customer_invoice i join public.customer c on c.id = i.customer_id
  where i.id = p_invoice_id and i.owner_id = v_owner and i.deleted_at is null
  for update of i;
  if not found then
    raise exception 'NOT_FOUND: factura inexistente' using errcode = 'P0001';
  end if;
  if v_invoice.archived_at is not null then
    raise exception 'CUSTOMER_ARCHIVED: el cliente está archivado' using errcode = 'P0001';
  end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'VALIDATION: cambios inválidos' using errcode = 'P0001', detail = 'patch';
  end if;

  v_number := v_invoice.invoice_number;
  if p_patch ? 'number' then
    if jsonb_typeof(p_patch -> 'number') not in ('string', 'null') then
      raise exception 'VALIDATION: N.º inválido' using errcode = 'P0001', detail = 'number';
    end if;
    v_number := nullif(btrim(p_patch ->> 'number'), '');
  end if;

  v_date := v_invoice.invoice_date;
  if p_patch ? 'date' then
    if jsonb_typeof(p_patch -> 'date') = 'null' then
      v_date := null;
    elsif jsonb_typeof(p_patch -> 'date') <> 'string' or (p_patch ->> 'date') !~ '^\d{4}-\d{2}-\d{2}$' then
      raise exception 'VALIDATION: fecha inválida' using errcode = 'P0001', detail = 'date';
    else
      begin
        v_date := (p_patch ->> 'date')::date;
      exception when others then
        raise exception 'VALIDATION: fecha inválida' using errcode = 'P0001', detail = 'date';
      end;
      if to_char(v_date, 'YYYY-MM-DD') <> (p_patch ->> 'date') then
        raise exception 'VALIDATION: fecha inválida' using errcode = 'P0001', detail = 'date';
      end if;
    end if;
  end if;

  update public.customer_invoice set invoice_number = v_number, invoice_date = v_date where id = p_invoice_id;
  update public.customer set updated_at = now() where id = v_invoice.customer_id;   -- R5
end
$$;

revoke all on function public.update_invoice(uuid, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.update_invoice(uuid, jsonb) to authenticated;

-- ─── Borrar una foto de factura (R4) ───────────────────────────────────────────────────────────────
-- Siempre se puede (también en un archivado). Si era la última, la factura se borra en la misma
-- transacción. Un reintento sobre una foto ya borrada devuelve lo mismo sin cambiar nada.
-- Errores (P0001): FORBIDDEN, NOT_FOUND. Devuelve si la factura quedó borrada.
create function public.delete_invoice_photo(p_photo_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_owner uuid := public.require_active_user();
  v_photo record;
  v_invoice_deleted timestamptz;
begin
  select p.invoice_id, p.deleted_at into v_photo from public.photo p
  where p.id = p_photo_id and p.owner_id = v_owner and p.kind = 'customer_invoice';
  if not found then
    raise exception 'NOT_FOUND: foto de factura inexistente' using errcode = 'P0001';
  end if;
  select i.deleted_at into v_invoice_deleted from public.customer_invoice i where i.id = v_photo.invoice_id
  for update;
  if v_photo.deleted_at is not null then
    return v_invoice_deleted is not null;
  end if;

  update public.photo set deleted_at = now() where id = p_photo_id;
  if not exists (select 1 from public.photo p where p.invoice_id = v_photo.invoice_id and p.deleted_at is null) then
    update public.customer_invoice set deleted_at = now() where id = v_photo.invoice_id;
    return true;
  end if;
  return false;
end
$$;

revoke all on function public.delete_invoice_photo(uuid) from public, anon, authenticated, service_role;
grant execute on function public.delete_invoice_photo(uuid) to authenticated;
