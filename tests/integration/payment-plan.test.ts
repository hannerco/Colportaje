// HU-ABO-03 · Plan de abonos contra Supabase local, por el mismo camino que la app
// (cuenta → planBase → buildPaymentPlan → withPaymentIds → applyPaymentPlan).
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AppSupabaseClient } from '@/adapters/supabase/client';
import { createSupabaseCustomerRepository } from '@/adapters/supabase/customer-repository';
import { createSupabasePaymentRepository } from '@/adapters/supabase/payment-repository';
import { computeCustomerAccount } from '@/domain/customer';
import {
  buildPaymentPlan,
  planBase,
  suggestFirstDueDate,
  withPaymentIds,
  type PlanMode,
} from '@/domain/payment-plan';
import { localDate, type LocalDate } from '@/domain/time';
import { applyPaymentPlan } from '@/features/payments/use-cases/payment-plan';
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
  const email = uniqueEmail('hu-abo-03');
  owner = (await createUser(admin, { email, fullName: 'Plan', password })).userId;
  client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  today = localDate((await pool.query<{ d: string }>('select public.today_bogota()::text as d')).rows[0]!.d);
});

afterAll(async () => {
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

const customerOwing = async (debt: number) => {
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
  return customer;
};

/** Lo que hace la app: lee la cuenta, arma el plan sobre la base del modo y lo aplica. */
const planFor = async (customer: string, mode: PlanMode, amount: number) => {
  const data = await deps().customers.getAccountData(customer);
  if (!data.ok) throw new Error(data.error.code);
  const base = planBase(computeCustomerAccount(data.value, today), mode);
  const plan = buildPaymentPlan({
    base,
    amount,
    frequency: 'biweekly',
    firstDueDate: suggestFirstDueDate('biweekly', today),
  });
  if (!plan.ok) throw new Error(plan.error.code);
  return applyPaymentPlan(deps(), {
    customerId: customer,
    mode,
    items: withPaymentIds(plan.value, randomUUID),
  });
};

const activeScheduled = async (customer: string) =>
  (
    await pool.query<{ agreed_amount: number }>(
      `select agreed_amount from public.payment
       where customer_id = $1 and status = 'scheduled' and deleted_at is null order by created_at, due_date`,
      [customer],
    )
  ).rows.map((r) => r.agreed_amount);

describe('plan de abonos contra Supabase local (HU-ABO-03)', () => {
  it('CA-7: en creación con un plan de 4 abonos, cambiar el valor a 70.000 deja solo los 2 nuevos', async () => {
    const natalia = await customerOwing(140_000);
    await planFor(natalia, 'replace_all', 35_000);
    expect(await activeScheduled(natalia)).toEqual([35_000, 35_000, 35_000, 35_000]);
    const result = await planFor(natalia, 'replace_all', 70_000);
    if (!result.ok) throw new Error(result.error.code);
    expect(await activeScheduled(natalia)).toEqual([70_000, 70_000]);
    expect(result.value.account).toMatchObject({ scheduledTotal: 140_000, unscheduled: 0 });
  });

  it('CA-8: debe 100.000 con 40.000 programados; un plan de 30.000 sin programar crea 30.000 + 30.000', async () => {
    const customer = await customerOwing(100_000);
    await pool.query(
      `insert into public.payment (id, owner_id, customer_id, kind, status, agreed_amount, due_date, original_due_date)
       values ($1, $2, $3, 'scheduled', 'scheduled', 40000, public.today_bogota() + 3, public.today_bogota() + 3)`,
      [randomUUID(), owner, customer],
    );
    const result = await planFor(customer, 'unscheduled_only', 30_000);
    if (!result.ok) throw new Error(result.error.code);
    expect(await activeScheduled(customer)).toEqual([40_000, 30_000, 30_000]);
    expect(result.value.account).toMatchObject({ scheduledTotal: 100_000, unscheduled: 0 });
  });

  it('PLAN_TOTAL_MISMATCH si la cuenta cambió entre la vista previa y el guardado', async () => {
    const customer = await customerOwing(60_000);
    const stale = [
      { paymentId: randomUUID(), dueDate: suggestFirstDueDate('monthly', today), amount: 50_000 },
    ];
    expect(
      await applyPaymentPlan(deps(), { customerId: customer, mode: 'replace_all', items: stale }),
    ).toEqual({
      ok: false,
      error: { code: 'PLAN_TOTAL_MISMATCH', retryable: false },
    });
  });
});
