-- Ronda 35 (#57, ADR-0051): el cliente solo existe al guardarlo. Mientras se crea, todo vive en el teléfono; al pulsar
-- «Guardar cliente» esta función crea el cliente, le vende sus libros (con su precio acordado y su fecha de venta),
-- guarda la cuota inicial y el plan de abonos, todo en una sola transacción: o queda todo o no queda nada. Las fotos
-- se suben después (si una falla, el cliente ya quedó guardado y la app ofrece reintentarla).
--
-- p_customer: { id, name, phone, address, info, avatar_emoji, maps_url, latitude, longitude, accuracy_m }
-- p_books:    [{ copy_id, agreed_price, sold_on }]
-- p_down:     { payment_id, amount, method, paid_on } o null
-- p_plan:     [{ paymentId, dueDate, amount }] o null (la forma de apply_payment_plan)
-- Reintentar con el mismo `id` no duplica: si el cliente ya existe y es del usuario, no hace nada.
-- Errores (P0001): los de las funciones que usa (FORBIDDEN, NOT_FOUND, VALIDATION, COPY_NOT_AVAILABLE…) y CONFLICT.
create function public.save_new_customer(p_customer jsonb, p_books jsonb, p_down jsonb, p_plan jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_id uuid := (p_customer ->> 'id')::uuid;
  v_owner uuid;
  v_book jsonb;
  v_public integer;
begin
  if not (select public.is_active_user()) then
    raise exception 'FORBIDDEN: usuario inactivo' using errcode = 'P0001';
  end if;

  select c.owner_id into v_owner from public.customer c where c.id = v_id;
  if found then
    if v_owner = auth.uid() then
      return v_id;
    end if;
    raise exception 'CONFLICT: el id ya existe' using errcode = 'P0001';
  end if;

  insert into public.customer (
    id, name, phone, address, info, avatar_emoji, maps_url, latitude, longitude, location_accuracy_m
  )
  values (
    v_id,
    btrim(p_customer ->> 'name'),
    nullif(btrim(p_customer ->> 'phone'), ''),
    nullif(btrim(p_customer ->> 'address'), ''),
    nullif(btrim(p_customer ->> 'info'), ''),
    nullif(p_customer ->> 'avatar_emoji', ''),
    nullif(p_customer ->> 'maps_url', ''),
    (p_customer ->> 'latitude')::numeric,
    (p_customer ->> 'longitude')::numeric,
    (p_customer ->> 'accuracy_m')::integer
  );

  for v_book in select * from jsonb_array_elements(coalesce(p_books, '[]'::jsonb)) loop
    perform public.assign_copy_to_customer(
      (v_book ->> 'copy_id')::uuid, v_id, (v_book ->> 'sold_on')::date
    );
    select c.public_price_snapshot into v_public from public.copy c where c.id = (v_book ->> 'copy_id')::uuid;
    if (v_book ->> 'agreed_price') is not null
      and (v_book ->> 'agreed_price')::integer is distinct from v_public then
      perform public.update_agreed_price((v_book ->> 'copy_id')::uuid, (v_book ->> 'agreed_price')::integer);
    end if;
  end loop;

  if p_down is not null and coalesce((p_down ->> 'amount')::integer, 0) > 0 then
    perform public.set_creation_down_payment(
      (p_down ->> 'payment_id')::uuid,
      v_id,
      (p_down ->> 'amount')::integer,
      (p_down ->> 'method')::public.pay_method,
      (p_down ->> 'paid_on')::date
    );
  end if;

  if p_plan is not null and jsonb_array_length(p_plan) > 0 then
    perform public.apply_payment_plan(v_id, 'replace_all', p_plan);
  end if;

  return v_id;
end
$$;

revoke all on function public.save_new_customer(jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.save_new_customer(jsonb, jsonb, jsonb, jsonb) to authenticated;
