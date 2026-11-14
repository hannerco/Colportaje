// HU-ABO-06 · Cobrar un abono programado contra Supabase local, por el mismo camino que la app.
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AppSupabaseClient } from '@/adapters/supabase/client';
import { createSupabaseCustomerRepository } from '@/adapters/supabase/customer-repository';
import { createSupabasePaymentRepository } from '@/adapters/supabase/payment-repository';
import { addDays, localDate, type LocalDate } from '@/domain/time';
import { collectPayment } from '@/features/payments/use-cases/collect-payment';
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
let today: LocalDate;

beforeAll(async () => {
  const email = uniqueEmail('hu-abo-06');
  owner = (await createUser(admin, { email, fullName: 'Cobrar', password })).userId;
  client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  today = localDate((await pool.query<{ d: string }>('select public.today_bogota()::text as d')).rows[0]!.d);
});

afterAll(async () => {
  await pool.query('delete from public.payment_event where owner_id = $1', [owner]);
  await pool.query('delete from public.payment where owner_id = $1', [owner]);
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
  clock: { now: () => new Date(`${today}T12:00:00-05:00`) },
});

/** Cliente con un libro de `debt` y programados de `amounts` (el primero con fecha hoy + `firstOffset`). */
const customerWith = async (debt: number, amounts: number[], firstOffset = 5) => {
  const customer = randomUUID();
  await pool.query(`insert into public.customer (id, owner_id, name) values ($1, $2, 'Jhon Fredy Ospina')`, [
    customer,
    owner,
  ]);
  await pool.query(
    `insert into public.copy (id, owner_id, title_id, number, status, customer_id, agreed_price, sold_at,
                              public_price_snapshot, colportor_price_snapshot, received_at)
     values ($1, $2, $3, 0, 'sold', $4, $5, now(), $5, 1000, '2026-10-01')`,
    [randomUUID(), owner, TITLE, customer, debt],
  );
  const ids: string[] = [];
  const c = await pool.connect();
  try {
    await c.query('begin');
    // Sin triggers: así puede haber programados ya vencidos.
    await c.query('set local session_replication_role = replica');
    for (const [i, amount] of amounts.entries()) {
      const id = randomUUID();
      const due = addDays(today, firstOffset + i * 15);
      await c.query(
        `insert into public.payment (id, owner_id, customer_id, kind, status, agreed_amount, due_date, original_due_date)
         values ($1, $2, $3, 'scheduled', 'scheduled', $4, $5, $5)`,
        [id, owner, customer, amount, due],
      );
      ids.push(id);
    }
    await c.query('commit');
  } finally {
    c.release();
  }
  return { customer, ids };
};

const paymentsOf = async (customer: string) =>
  (
    await pool.query(
      `select status, agreed_amount, paid_amount, paid_at::text, method from public.payment
       where customer_id = $1 and deleted_at is null order by due_date nulls last`,
      [customer],
    )
  ).rows;

describe('cobrar un abono programado contra Supabase local (HU-ABO-06)', () => {
  it('CA-1: un abono de 40.000 cobrado con los valores por defecto → 40.000, hoy, Transferencia', async () => {
    const { customer, ids } = await customerWith(40_000, [40_000]);
    const result = await collectPayment(deps(), ids[0]!);
    expect(result).toMatchObject({ ok: true, value: { shortfall: null, excess: null } });
    expect(result.ok && result.value.account).toMatchObject({ balance: 0, standing: 'settled' });
    expect(await paymentsOf(customer)).toEqual([
      { status: 'collected', agreed_amount: 40_000, paid_amount: 40_000, paid_at: today, method: 'transfer' },
    ]);
  });

  it('CA-2: cobra 30.000 de 40.000 → faltante 10.000, el saldo los conserva y no hay abono nuevo', async () => {
    const { customer, ids } = await customerWith(40_000, [40_000]);
    const result = await collectPayment(deps(), ids[0]!, { paidAmount: 30_000 });
    expect(result).toMatchObject({ ok: true, value: { shortfall: 10_000, excess: null } });
    expect(result.ok && result.value.account.balance).toBe(10_000);
    expect(await paymentsOf(customer)).toHaveLength(1);
  });

  it('CA-3: acordó 10.000 con otros que suman lo que falta; paga 15.000 → sobrante 5.000, modal, más próximo', async () => {
    const { ids } = await customerWith(40_000, [10_000, 10_000, 10_000, 10_000]);
    const result = await collectPayment(deps(), ids[0]!, { paidAmount: 15_000 });
    expect(result.ok && result.value.excess).toMatchObject({
      trigger: 'overpayment',
      excess: 5_000,
      presentation: 'modal',
      suggestedOrder: 'nearest',
      suggestedPlan: [{ paymentId: ids[1], action: 'reduce', newAmount: 5_000 }],
    });
  });

  it('CA-4: con fecha real de ayer se guarda; con la de mañana → VALIDATION (también en la base)', async () => {
    const { customer, ids } = await customerWith(40_000, [40_000]);
    expect(
      await createSupabasePaymentRepository(() => client).collect(ids[0]!, {
        paidAmount: null,
        paidAt: addDays(today, 1),
        method: 'transfer',
      }),
    ).toEqual({ ok: false, error: { code: 'VALIDATION', retryable: false, details: { field: 'paidAt' } } });
    expect((await collectPayment(deps(), ids[0]!, { paidAt: addDays(today, -1) })).ok).toBe(true);
    expect((await paymentsOf(customer))[0]).toMatchObject({ paid_at: addDays(today, -1) });
  });

  it('CA-5: un abono ya cobrado → PAYMENT_NOT_SCHEDULED; cobrar el vencido saca al cliente de Vencido', async () => {
    const { customer, ids } = await customerWith(40_000, [20_000, 20_000], -10);
    const before = await deps().customers.getAccountData(customer);
    expect(before.ok && before.value.payments).toHaveLength(2);
    const first = await collectPayment(deps(), ids[0]!);
    expect(first.ok && first.value.account.standing).toBe('current');
    expect(await collectPayment(deps(), ids[0]!)).toEqual({
      ok: false,
      error: { code: 'PAYMENT_NOT_SCHEDULED', retryable: false },
    });
  });
});
