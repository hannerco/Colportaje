// HU-CLI-10 · Devolver un libro de un cliente guardado contra Supabase local, por el mismo camino que la app
// (casos AF de FLOWS-ALTERNATIVOS §A).
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AppSupabaseClient } from '@/adapters/supabase/client';
import { createSupabaseCopyRepository } from '@/adapters/supabase/copy-repository';
import { createSupabaseCustomerRepository } from '@/adapters/supabase/customer-repository';
import { assignCopyToCustomer, returnCopyFromCustomer } from '@/features/customers/use-cases/customer-books';
import { createUser } from '../../scripts/lib/create-user';
import { fakeConnectivity } from '../support/fake-connectivity';
import { adminClient, anonClient, uniqueEmail } from './helpers/local-supabase';

const DB_URL = process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const CORAZON = '00000000-0000-4000-8000-000000000201'; // seed: religioso
const MINI = '00000000-0000-4000-8000-000000000301'; // seed: minibook
const pool = new pg.Pool({ connectionString: DB_URL, max: 2 });
const admin = adminClient();
const password = 'clave-local-123';
let owner: string;
let client: AppSupabaseClient;

beforeAll(async () => {
  const email = uniqueEmail('hu-cli-10');
  owner = (await createUser(admin, { email, fullName: 'Devoluciones', password })).userId;
  client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
});

afterAll(async () => {
  await pool.query('delete from public.payment_event where owner_id = $1', [owner]);
  await pool.query('delete from public.payment where owner_id = $1', [owner]);
  await pool.query(
    `begin; set local session_replication_role = replica;
     delete from public.leader_deposit_event where owner_id = '${owner}';
     delete from public.leader_deposit where owner_id = '${owner}'; commit;`,
  );
  await pool.query('delete from public.leader_deposit_counter where owner_id = $1', [owner]);
  await pool.query('delete from public.copy_event where owner_id = $1', [owner]);
  await pool.query('delete from public.copy where owner_id = $1', [owner]);
  await pool.query('delete from public.copy_counter where owner_id = $1', [owner]);
  await pool.query('delete from public.customer where owner_id = $1', [owner]);
  await admin.auth.admin.deleteUser(owner);
  await pool.end();
});

const deps = () => ({
  copies: createSupabaseCopyRepository(() => client),
  customers: createSupabaseCustomerRepository(() => client),
  connectivity: fakeConnectivity(),
  clock: { now: () => new Date() },
});

const newCustomer = async () => {
  const id = randomUUID();
  await pool.query('insert into public.customer (id, owner_id, name) values ($1, $2, $3)', [
    id,
    owner,
    'Natalia',
  ]);
  return id;
};

/** Ejemplar recibido el 30/10 con precio público `price`, vendido al cliente por la app. */
const soldCopy = async (customer: string, price: number) => {
  const id = randomUUID();
  await pool.query(
    `insert into public.copy (id, owner_id, title_id, number, public_price_snapshot, colportor_price_snapshot, received_at)
     values ($1, $2, $3, 0, $4, 1000, '2026-10-30')`,
    [id, owner, CORAZON, price],
  );
  const assigned = await assignCopyToCustomer(deps(), id, customer);
  if (!assigned.ok) throw new Error(assigned.error.code);
  return id;
};

const collected = async (customer: string, amount: number) => {
  const id = randomUUID();
  await pool.query(
    `insert into public.payment (id, owner_id, customer_id, kind, status, paid_amount, paid_at, method)
     values ($1, $2, $3, 'extra', 'collected', $4, public.today_bogota(), 'cash')`,
    [id, owner, customer, amount],
  );
  return id;
};

const copyRow = async (id: string) =>
  (
    await pool.query(
      `select status, customer_id, agreed_price, sold_at, received_at::text as received from public.copy where id = $1`,
      [id],
    )
  ).rows[0];

const lastEvent = async (id: string) =>
  (
    await pool.query(
      'select type, data from public.copy_event where copy_id = $1 order by seq desc limit 1',
      [id],
    )
  ).rows[0];

const moneySnapshot = async () =>
  (
    await pool.query(
      `select (select json_agg(p order by p.id) from public.payment p where p.owner_id = $1) as payments,
              (select json_agg(d order by d.id) from public.leader_deposit d where d.owner_id = $1) as deposits`,
      [owner],
    )
  ).rows[0];

describe('devolver un libro de un cliente guardado contra Supabase local (HU-CLI-10)', () => {
  it('CA-1 / R2 (AF-01): sin abonos → deuda 0, prospecto; en físico con received_at y el motivo', async () => {
    const customer = await newCustomer();
    const copy = await soldCopy(customer, 50_000);
    const result = await returnCopyFromCustomer(deps(), copy, 'customer_returned');
    expect(result).toMatchObject({
      ok: true,
      value: { account: { debt: 0 }, becameProspect: true, excess: null },
    });
    expect(await copyRow(copy)).toEqual({
      status: 'in_stock',
      customer_id: null,
      agreed_price: null,
      sold_at: null,
      received: '2026-10-30',
    });
    expect(await lastEvent(copy)).toEqual({ type: 'returned', data: { reason: 'customer_returned' } });
  });

  it('CA-2 / R3 (AF-02): 30.000 cobrados sin entregar → saldo a favor 30.000 y siguen por entregar', async () => {
    const customer = await newCustomer();
    const copy = await soldCopy(customer, 50_000);
    const payment = await collected(customer, 30_000);
    const before = await moneySnapshot();
    const result = await returnCopyFromCustomer(deps(), copy, 'wrong_registration');
    expect(result).toMatchObject({ ok: true, value: { account: { balance: -30_000, credit: 30_000 } } });
    expect(await moneySnapshot()).toEqual(before);
    const p = await pool.query('select status, leader_deposit_id from public.payment where id = $1', [
      payment,
    ]);
    expect(p.rows[0]).toEqual({ status: 'collected', leader_deposit_id: null });
    expect(await lastEvent(copy)).toEqual({ type: 'returned', data: { reason: 'wrong_registration' } });
  });

  it('CA-3 / R3 (AF-03): con los 30.000 en un Abibono confirmado, nada del dinero cambia', async () => {
    const customer = await newCustomer();
    const copy = await soldCopy(customer, 50_000);
    const payment = await collected(customer, 30_000);
    const deposit = randomUUID();
    const c = await pool.connect();
    try {
      await c.query('begin');
      await c.query(`insert into public.leader_deposit (id, owner_id, cash_amount) values ($1, $2, 30000)`, [
        deposit,
        owner,
      ]);
      await c.query('update public.payment set leader_deposit_id = $2 where id = $1', [payment, deposit]);
      await c.query('commit');
      await c.query('begin');
      await c.query(
        `update public.leader_deposit set status = 'confirmed', confirmed_at = now() where id = $1`,
        [deposit],
      );
      await c.query(`update public.payment set status = 'delivered' where id = $1`, [payment]);
      await c.query('commit');
    } finally {
      c.release();
    }
    const before = await moneySnapshot();
    const result = await returnCopyFromCustomer(deps(), copy, 'customer_returned');
    expect(result).toMatchObject({ ok: true, value: { account: { credit: 30_000 } } });
    expect(await moneySnapshot()).toEqual(before);
  });

  it('CA-4 (RQ-INV-07): libros de 50.000 y 20.000 con 30.000 pagados; devolver el de 50.000', async () => {
    const customer = await newCustomer();
    const big = await soldCopy(customer, 50_000);
    await soldCopy(customer, 20_000);
    await collected(customer, 30_000);
    const result = await returnCopyFromCustomer(deps(), big, 'customer_returned');
    expect(result).toMatchObject({
      ok: true,
      value: { account: { debt: 20_000, balance: -10_000, credit: 10_000 }, becameProspect: false },
    });
  });

  it('CA-5 (AF-05): saldo 10.000 y 3 programados de 10.000 → sobrante 20.000, modal, más lejano', async () => {
    const customer = await newCustomer();
    const returned = await soldCopy(customer, 40_000);
    await soldCopy(customer, 10_000);
    for (const days of [10, 20, 30])
      await pool.query(
        `insert into public.payment (id, owner_id, customer_id, kind, status, agreed_amount, due_date, original_due_date)
         values ($1, $2, $3, 'scheduled', 'scheduled', 10000, public.today_bogota() + $4::int, public.today_bogota() + $4::int)`,
        [randomUUID(), owner, customer, days],
      );
    const result = await returnCopyFromCustomer(deps(), returned, 'customer_returned');
    expect(result).toMatchObject({
      ok: true,
      value: {
        account: { balance: 10_000 },
        excess: { trigger: 'return', presentation: 'modal', suggestedOrder: 'farthest', excess: 20_000 },
      },
    });
  });

  it('CA-6 (AF-07): vendido con descuento (45.000 de 50.000); al devolver y vender de nuevo, nace en 50.000', async () => {
    const customer = await newCustomer();
    const copy = await soldCopy(customer, 50_000);
    await pool.query('update public.copy set agreed_price = 45000 where id = $1', [copy]);
    await returnCopyFromCustomer(deps(), copy, 'customer_returned');
    expect((await copyRow(copy)).agreed_price).toBeNull();
    const other = await newCustomer();
    const again = await assignCopyToCustomer(deps(), copy, other);
    expect(again).toMatchObject({ ok: true, value: { account: { debt: 50_000 } } });
    expect((await copyRow(copy)).agreed_price).toBe(50_000);
  });

  it('R1 y errores: no vendido → COPY_NOT_SOLD; minibook → COPY_IS_MINIBOOK', async () => {
    const customer = await newCustomer();
    const copy = await soldCopy(customer, 50_000);
    await returnCopyFromCustomer(deps(), copy, 'customer_returned');
    expect(await returnCopyFromCustomer(deps(), copy, 'customer_returned')).toMatchObject({
      ok: false,
      error: { code: 'COPY_NOT_SOLD' },
    });
    // Un minibook vendido (lo hará el módulo Minibooks; aquí se inserta directo) no se devuelve por aquí.
    const mini = randomUUID();
    await pool.query(
      `begin; set local session_replication_role = replica;
       insert into public.copy (id, owner_id, title_id, number, status, customer_id, agreed_price, sold_at,
                                public_price_snapshot, colportor_price_snapshot, received_at)
       values ('${mini}', '${owner}', '${MINI}', 900, 'sold', '${customer}', 5000, now(), null, 1000, '2026-10-30');
       commit;`,
    );
    expect(await returnCopyFromCustomer(deps(), mini, 'customer_returned')).toMatchObject({
      ok: false,
      error: { code: 'COPY_IS_MINIBOOK' },
    });
    expect((await copyRow(mini)).status).toBe('sold');
  });
});
