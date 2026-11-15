// HU-INV-06 · Precio acordado contra Supabase local, por el mismo camino que la app.
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AppSupabaseClient } from '@/adapters/supabase/client';
import { createSupabaseCopyRepository } from '@/adapters/supabase/copy-repository';
import { createSupabaseCustomerRepository } from '@/adapters/supabase/customer-repository';
import { restorePublicPrice, updateAgreedPrice } from '@/features/inventory/use-cases/agreed-price';
import { createUser } from '../../scripts/lib/create-user';
import { fakeConnectivity } from '../support/fake-connectivity';
import { adminClient, anonClient, uniqueEmail } from './helpers/local-supabase';

const DB_URL = process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const CORAZON = '00000000-0000-4000-8000-000000000201'; // seed: religioso
const MINI = '00000000-0000-4000-8000-000000000301'; // seed: minibook
const pool = new pg.Pool({ connectionString: DB_URL, max: 2 });
const admin = adminClient();
const password = 'clave-local-123';
const users: { id: string; client: AppSupabaseClient }[] = [];

const newUser = async (label: string) => {
  const email = uniqueEmail(label);
  const { userId } = await createUser(admin, { email, fullName: label, password });
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  users.push({ id: userId, client });
};

beforeAll(async () => {
  await newUser('hu-inv-06-a');
  await newUser('hu-inv-06-b');
});

afterAll(async () => {
  for (const { id } of users) {
    await pool.query('delete from public.payment where owner_id = $1', [id]);
    await pool.query('delete from public.copy_event where owner_id = $1', [id]);
    await pool.query('delete from public.copy where owner_id = $1', [id]);
    await pool.query('delete from public.copy_counter where owner_id = $1', [id]);
    await pool.query('delete from public.customer where owner_id = $1', [id]);
    await admin.auth.admin.deleteUser(id);
  }
  await pool.end();
});

const a = () => users[0]!;
const deps = (client = a().client) => ({
  copies: createSupabaseCopyRepository(() => client),
  customers: createSupabaseCustomerRepository(() => client),
  connectivity: fakeConnectivity(),
  clock: { now: () => new Date() },
});

/** Cliente con un ejemplar vendido (público `publicPrice`, acordado `agreed`). */
const soldCopy = async (publicPrice: number, agreed = publicPrice, title = CORAZON) => {
  const customer = randomUUID();
  await pool.query(
    `insert into public.customer (id, owner_id, name, updated_at) values ($1, $2, 'Natalia', '2026-01-01')`,
    [customer, a().id],
  );
  const copy = randomUUID();
  await pool.query(
    `begin; set local session_replication_role = replica;
     insert into public.copy (id, owner_id, title_id, number, status, customer_id, agreed_price, sold_at,
                              public_price_snapshot, colportor_price_snapshot, received_at)
     values ('${copy}', '${a().id}', '${title}', ${Math.floor(Math.random() * 1e6)}, 'sold', '${customer}', ${agreed},
             now(), ${title === MINI ? 'null' : publicPrice}, 1000, '2026-10-30');
     commit;`,
  );
  return { customer, copy };
};

const priceEvents = async (copy: string) =>
  (
    await pool.query(
      `select data from public.copy_event where copy_id = $1 and type = 'price_changed' order by seq`,
      [copy],
    )
  ).rows.map((r) => r.data);

const touched = async (customer: string) =>
  (await pool.query(`select updated_at > '2026-01-02' as t from public.customer where id = $1`, [customer]))
    .rows[0].t;

describe('precio acordado contra Supabase local (HU-INV-06)', () => {
  it('CA-1 / R3: baja a 45.000 → deuda 45.000, diferencia −5.000, evento y última modificación', async () => {
    const { customer, copy } = await soldCopy(50_000);
    const result = await updateAgreedPrice(deps(), copy, 45_000);
    expect(result).toMatchObject({ ok: true, value: { account: { debt: 45_000 }, excess: null } });
    const row = await pool.query(
      'select agreed_price, agreed_price - public_price_snapshot as delta from public.copy where id = $1',
      [copy],
    );
    expect(row.rows[0]).toEqual({ agreed_price: 45_000, delta: -5_000 });
    expect(await priceEvents(copy)).toEqual([{ oldPrice: 50_000, newPrice: 45_000 }]);
    expect(await touched(customer)).toBe(true);
  });

  it('CA-2: con 2 programados de 25.000 y baja a 30.000 → sobrante 20.000, más lejano, modal', async () => {
    const { customer, copy } = await soldCopy(50_000);
    for (const days of [10, 20])
      await pool.query(
        `insert into public.payment (id, owner_id, customer_id, kind, status, agreed_amount, due_date, original_due_date)
         values ($1, $2, $3, 'scheduled', 'scheduled', 25000, public.today_bogota() + $4::int, public.today_bogota() + $4::int)`,
        [randomUUID(), a().id, customer, days],
      );
    const result = await updateAgreedPrice(deps(), copy, 30_000);
    expect(result).toMatchObject({
      ok: true,
      value: {
        excess: {
          trigger: 'price_decrease',
          presentation: 'modal',
          suggestedOrder: 'farthest',
          excess: 20_000,
        },
      },
    });
    // Subir de nuevo nunca genera sobrante.
    expect(await updateAgreedPrice(deps(), copy, 60_000)).toMatchObject({
      ok: true,
      value: { excess: null },
    });
  });

  it('CA-3: 93.000 con público 98.000 → restaurar deja 98.000 sin diferencia', async () => {
    const { copy } = await soldCopy(98_000, 93_000);
    const result = await restorePublicPrice(deps(), copy);
    expect(result).toMatchObject({ ok: true, value: { account: { debt: 98_000 } } });
    expect(
      (await pool.query('select agreed_price from public.copy where id = $1', [copy])).rows[0].agreed_price,
    ).toBe(98_000);
    expect(await priceEvents(copy)).toEqual([{ oldPrice: 93_000, newPrice: 98_000 }]);
  });

  it('CA-4 (AF-29): pagó 50.000 y baja a 40.000 → saldo a favor 10.000', async () => {
    const { customer, copy } = await soldCopy(50_000);
    await pool.query(
      `insert into public.payment (id, owner_id, customer_id, kind, status, paid_amount, paid_at, method)
       values ($1, $2, $3, 'extra', 'collected', 50000, public.today_bogota(), 'cash')`,
      [randomUUID(), a().id, customer],
    );
    expect(await updateAgreedPrice(deps(), copy, 40_000)).toMatchObject({
      ok: true,
      value: { account: { balance: -10_000, credit: 10_000 } },
    });
  });

  it('R5: el mismo precio no registra evento ni mueve la última modificación', async () => {
    const { customer, copy } = await soldCopy(50_000);
    expect(await updateAgreedPrice(deps(), copy, 50_000)).toMatchObject({ ok: true });
    expect(await restorePublicPrice(deps(), copy)).toMatchObject({ ok: true });
    expect(await priceEvents(copy)).toEqual([]);
    expect(await touched(customer)).toBe(false);
  });

  it('CA-5 / R1 y errores: en físico → COPY_NOT_SOLD; minibook → COPY_IS_MINIBOOK; ajeno → NOT_FOUND', async () => {
    const inStock = randomUUID();
    await pool.query(
      `insert into public.copy (id, owner_id, title_id, number, public_price_snapshot, colportor_price_snapshot, received_at)
       values ($1, $2, $3, 0, 50000, 1000, '2026-10-30')`,
      [inStock, a().id, CORAZON],
    );
    expect(await updateAgreedPrice(deps(), inStock, 45_000)).toMatchObject({
      ok: false,
      error: { code: 'COPY_NOT_SOLD' },
    });
    const { copy: mini } = await soldCopy(5_000, 5_000, MINI);
    expect(await updateAgreedPrice(deps(), mini, 4_000)).toMatchObject({
      ok: false,
      error: { code: 'COPY_IS_MINIBOOK' },
    });
    const { copy } = await soldCopy(50_000);
    expect(await updateAgreedPrice(deps(users[1]!.client), copy, 1)).toMatchObject({
      ok: false,
      error: { code: 'NOT_FOUND' },
    });
    // La base también valida el precio.
    expect(await createSupabaseCopyRepository(() => a().client).updateAgreedPrice(copy, -1)).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION', details: { field: 'price' } },
    });
  });
});
