// Ronda 35 (#57, ADR-0051) · El cliente solo existe al guardarlo: un solo guardado con datos, libros, cuota y plan.
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AppSupabaseClient } from '@/adapters/supabase/client';
import { createSupabaseCustomerRepository } from '@/adapters/supabase/customer-repository';
import type { NewCustomerDraft } from '@/domain/new-customer';
import { localDate } from '@/domain/time';
import { saveNewCustomer } from '@/features/customers/use-cases/customer-data';
import { createUser } from '../../scripts/lib/create-user';
import { fakeConnectivity } from '../support/fake-connectivity';
import { adminClient, anonClient, uniqueEmail } from './helpers/local-supabase';

const DB_URL = process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const CORAZON = '00000000-0000-4000-8000-000000000201';
const pool = new pg.Pool({ connectionString: DB_URL, max: 4 });
const admin = adminClient();
const password = 'clave-local-123';
let owner: string;
let client: AppSupabaseClient;

beforeAll(async () => {
  const email = uniqueEmail('ronda-35');
  owner = (await createUser(admin, { email, fullName: 'Cliente al guardar', password })).userId;
  client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
});

afterAll(async () => {
  await pool.query('delete from public.payment where owner_id = $1', [owner]);
  await pool.query('delete from public.copy_event where owner_id = $1', [owner]);
  await pool.query('delete from public.copy where owner_id = $1', [owner]);
  await pool.query('delete from public.customer where owner_id = $1', [owner]);
  await admin.auth.admin.deleteUser(owner);
  await pool.end();
});

const deps = () => ({
  customers: createSupabaseCustomerRepository(() => client),
  connectivity: fakeConnectivity(),
});

const newCopy = async (price = 100_000) => {
  const id = randomUUID();
  await pool.query(
    `insert into public.copy (id, owner_id, title_id, number, public_price_snapshot, colportor_price_snapshot, received_at)
     values ($1, $2, $3, 0, $4, 1000, '2026-10-30')`,
    [id, owner, CORAZON, price],
  );
  return id;
};

const draft = (
  books: NewCustomerDraft['books'],
  extra: Partial<NewCustomerDraft> = {},
): NewCustomerDraft => ({
  id: randomUUID(),
  name: '  María Camila  ',
  phone: '3206967052',
  address: 'Calle 1',
  info: 'Le cobro el 30',
  avatarEmoji: '🍞',
  location: null,
  books,
  downPayment: null,
  plan: null,
  ...extra,
});

describe('save_new_customer (#57)', () => {
  it('guarda cliente, libros (precio y fecha), cuota inicial y plan de una sola vez', async () => {
    const copyId = await newCopy(100_000);
    const input = draft([{ copyId, agreedPrice: 90_000, soldOn: localDate('2026-11-20') }], {
      downPayment: {
        paymentId: randomUUID(),
        amount: 30_000,
        method: 'cash',
        paidOn: localDate('2026-11-20'),
      },
      plan: [
        { paymentId: randomUUID(), dueDate: localDate('2026-12-05'), amount: 30_000 },
        { paymentId: randomUUID(), dueDate: localDate('2026-12-20'), amount: 30_000 },
      ],
    });
    const result = await saveNewCustomer(deps(), input);
    expect(result.ok).toBe(true);

    const customer = await pool.query(`select name, avatar_emoji from public.customer where id = $1`, [
      input.id,
    ]);
    expect(customer.rows).toEqual([{ name: 'María Camila', avatar_emoji: '🍞' }]);
    const copy = await pool.query(
      `select status, agreed_price, (sold_at at time zone 'America/Bogota')::date::text as sold_on from public.copy where id = $1`,
      [copyId],
    );
    expect(copy.rows).toEqual([{ status: 'sold', agreed_price: 90_000, sold_on: '2026-11-20' }]);
    const payments = await pool.query(
      `select kind, status from public.payment where customer_id = $1 and deleted_at is null order by kind`,
      [input.id],
    );
    expect(payments.rows.map((r) => `${r.kind}/${r.status}`).sort()).toEqual(
      ['down_payment/collected', 'scheduled/scheduled', 'scheduled/scheduled'].sort(),
    );
  });

  it('si algo falla (un libro que ya no está en físico), no queda nada: ni cliente ni venta', async () => {
    const free = await newCopy();
    const sold = await newCopy();
    await pool.query(`update public.copy set status = 'sold', sold_at = now() where id = $1`, [sold]);
    const input = draft([
      { copyId: free, agreedPrice: 100_000, soldOn: localDate('2026-11-20') },
      { copyId: sold, agreedPrice: 100_000, soldOn: localDate('2026-11-20') },
    ]);
    const result = await saveNewCustomer(deps(), input);
    expect(result.ok).toBe(false);
    expect((await pool.query(`select 1 from public.customer where id = $1`, [input.id])).rowCount).toBe(0);
    const freeCopy = await pool.query(`select status from public.copy where id = $1`, [free]);
    expect(freeCopy.rows).toEqual([{ status: 'in_stock' }]);
    expect(
      (await pool.query(`select 1 from public.copy_event where copy_id = $1 and type <> 'received'`, [free]))
        .rowCount,
    ).toBe(0);
  });

  it('reintentar con el mismo id no duplica', async () => {
    const input = draft([]);
    expect((await saveNewCustomer(deps(), input)).ok).toBe(true);
    expect((await saveNewCustomer(deps(), input)).ok).toBe(true);
    expect((await pool.query(`select 1 from public.customer where id = $1`, [input.id])).rowCount).toBe(1);
  });
});
