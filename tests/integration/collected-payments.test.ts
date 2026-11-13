// HU-ABO-02 · Cuota inicial, abono extra y corrección de cobros contra Supabase local, por el camino de la app.
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AppSupabaseClient } from '@/adapters/supabase/client';
import { createSupabaseCustomerRepository } from '@/adapters/supabase/customer-repository';
import { createSupabasePaymentRepository } from '@/adapters/supabase/payment-repository';
import { localDate } from '@/domain/time';
import {
  deletePayment,
  registerCollectedPayment,
  setCreationDownPayment,
  updateCollectedPayment,
} from '@/features/payments/use-cases/collected-payments';
import { createUser } from '../../scripts/lib/create-user';
import { fakeConnectivity } from '../support/fake-connectivity';
import { adminClient, anonClient, uniqueEmail } from './helpers/local-supabase';

const DB_URL = process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const TITLE = '00000000-0000-4000-8000-000000000101';
const pool = new pg.Pool({ connectionString: DB_URL, max: 2 });
const admin = adminClient();
const password = 'clave-local-123';
let owner: string;
let client: AppSupabaseClient;

beforeAll(async () => {
  const email = uniqueEmail('hu-abo-02');
  owner = (await createUser(admin, { email, fullName: 'Cobros', password })).userId;
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
  payments: createSupabasePaymentRepository(() => client),
  customers: createSupabaseCustomerRepository(() => client),
  connectivity: fakeConnectivity(),
  clock: { now: () => new Date() },
});

/** Cliente con un libro de `debt` y, opcionalmente, programados. */
const customerWith = async (debt: number, scheduled: number[] = []) => {
  const customer = randomUUID();
  await pool.query(`insert into public.customer (id, owner_id, name) values ($1, $2, 'Natalia')`, [
    customer,
    owner,
  ]);
  await pool.query(
    `insert into public.copy (id, owner_id, title_id, number, status, customer_id, agreed_price, sold_at,
                              public_price_snapshot, colportor_price_snapshot, received_at)
     values ($1, $2, $3, 0, 'sold', $4, $5, now(), $5, 1000, '2026-10-01')`,
    [randomUUID(), owner, TITLE, customer, debt],
  );
  for (const [i, amount] of scheduled.entries()) {
    await pool.query(
      `insert into public.payment (id, owner_id, customer_id, kind, status, agreed_amount, due_date, original_due_date)
       values ($1, $2, $3, 'scheduled', 'scheduled', $4, public.today_bogota() + $5::int, public.today_bogota() + $5::int)`,
      [randomUUID(), owner, customer, amount, (i + 1) * 10],
    );
  }
  return customer;
};

const activeDownPayments = async (customer: string) =>
  (
    await pool.query(
      `select paid_amount, method, paid_at::text = public.today_bogota()::text as today
       from public.payment where customer_id = $1 and kind = 'down_payment' and deleted_at is null`,
      [customer],
    )
  ).rows;

describe('cuota inicial, extra y corrección de cobros (HU-ABO-02)', () => {
  it('CA-1 a CA-3: crear 40.000, cambiar a 50.000 y poner $0 en la ficha nueva', async () => {
    const natalia = await customerWith(180_000);
    const paymentId = randomUUID();

    const created = await setCreationDownPayment(deps(), { paymentId, customerId: natalia, amount: 40_000 });
    if (!created.ok) throw new Error(created.error.code);
    expect(created.value.account.balance).toBe(140_000);
    expect(await activeDownPayments(natalia)).toEqual([
      { paid_amount: 40_000, method: 'transfer', today: true },
    ]);

    await setCreationDownPayment(deps(), { paymentId, customerId: natalia, amount: 50_000 });
    expect(await activeDownPayments(natalia)).toEqual([
      { paid_amount: 50_000, method: 'transfer', today: true },
    ]);

    const cleared = await setCreationDownPayment(deps(), { paymentId, customerId: natalia, amount: 0 });
    if (!cleared.ok) throw new Error(cleared.error.code);
    expect(cleared.value.account.balance).toBe(180_000);
    expect(await activeDownPayments(natalia)).toEqual([]);
  });

  it('CA-4: debe 40.000 con 4 × 10.000; un extra de 20.000 queda cobrado y el sobrante es modal de 20.000', async () => {
    const customer = await customerWith(40_000, [10_000, 10_000, 10_000, 10_000]);
    const result = await registerCollectedPayment(deps(), {
      paymentId: randomUUID(),
      customerId: customer,
      kind: 'extra',
      paidAmount: 20_000,
    });
    if (!result.ok) throw new Error(result.error.code);
    expect(result.value.account.balance).toBe(20_000);
    expect(result.value.excess).toMatchObject({
      presentation: 'modal',
      excess: 20_000,
      trigger: 'extra_payment',
    });
  });

  it('CA-5: un cobro de 50.000 en un borrador se corrige a 45.000; el borrador conserva sus montos', async () => {
    const customer = await customerWith(100_000);
    const paymentId = randomUUID();
    await registerCollectedPayment(deps(), {
      paymentId,
      customerId: customer,
      kind: 'extra',
      paidAmount: 50_000,
    });
    const deposit = randomUUID();
    await pool.query(
      `insert into public.leader_deposit (id, owner_id, cash_amount, transfer_amount) values ($1, $2, 0, 50000)`,
      [deposit, owner],
    );
    await pool.query('update public.payment set leader_deposit_id = $2 where id = $1', [paymentId, deposit]);

    const result = await updateCollectedPayment(deps(), paymentId, { paidAmount: 45_000 });
    if (!result.ok) throw new Error(result.error.code);
    expect(result.value.account.paidTotal).toBe(45_000);
    const d = await pool.query(
      'select cash_amount, transfer_amount from public.leader_deposit where id = $1',
      [deposit],
    );
    expect(d.rows[0]).toEqual({ cash_amount: 0, transfer_amount: 50_000 });
    const p = await pool.query('select paid_amount, leader_deposit_id from public.payment where id = $1', [
      paymentId,
    ]);
    expect(p.rows[0]).toEqual({ paid_amount: 45_000, leader_deposit_id: deposit });
  });

  it('CA-6: un cobro de un Abibono confirmado → PAYMENT_LOCKED al editar o borrar', async () => {
    const customer = await customerWith(100_000);
    const paymentId = randomUUID();
    await registerCollectedPayment(deps(), {
      paymentId,
      customerId: customer,
      kind: 'extra',
      paidAmount: 50_000,
    });
    const deposit = randomUUID();
    const c = await pool.connect();
    try {
      await c.query('begin');
      await c.query(`insert into public.leader_deposit (id, owner_id, cash_amount) values ($1, $2, 50000)`, [
        deposit,
        owner,
      ]);
      await c.query('update public.payment set leader_deposit_id = $2 where id = $1', [paymentId, deposit]);
      await c.query(
        `update public.leader_deposit set status = 'confirmed', confirmed_at = now() where id = $1`,
        [deposit],
      );
      await c.query(`update public.payment set status = 'delivered' where id = $1`, [paymentId]);
      await c.query('commit');
    } finally {
      c.release();
    }
    const locked = { ok: false, error: { code: 'PAYMENT_LOCKED', retryable: false } };
    expect(await updateCollectedPayment(deps(), paymentId, { paidAmount: 1 })).toEqual(locked);
    expect(await deletePayment(deps(), paymentId)).toEqual(locked);
  });

  it('CA-7: una fecha real de mañana → VALIDATION en paidAt (también si la valida solo la base)', async () => {
    const customer = await customerWith(100_000);
    const tomorrow = localDate(
      (await pool.query<{ d: string }>('select (public.today_bogota() + 1)::text as d')).rows[0]!.d,
    );
    const viaApp = await registerCollectedPayment(deps(), {
      paymentId: randomUUID(),
      customerId: customer,
      kind: 'extra',
      paidAmount: 1,
      paidAt: tomorrow,
    });
    expect(viaApp).toMatchObject({ ok: false, error: { code: 'VALIDATION', details: { field: 'paidAt' } } });
    const viaBase = await createSupabasePaymentRepository(() => client).registerCollected({
      paymentId: randomUUID(),
      customerId: customer,
      kind: 'extra',
      paidAmount: 1,
      paidAt: tomorrow,
      method: 'cash',
    });
    expect(viaBase).toEqual({
      ok: false,
      error: { code: 'VALIDATION', retryable: false, details: { field: 'paidAt' } },
    });
  });

  it('borrar un cobro devuelve la franja de sobrante (más próximo, motivo manual)', async () => {
    const customer = await customerWith(40_000, [20_000, 20_000]);
    const paymentId = randomUUID();
    await registerCollectedPayment(deps(), {
      paymentId,
      customerId: customer,
      kind: 'extra',
      paidAmount: 30_000,
    });
    // Debe 10.000 y tiene 40.000 programados. Al borrar el cobro vuelve a deber 40.000: sin sobrante.
    const result = await deletePayment(deps(), paymentId);
    if (!result.ok) throw new Error(result.error.code);
    expect(result.value.account.balance).toBe(40_000);
    expect(result.value.excess).toBeNull();
  });
});
