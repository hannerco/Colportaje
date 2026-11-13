// HU-ABO-04 · Abonos programados contra Supabase local, por el mismo camino que la app.
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AppSupabaseClient } from '@/adapters/supabase/client';
import { createSupabaseCustomerRepository } from '@/adapters/supabase/customer-repository';
import { createSupabasePaymentRepository } from '@/adapters/supabase/payment-repository';
import { localDate, type LocalDate } from '@/domain/time';
import { deletePayment } from '@/features/payments/use-cases/collected-payments';
import {
  cancelScheduledPayments,
  correctScheduledDate,
  scheduleSinglePayment,
  updateScheduledAmount,
} from '@/features/payments/use-cases/scheduled-payments';
import { createUser } from '../../scripts/lib/create-user';
import { fakeConnectivity } from '../support/fake-connectivity';
import { adminClient, anonClient, uniqueEmail } from './helpers/local-supabase';

const DB_URL = process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const pool = new pg.Pool({ connectionString: DB_URL, max: 2 });
const admin = adminClient();
const password = 'clave-local-123';
let owner: string;
let client: AppSupabaseClient;

beforeAll(async () => {
  const email = uniqueEmail('hu-abo-04');
  owner = (await createUser(admin, { email, fullName: 'Programados', password })).userId;
  client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
});

afterAll(async () => {
  await pool.query('delete from public.payment_event where owner_id = $1', [owner]);
  await pool.query('delete from public.payment_reschedule where owner_id = $1', [owner]);
  await pool.query('delete from public.payment where owner_id = $1', [owner]);
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

const day = async (offset: number): Promise<LocalDate> =>
  localDate(
    (await pool.query<{ d: string }>('select (public.today_bogota() + $1::int)::text as d', [offset]))
      .rows[0]!.d,
  );

const newCustomer = async () => {
  const id = randomUUID();
  await pool.query(`insert into public.customer (id, owner_id, name) values ($1, $2, 'Natalia')`, [
    id,
    owner,
  ]);
  return id;
};

const dates = async (id: string) =>
  (
    await pool.query(
      'select due_date::text as due, original_due_date::text as original from public.payment where id = $1',
      [id],
    )
  ).rows[0];

describe('abonos programados contra Supabase local (HU-ABO-04)', () => {
  it('CA-1: a un prospecto sin libros se le programa 50.000 → "Aún no tiene libro" y sobrante de 50.000 en franja', async () => {
    const customer = await newCustomer();
    const result = await scheduleSinglePayment(deps(), {
      paymentId: randomUUID(),
      customerId: customer,
      agreedAmount: 50_000,
      dueDate: await day(7),
    });
    if (!result.ok) throw new Error(result.error.code);
    expect(result.value.account.notices).toEqual({ noBook: true, excess: true });
    expect(result.value.excess).toMatchObject({ excess: 50_000, presentation: 'banner' });
  });

  it('CA-2: un programado de 35.000 se edita a 35.500', async () => {
    const customer = await newCustomer();
    const id = randomUUID();
    await scheduleSinglePayment(deps(), {
      paymentId: id,
      customerId: customer,
      agreedAmount: 35_000,
      dueDate: await day(5),
    });
    const result = await updateScheduledAmount(deps(), id, 35_500);
    if (!result.ok) throw new Error(result.error.code);
    expect(result.value.account.scheduledTotal).toBe(35_500);
  });

  it('CA-3: corregir el segundo de cuatro mueve su fecha y su original; los demás no cambian; sin prórroga', async () => {
    const customer = await newCustomer();
    const ids = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
    const dues = [await day(10), await day(24), await day(38), await day(52)];
    for (const [i, id] of ids.entries()) {
      await scheduleSinglePayment(deps(), {
        paymentId: id,
        customerId: customer,
        agreedAmount: 10_000,
        dueDate: dues[i]!,
      });
    }
    const corrected = await day(28);
    expect(await correctScheduledDate(deps(), ids[1]!, corrected)).toEqual({ ok: true, value: undefined });
    expect(await dates(ids[1]!)).toEqual({ due: corrected, original: corrected });
    for (const i of [0, 2, 3]) expect(await dates(ids[i]!)).toEqual({ due: dues[i], original: dues[i] });
    const r = await pool.query('select 1 from public.payment_reschedule where payment_id = any($1::uuid[])', [
      ids,
    ]);
    expect(r.rowCount).toBe(0);
  });

  it('CA-4: con fecha de ayer → VALIDATION (también si la valida solo la base)', async () => {
    const customer = await newCustomer();
    const yesterday = await day(-1);
    const viaBase = await createSupabasePaymentRepository(() => client).scheduleSingle({
      paymentId: randomUUID(),
      customerId: customer,
      agreedAmount: 1,
      dueDate: yesterday,
    });
    expect(viaBase).toEqual({
      ok: false,
      error: { code: 'VALIDATION', retryable: false, details: { field: 'dueDate' } },
    });
    const id = randomUUID();
    await scheduleSinglePayment(deps(), {
      paymentId: id,
      customerId: customer,
      agreedAmount: 1,
      dueDate: await day(3),
    });
    expect(
      await createSupabasePaymentRepository(() => client).correctScheduledDate(id, yesterday),
    ).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION', details: { field: 'dueDate' } },
    });
  });

  it('CA-5: un programado cancelado queda cancelado (Cancelados) y no cuenta en lo programado; borrar lo saca', async () => {
    const customer = await newCustomer();
    const canceled = randomUUID();
    const deleted = randomUUID();
    await scheduleSinglePayment(deps(), {
      paymentId: canceled,
      customerId: customer,
      agreedAmount: 30_000,
      dueDate: await day(5),
    });
    await scheduleSinglePayment(deps(), {
      paymentId: deleted,
      customerId: customer,
      agreedAmount: 20_000,
      dueDate: await day(9),
    });
    const result = await cancelScheduledPayments(deps(), [canceled]);
    if (!result.ok) throw new Error(result.error.code);
    expect(result.value.account.scheduledTotal).toBe(20_000);
    const { rows } = await pool.query('select status, cancel_reason from public.payment where id = $1', [
      canceled,
    ]);
    expect(rows[0]).toEqual({ status: 'canceled', cancel_reason: 'manual' });

    const afterDelete = await deletePayment(deps(), deleted);
    if (!afterDelete.ok) throw new Error(afterDelete.error.code);
    expect(afterDelete.value.account.scheduledTotal).toBe(0);
  });

  it('un abono cobrado no se edita ni se corrige → PAYMENT_NOT_SCHEDULED', async () => {
    const customer = await newCustomer();
    const id = randomUUID();
    await scheduleSinglePayment(deps(), {
      paymentId: id,
      customerId: customer,
      agreedAmount: 10_000,
      dueDate: await day(5),
    });
    await pool.query(
      `update public.payment set status = 'collected', paid_amount = 10000, paid_at = public.today_bogota(), method = 'cash' where id = $1`,
      [id],
    );
    const notScheduled = { ok: false, error: { code: 'PAYMENT_NOT_SCHEDULED', retryable: false } };
    expect(await updateScheduledAmount(deps(), id, 9_000)).toEqual(notScheduled);
    expect(await correctScheduledDate(deps(), id, await day(8))).toEqual(notScheduled);
  });
});
