// HU-DIN-02 · Resumen de Dinero contra Supabase local: la lectura por la API (RLS) alimenta el cálculo,
// como en la app. Cada prueba usa un usuario nuevo para que sus totales no se mezclen.
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, describe, expect, it } from 'vitest';
import type { AppSupabaseClient } from '@/adapters/supabase/client';
import { createSupabaseCustomerRepository } from '@/adapters/supabase/customer-repository';
import { createSupabaseMoneyRepository } from '@/adapters/supabase/money-repository';
import { createSupabaseTitleRepository } from '@/adapters/supabase/title-repository';
import { localDate } from '@/domain/time';
import {
  loadMoneySummaryData,
  moneySummaryFrom,
  unscheduledCustomersFrom,
} from '@/features/money/use-cases/money-summary';
import { createUser } from '../../scripts/lib/create-user';
import { adminClient, anonClient, uniqueEmail } from './helpers/local-supabase';

const DB_URL = process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const RELIGIOSO = '00000000-0000-4000-8000-000000000201'; // seed
const pool = new pg.Pool({ connectionString: DB_URL, max: 2 });
const admin = adminClient();
const password = 'clave-local-123';
const users: string[] = [];

afterAll(async () => {
  for (const id of users) {
    await pool.query(
      `begin; set local session_replication_role = replica;
       delete from public.payment where owner_id = '${id}';
       delete from public.leader_deposit_event where owner_id = '${id}';
       delete from public.leader_deposit where owner_id = '${id}'; commit;`,
    );
    await pool.query('delete from public.leader_deposit_counter where owner_id = $1', [id]);
    await pool.query('delete from public.copy_event where owner_id = $1', [id]);
    await pool.query('delete from public.copy where owner_id = $1', [id]);
    await pool.query('delete from public.copy_counter where owner_id = $1', [id]);
    await pool.query('delete from public.customer where owner_id = $1', [id]);
    await admin.auth.admin.deleteUser(id);
  }
  await pool.end();
});

const newUser = async (label: string) => {
  const email = uniqueEmail(label);
  const { userId } = await createUser(admin, { email, fullName: label, password });
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  users.push(userId);
  return { owner: userId, client };
};

const summaryOf = async (client: AppSupabaseClient) => {
  const data = await loadMoneySummaryData({
    money: createSupabaseMoneyRepository(() => client),
    customers: createSupabaseCustomerRepository(() => client),
    titles: createSupabaseTitleRepository(() => client),
  });
  if (!data.ok) throw new Error(data.error.code);
  const today = localDate(
    (await pool.query<{ d: string }>('select public.today_bogota()::text as d')).rows[0]!.d,
  );
  return {
    summary: moneySummaryFrom(data.value, today),
    unscheduled: unscheduledCustomersFrom(data.value, today),
  };
};

const newCustomer = async (owner: string, name: string, extra = '') => {
  const id = randomUUID();
  await pool.query('insert into public.customer (id, owner_id, name) values ($1, $2, $3)', [id, owner, name]);
  if (extra) await pool.query(`update public.customer set ${extra} where id = $1`, [id]);
  return id;
};

const sell = (owner: string, customer: string, price: number) =>
  pool.query(
    `insert into public.copy (id, owner_id, title_id, number, status, customer_id, agreed_price, sold_at,
                              public_price_snapshot, colportor_price_snapshot, received_at)
     values ($1, $2, $3, 0, 'sold', $4, $5, now(), $5, 1000, '2026-10-01')`,
    [randomUUID(), owner, RELIGIOSO, customer, price],
  );

const pay = async (owner: string, customer: string, amount: number, method: 'cash' | 'transfer') => {
  const id = randomUUID();
  await pool.query(
    `insert into public.payment (id, owner_id, customer_id, kind, status, paid_at, paid_amount, method)
     values ($1, $2, $3, 'extra', 'collected', public.today_bogota(), $4, $5)`,
    [id, owner, customer, amount, method],
  );
  return id;
};

const schedule = (owner: string, customer: string, amount: number, status = 'scheduled') =>
  pool.query(
    `insert into public.payment (id, owner_id, customer_id, kind, status, agreed_amount, due_date, original_due_date,
                                 canceled_at, cancel_reason)
     values ($1, $2, $3, 'scheduled', $5::public.payment_status, $4, public.today_bogota() + 10, public.today_bogota() + 10,
             case when $5::text = 'canceled' then now() end,
             case when $5::text = 'canceled' then 'manual'::public.cancel_reason end)`,
    [randomUUID(), owner, customer, amount, status],
  );

/** Un Abibono con esos abonos; confirmado (y sus abonos entregados) si se pide, en transacciones reales. */
const deposit = async (
  owner: string,
  payments: string[],
  cash: number,
  transfer: number,
  confirm: boolean,
) => {
  const id = randomUUID();
  const c = await pool.connect();
  try {
    await c.query('begin');
    await c.query(
      'insert into public.leader_deposit (id, owner_id, cash_amount, transfer_amount) values ($1, $2, $3, $4)',
      [id, owner, cash, transfer],
    );
    if (payments.length)
      await c.query('update public.payment set leader_deposit_id = $2 where id = any($1)', [payments, id]);
    await c.query('commit');
    if (confirm) {
      await c.query('begin');
      await c.query(
        `update public.leader_deposit set status = 'confirmed', confirmed_at = now() where id = $1`,
        [id],
      );
      if (payments.length)
        await c.query(`update public.payment set status = 'delivered' where id = any($1)`, [payments]);
      await c.query('commit');
    }
  } finally {
    c.release();
  }
  return id;
};

describe('resumen de Dinero contra Supabase local (HU-DIN-02)', () => {
  it('CA-1: entregado, cobrado por método y por cobrar con porcentajes que suman 100', async () => {
    const { owner, client } = await newUser('hu-din-02-ca1');
    const c = await newCustomer(owner, 'Natalia');
    await sell(owner, c, 3_000_000);
    const delivered = [await pay(owner, c, 1_000_000, 'cash'), await pay(owner, c, 420_000, 'transfer')];
    await deposit(owner, delivered, 1_000_000, 420_000, true);
    await pay(owner, c, 280_000, 'cash');
    await pay(owner, c, 105_000, 'transfer');
    await schedule(owner, c, 500_000);
    await schedule(owner, c, 435_000);
    const { summary } = await summaryOf(client);
    expect(summary).toMatchObject({
      toDeliver: { total: 385_000, cash: 280_000, transfer: 105_000 },
      delivered: { amount: 1_420_000, pct: 52 },
      collected: { amount: 385_000, pct: 14 },
      toCollect: { amount: 935_000, pct: 34 },
      moneyTotal: 2_740_000,
      totalDeliveredToLeader: 1_420_000,
    });
  });

  it('CA-2 y CA-3: en un borrador cuenta por entregar; al confirmar pasa a entregado; un cancelado no cuenta', async () => {
    const { owner, client } = await newUser('hu-din-02-ca2');
    const c = await newCustomer(owner, 'Natalia');
    await sell(owner, c, 200_000);
    const p = await pay(owner, c, 50_000, 'cash');
    await schedule(owner, c, 50_000, 'canceled');
    const id = await deposit(owner, [p], 50_000, 0, false);
    expect((await summaryOf(client)).summary).toMatchObject({
      toDeliver: { total: 50_000 },
      delivered: { amount: 0 },
      toCollect: { amount: 0 },
      moneyTotal: 50_000,
      totalDeliveredToLeader: 0,
    });
    const conn = await pool.connect();
    try {
      await conn.query('begin');
      await conn.query(
        `update public.leader_deposit set status = 'confirmed', confirmed_at = now() where id = $1`,
        [id],
      );
      await conn.query(`update public.payment set status = 'delivered' where id = $1`, [p]);
      await conn.query('commit');
    } finally {
      conn.release();
    }
    expect((await summaryOf(client)).summary).toMatchObject({
      toDeliver: { total: 0 },
      delivered: { amount: 50_000, pct: 100 },
      totalDeliveredToLeader: 50_000,
    });
  });

  it('CA-4 y CA-5: sin programar por cliente, en orden; quien tiene programado de más aporta todo a por cobrar', async () => {
    const { owner, client } = await newUser('hu-din-02-ca4');
    for (const [name, debt] of [
      ['Dora', 50_000],
      ['Ana', 120_000],
      ['Carla', 80_000],
      ['Beto', 90_000],
    ] as const)
      await sell(owner, await newCustomer(owner, name), debt);
    const over = await newCustomer(owner, 'Eva');
    await sell(owner, over, 20_000);
    await schedule(owner, over, 40_000);
    const { summary, unscheduled } = await summaryOf(client);
    expect(summary).toMatchObject({
      unscheduledTotal: 340_000,
      unscheduledCustomers: 4,
      toCollect: { amount: 40_000 },
    });
    expect(unscheduled.map((u) => [u.name, u.unscheduled])).toEqual([
      ['Ana', 120_000],
      ['Beto', 90_000],
      ['Carla', 80_000],
      ['Dora', 50_000],
    ]);
  });

  it('CA-6 y R6: total entregado al líder solo de confirmados; archivados cuentan; descartados no', async () => {
    const { owner, client } = await newUser('hu-din-02-ca6');
    for (const [cash, transfer] of [
      [300_000, 80_000],
      [420_000, 0],
      [0, 310_000],
      [20_000, 0],
      [310_000, 0],
    ] as const)
      await deposit(owner, [], cash, transfer, true);
    await deposit(owner, [], 50_000, 0, false);
    const archived = await newCustomer(owner, 'Archivada');
    await pay(owner, archived, 30_000, 'cash');
    await pool.query('update public.customer set archived_at = now() where id = $1', [archived]);
    const discarded = await newCustomer(owner, 'Descartado');
    await pay(owner, discarded, 99_000, 'cash');
    await pool.query('update public.customer set deleted_at = now() where id = $1', [discarded]);
    const { summary } = await summaryOf(client);
    expect(summary.totalDeliveredToLeader).toBe(1_440_000);
    expect(summary.toDeliver).toEqual({ total: 30_000, cash: 30_000, transfer: 0 });
  });

  it('sin abonos ni Abibonos: todo en 0; no ve lo de otros usuarios', async () => {
    const { client } = await newUser('hu-din-02-vacio');
    const { summary, unscheduled } = await summaryOf(client);
    expect(summary).toMatchObject({ moneyTotal: 0, totalDeliveredToLeader: 0, toDeliver: { total: 0 } });
    expect(unscheduled).toEqual([]);
  });
});
