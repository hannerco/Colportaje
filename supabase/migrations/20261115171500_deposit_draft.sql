-- HU-DIN-04 · Nuevo Abibono: guardar y borrar un borrador. BR-DEP-02/03/04/08/10/13, BR-PAY-11, BR-GEN-02,
-- AF-43, AF-106. La propuesta precargada se arma en el teléfono y no escribe nada (R1); el Abibono nace al guardar.

-- Un monto entregado válido (entero de 0 a 2.147.483.647) o null.
create function public.deposit_amount(p_value jsonb)
returns integer
language plpgsql
immutable
set search_path = ''
as $$
declare
  v numeric;
begin
  if p_value is null or jsonb_typeof(p_value) <> 'number' then
    return null;
  end if;
  v := (p_value #>> '{}')::numeric;
  if v < 0 or v > 2147483647 or v <> trunc(v) then
    return null;
  end if;
  return v::integer;
end
$$;

revoke all on function public.deposit_amount(jsonb) from public, anon, authenticated, service_role;

-- ─── Guardar un borrador (R2, R3, R4) ─────────────────────────────────────────────────────────────
-- p_deposit: { id, title (null o vacío = automático), depositDate, paymentIds: [uuid], cash, transfer, note,
--              stagedReceipts: [{ photoId, path, thumbPath, bytes }] }.
-- Crea el borrador si no existe (idempotente por id), vincula los abonos marcados, desvincula los desmarcados y
-- crea las filas de los recibos ya subidos, todo en una transacción. Devuelve el id.
-- Errores (P0001): FORBIDDEN, VALIDATION (detail = campo), DEPOSIT_NOT_DRAFT, CONFLICT,
-- PAYMENT_NOT_AVAILABLE (detail = ids en JSON).
create function public.save_deposit_draft(p_deposit jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_owner uuid := public.require_active_user();
  v_id uuid;
  v_title text;
  v_note text;
  v_date date;
  v_cash integer;
  v_transfer integer;
  v_payments uuid[];
  v_receipts jsonb;
  v_receipt jsonb;
  v_status public.deposit_status;
  v_bad uuid[];
  v_photo uuid;
  v_path text;
  v_thumb text;
  v_bytes integer;
begin
  if p_deposit is null or jsonb_typeof(p_deposit) <> 'object' then
    raise exception 'VALIDATION: datos del Abibono inválidos' using errcode = 'P0001', detail = 'deposit';
  end if;

  begin
    v_id := (p_deposit ->> 'id')::uuid;
  exception when others then
    v_id := null;
  end;
  if v_id is null then
    raise exception 'VALIDATION: falta el id del Abibono' using errcode = 'P0001', detail = 'depositId';
  end if;

  if p_deposit -> 'title' is not null and jsonb_typeof(p_deposit -> 'title') not in ('string', 'null') then
    raise exception 'VALIDATION: título inválido' using errcode = 'P0001', detail = 'title';
  end if;
  v_title := nullif(btrim(coalesce(p_deposit ->> 'title', '')), '');
  if p_deposit -> 'note' is not null and jsonb_typeof(p_deposit -> 'note') not in ('string', 'null') then
    raise exception 'VALIDATION: nota inválida' using errcode = 'P0001', detail = 'note';
  end if;
  v_note := nullif(btrim(coalesce(p_deposit ->> 'note', '')), '');

  begin
    v_date := (p_deposit ->> 'depositDate')::date;
  exception when others then
    v_date := null;
  end;
  if v_date is null then
    raise exception 'VALIDATION: fecha inválida' using errcode = 'P0001', detail = 'depositDate';
  end if;

  -- R3: lo que escribió el usuario, enteros ≥ 0.
  v_cash := public.deposit_amount(p_deposit -> 'cash');
  if v_cash is null then
    raise exception 'VALIDATION: efectivo inválido' using errcode = 'P0001', detail = 'cash';
  end if;
  v_transfer := public.deposit_amount(p_deposit -> 'transfer');
  if v_transfer is null then
    raise exception 'VALIDATION: transferencia inválida' using errcode = 'P0001', detail = 'transfer';
  end if;

  if jsonb_typeof(coalesce(p_deposit -> 'paymentIds', '[]'::jsonb)) <> 'array' then
    raise exception 'VALIDATION: abonos inválidos' using errcode = 'P0001', detail = 'paymentIds';
  end if;
  begin
    select coalesce(array_agg(distinct x::uuid), '{}') into v_payments
    from jsonb_array_elements_text(coalesce(p_deposit -> 'paymentIds', '[]'::jsonb)) x;
  exception when others then
    raise exception 'VALIDATION: abonos inválidos' using errcode = 'P0001', detail = 'paymentIds';
  end;

  v_receipts := coalesce(p_deposit -> 'stagedReceipts', '[]'::jsonb);
  if jsonb_typeof(v_receipts) <> 'array' then
    raise exception 'VALIDATION: recibos inválidos' using errcode = 'P0001', detail = 'stagedReceipts';
  end if;

  -- El borrador: se crea si no existe y se bloquea su fila (dos guardados del mismo id van en fila).
  insert into public.leader_deposit (id, owner_id, deposit_date)
  values (v_id, v_owner, v_date)
  on conflict (id) do nothing;
  select d.status into v_status from public.leader_deposit d
  where d.id = v_id and d.owner_id = v_owner
  for update;
  if not found then
    raise exception 'CONFLICT: ese id ya está en uso' using errcode = 'P0001';
  end if;
  if v_status <> 'draft' then
    raise exception 'DEPOSIT_NOT_DRAFT: el Abibono ya está confirmado' using errcode = 'P0001';
  end if;

  -- R2: los marcados deben seguir cobrados y libres, o ya ser de este borrador (BR-DEP-08).
  perform 1 from public.payment p
  where p.owner_id = v_owner and (p.id = any(v_payments) or p.leader_deposit_id = v_id)
  order by p.id
  for update;
  select array_agg(x order by x) into v_bad from unnest(v_payments) x
  where not exists (
    select 1 from public.payment p
    where p.id = x and p.owner_id = v_owner and p.deleted_at is null and p.status = 'collected'
      and (p.leader_deposit_id is null or p.leader_deposit_id = v_id)
  );
  if v_bad is not null then
    raise exception 'PAYMENT_NOT_AVAILABLE: algún abono ya no está disponible'
      using errcode = 'P0001', detail = to_jsonb(v_bad)::text;
  end if;

  update public.payment set leader_deposit_id = null
  where owner_id = v_owner and leader_deposit_id = v_id and not (id = any(v_payments));
  update public.payment set leader_deposit_id = v_id
  where owner_id = v_owner and id = any(v_payments) and leader_deposit_id is null;

  -- R3 / R4: título, fecha y montos tal como los escribió el usuario.
  update public.leader_deposit
  set title = v_title, deposit_date = v_date, cash_amount = v_cash, transfer_amount = v_transfer, note = v_note
  where id = v_id;

  -- Recibos subidos antes de que existiera el Abibono (addDepositReceipt sobre la propuesta, R7).
  for v_receipt in select * from jsonb_array_elements(v_receipts) loop
    begin
      v_photo := (v_receipt ->> 'photoId')::uuid;
      v_path := v_receipt ->> 'path';
      v_thumb := v_receipt ->> 'thumbPath';
      v_bytes := (v_receipt ->> 'bytes')::integer;
    exception when others then
      raise exception 'VALIDATION: recibo inválido' using errcode = 'P0001', detail = 'stagedReceipts';
    end;
    if v_photo is null or v_bytes is null or v_bytes < 0
       or v_path is null or v_path not like v_owner::text || '/deposit_receipt/%'
       or (v_thumb is not null and v_thumb not like v_owner::text || '/deposit_receipt/%') then
      raise exception 'VALIDATION: recibo inválido' using errcode = 'P0001', detail = 'stagedReceipts';
    end if;
    -- Reintentar con el mismo photoId no duplica.
    insert into public.photo (id, owner_id, kind, path, thumb_path, bytes, leader_deposit_id)
    values (v_photo, v_owner, 'deposit_receipt', v_path, v_thumb, v_bytes, v_id)
    on conflict (id) do nothing;
    if not exists (
      select 1 from public.photo ph where ph.id = v_photo and ph.owner_id = v_owner and ph.leader_deposit_id = v_id
    ) then
      raise exception 'VALIDATION: recibo inválido' using errcode = 'P0001', detail = 'stagedReceipts';
    end if;
  end loop;

  return v_id;
end
$$;

revoke all on function public.save_deposit_draft(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.save_deposit_draft(jsonb) to authenticated;

-- ─── Borrar un borrador (R5, BR-DEP-10, BR-GEN-02) ────────────────────────────────────────────────
-- La única eliminación física: el Abibono y las filas de sus recibos (también los ya borrados); sus abonos
-- quedan libres. Devuelve las rutas de los archivos para que la app los borre del bucket (Storage no se borra
-- desde SQL). Borrar uno que ya no existe no falla y devuelve una lista vacía (reintento).
-- Errores (P0001): FORBIDDEN, DEPOSIT_NOT_DRAFT (confirmado, o reabierto: conserva su número, BR-DEP-02).
create function public.delete_deposit_draft(p_deposit_id uuid)
returns text[]
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_owner uuid := public.require_active_user();
  v_deposit record;
  v_paths text[];
begin
  select d.status, d.deposit_number into v_deposit from public.leader_deposit d
  where d.id = p_deposit_id and d.owner_id = v_owner
  for update;
  if not found then
    return '{}';
  end if;
  if v_deposit.status <> 'draft' or v_deposit.deposit_number is not null then
    raise exception 'DEPOSIT_NOT_DRAFT: solo se borra un borrador que nunca se confirmó' using errcode = 'P0001';
  end if;

  update public.payment set leader_deposit_id = null where leader_deposit_id = p_deposit_id;

  select coalesce(array_agg(x order by x), '{}') into v_paths from (
    select ph.path as x from public.photo ph where ph.leader_deposit_id = p_deposit_id
    union
    select ph.thumb_path from public.photo ph where ph.leader_deposit_id = p_deposit_id and ph.thumb_path is not null
  ) files;
  delete from public.photo where leader_deposit_id = p_deposit_id;
  delete from public.leader_deposit where id = p_deposit_id;
  return v_paths;
end
$$;

revoke all on function public.delete_deposit_draft(uuid) from public, anon, authenticated, service_role;
grant execute on function public.delete_deposit_draft(uuid) to authenticated;
