// HU-CLI-03 · Descartar un cliente recién creado contra Supabase local, por el mismo camino que la app.
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createSupabaseAuthRepository } from '@/adapters/supabase/auth-repository';
import type { AppSupabaseClient } from '@/adapters/supabase/client';
import { createSupabaseCopyRepository } from '@/adapters/supabase/copy-repository';
import { createSupabaseCustomerRepository } from '@/adapters/supabase/customer-repository';
import { createSupabasePaymentRepository } from '@/adapters/supabase/payment-repository';
import { createSupabasePhotoRepository } from '@/adapters/supabase/photo-repository';
import { createSupabaseStorageRepository, USER_PHOTOS_BUCKET } from '@/adapters/supabase/storage-repository';
import { assignCopyToCustomer } from '@/features/customers/use-cases/customer-books';
import { createCustomer } from '@/features/customers/use-cases/customer-data';
import { discardNewCustomer, getDiscardSummary } from '@/features/customers/use-cases/customer-discard';
import { addCustomerInfoPhoto } from '@/features/customers/use-cases/customer-photos';
import { setCreationDownPayment } from '@/features/payments/use-cases/collected-payments';
import { createUser } from '../../scripts/lib/create-user';
import { fakeConnectivity } from '../support/fake-connectivity';
import { napiImageCodec, photoLikeJpeg } from '../support/napi-image-codec';
import { adminClient, anonClient, uniqueEmail } from './helpers/local-supabase';

const DB_URL = process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const CORAZON = '00000000-0000-4000-8000-000000000201'; // seed
const pool = new pg.Pool({ connectionString: DB_URL, max: 2 });
const admin = adminClient();
const password = 'clave-local-123';
let owner: string;
let client: AppSupabaseClient;

beforeAll(async () => {
  const email = uniqueEmail('hu-cli-03');
  owner = (await createUser(admin, { email, fullName: 'Descartar', password })).userId;
  client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
});

afterAll(async () => {
  const { data } = await admin.storage.from(USER_PHOTOS_BUCKET).list(`${owner}/customer_info`);
  const paths = (data ?? []).map((f) => `${owner}/customer_info/${f.name}`);
  if (paths.length > 0) await admin.storage.from(USER_PHOTOS_BUCKET).remove(paths);
  await pool.query(
    `begin; set local session_replication_role = replica;
     delete from public.photo where owner_id = '${owner}';
     delete from public.payment where owner_id = '${owner}';
     delete from public.leader_deposit where owner_id = '${owner}'; commit;`,
  );
  await pool.query('delete from public.copy_event where owner_id = $1', [owner]);
  await pool.query('delete from public.copy where owner_id = $1', [owner]);
  await pool.query('delete from public.copy_counter where owner_id = $1', [owner]);
  await pool.query('delete from public.customer where owner_id = $1', [owner]);
  await admin.auth.admin.deleteUser(owner);
  await pool.end();
});

const deps = () => ({
  auth: createSupabaseAuthRepository(() => client),
  connectivity: fakeConnectivity(),
  clock: { now: () => new Date() },
  imageCodec: napiImageCodec,
  storage: createSupabaseStorageRepository(() => client),
  photos: createSupabasePhotoRepository(() => client),
  copies: createSupabaseCopyRepository(() => client),
  customers: createSupabaseCustomerRepository(() => client),
  payments: createSupabasePaymentRepository(() => client),
});

const must = <T>(result: { ok: true; value: T } | { ok: false; error: { code: string } }): T => {
  if (!result.ok) throw new Error(result.error.code);
  return result.value;
};

const newCopy = async () => {
  const id = randomUUID();
  await pool.query(
    `insert into public.copy (id, owner_id, title_id, number, public_price_snapshot, colportor_price_snapshot, received_at)
     values ($1, $2, $3, 0, 95000, 1000, '2026-10-30')`,
    [id, owner, CORAZON],
  );
  return id;
};

/** Cliente de CA-1 creado como en la ficha: nombre, 2 libros, cuota inicial de 40.000 y 1 foto. */
const createdCustomer = async () => {
  const customerId = randomUUID();
  must(await createCustomer(deps(), { id: customerId, name: 'Natalia' }));
  const copies = [await newCopy(), await newCopy()];
  for (const copyId of copies) must(await assignCopyToCustomer(deps(), copyId, customerId));
  const paymentId = randomUUID();
  must(await setCreationDownPayment(deps(), { paymentId, customerId, amount: 40_000 }));
  must(
    await addCustomerInfoPhoto(deps(), { photoId: randomUUID(), customerId, file: photoLikeJpeg(800, 600) }),
  );
  return { customerId, copies, paymentId };
};

const snapshot = async () =>
  (
    await pool.query(
      `select
         (select json_agg(c order by c.id) from public.customer c where c.owner_id = $1) as customers,
         (select json_agg(cp order by cp.id) from public.copy cp where cp.owner_id = $1) as copies,
         (select json_agg(p order by p.id) from public.payment p where p.owner_id = $1) as payments,
         (select json_agg(ph order by ph.id) from public.photo ph where ph.owner_id = $1) as photos`,
      [owner],
    )
  ).rows[0];

describe('descartar un cliente recién creado contra Supabase local (HU-CLI-03)', () => {
  it('CA-1 y CA-2: resumen { 2, 1, 0, 1, false }; al descartar los libros vuelven y nada queda a la vista', async () => {
    const { customerId, copies, paymentId } = await createdCustomer();
    expect(await getDiscardSummary(deps(), customerId)).toEqual({
      ok: true,
      value: { books: 2, payments: 1, invoices: 0, photos: 1, blockedByDeposit: false },
    });

    expect(await discardNewCustomer(deps(), customerId)).toEqual({ ok: true, value: undefined });

    // Los 2 ejemplares están en físico con su fecha de recibido original.
    const stock = must(await deps().copies.listInStockOfTitle(CORAZON));
    for (const copyId of copies)
      expect(stock.find((c) => c.id === copyId)).toMatchObject({ receivedAt: '2026-10-30' });
    // Ni el cliente ni su cuota aparecen (Clientes y Dinero leen sin borrados).
    expect(await deps().customers.getAccountData(customerId)).toMatchObject({
      ok: false,
      error: { code: 'NOT_FOUND' },
    });
    expect(must(await deps().customers.listRefs()).some((c) => c.id === customerId)).toBe(false);
    const payments = await client.from('payment').select('id').eq('id', paymentId).is('deleted_at', null);
    expect(payments.data).toEqual([]);
    // Descartar dos veces → NOT_FOUND.
    expect(await discardNewCustomer(deps(), customerId)).toMatchObject({
      ok: false,
      error: { code: 'NOT_FOUND' },
    });
  }, 30_000);

  it('CA-3: con la cuota en un Abibono borrador → CUSTOMER_DISCARD_BLOCKED y nada cambia', async () => {
    const { customerId, paymentId } = await createdCustomer();
    const deposit = randomUUID();
    await pool.query(`insert into public.leader_deposit (id, owner_id, cash_amount) values ($1, $2, 40000)`, [
      deposit,
      owner,
    ]);
    await pool.query('update public.payment set leader_deposit_id = $2 where id = $1', [paymentId, deposit]);
    expect(must(await getDiscardSummary(deps(), customerId)).blockedByDeposit).toBe(true);
    const before = await snapshot();
    expect(await discardNewCustomer(deps(), customerId)).toEqual({
      ok: false,
      error: { code: 'CUSTOMER_DISCARD_BLOCKED', retryable: false },
    });
    expect(await snapshot()).toEqual(before);
  }, 30_000);

  it('CA-4: un cliente solo con nombre: resumen en 0 y desaparece', async () => {
    const customerId = randomUUID();
    must(await createCustomer(deps(), { id: customerId, name: 'Hernán' }));
    expect(await getDiscardSummary(deps(), customerId)).toEqual({
      ok: true,
      value: { books: 0, payments: 0, invoices: 0, photos: 0, blockedByDeposit: false },
    });
    expect(await discardNewCustomer(deps(), customerId)).toEqual({ ok: true, value: undefined });
    expect(must(await deps().customers.listRefs()).some((c) => c.id === customerId)).toBe(false);
  });

  it('CA-5: un fallo a mitad no deja nada cambiado (todo o nada)', async () => {
    const { customerId } = await createdCustomer();
    // Fallo simulado en el último paso (borrar el cliente), solo para este cliente.
    await pool.query(`
      create function public.test_fail_discard() returns trigger language plpgsql as $$
      begin
        if new.id = '${customerId}' and new.deleted_at is not null then
          raise exception 'SIMULATED: fallo a mitad';
        end if;
        return new;
      end $$;
      create trigger test_fail_discard before update on public.customer
        for each row execute function public.test_fail_discard();`);
    try {
      const before = await snapshot();
      await expect(discardNewCustomer(deps(), customerId)).rejects.toThrow(/SIMULATED/);
      expect(await snapshot()).toEqual(before);
    } finally {
      await pool.query(`drop trigger test_fail_discard on public.customer;
        drop function public.test_fail_discard();`);
    }
  }, 30_000);
});
