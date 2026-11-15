-- HU-CLI-07 · Fotos de información del cliente. BR-CUS-01, BR-PHO-01/03, BR-CUS-16, HU-BASE-05 R5.
-- Migración aditiva sobre photo: el vínculo con el cliente y su check (DATABASE.md). El usuario sigue
-- escribiendo photo por la API (RLS de HU-BASE-05); los triggers refuerzan lo que la HU exige.

alter table public.photo add column customer_id uuid;
alter table public.photo
  add constraint photo_customer_same_owner foreign key (customer_id, owner_id)
    references public.customer (id, owner_id);
-- Las fotos de cliente (información y factura) llevan cliente; el recibo del Abibono no.
alter table public.photo
  add constraint photo_customer_linked check ((kind <> 'deposit_receipt') = (customer_id is not null));
create index photo_customer_idx on public.photo (customer_id) where customer_id is not null;

-- El cliente de una foto no cambia; agregar una foto a un cliente archivado o borrado no se puede.
-- Borrar (lógico) se permite siempre (R2, BR-PHO-03).
-- Errores (P0001): NOT_FOUND, CUSTOMER_ARCHIVED, INVALID_TRANSITION.
create function public.photo_customer_guard() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer record;
begin
  if tg_op = 'UPDATE' then
    if new.customer_id is distinct from old.customer_id then
      raise exception 'INVALID_TRANSITION: el cliente de una foto no cambia' using errcode = 'P0001';
    end if;
    return new;
  end if;
  if new.customer_id is null then
    return new;
  end if;
  select c.archived_at, c.deleted_at into v_customer from public.customer c
  where c.id = new.customer_id and c.owner_id = new.owner_id;
  if not found or v_customer.deleted_at is not null then
    raise exception 'NOT_FOUND: cliente inexistente' using errcode = 'P0001';
  end if;
  if v_customer.archived_at is not null then
    raise exception 'CUSTOMER_ARCHIVED: el cliente está archivado' using errcode = 'P0001';
  end if;
  return new;
end
$$;

revoke all on function public.photo_customer_guard() from public, anon, authenticated, service_role;

create trigger photo_customer_guard before insert or update on public.photo
  for each row execute function public.photo_customer_guard();

-- R3 (BR-CUS-16): agregar o borrar una foto del cliente mueve su "última modificación".
create function public.photo_touch_customer() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.customer_id is not null
     and (tg_op = 'INSERT' or new.deleted_at is distinct from old.deleted_at) then
    update public.customer set updated_at = now() where id = new.customer_id;
  end if;
  return null;
end
$$;

revoke all on function public.photo_touch_customer() from public, anon, authenticated, service_role;

create trigger photo_touch_customer after insert or update on public.photo
  for each row execute function public.photo_touch_customer();
