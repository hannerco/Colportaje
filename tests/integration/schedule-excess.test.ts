// HU-ABO-07 · Abonos que no cuadran contra Supabase local, por el mismo camino que la app
// (evaluación en el dominio → caso de uso → función resolve_schedule_excess → cuenta recalculada).
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AppSupabaseClient } from '@/adapters/supabase/client';
import { createSupabaseCustomerRepository } from '@/adapters/supabase/customer-repository';
import { createSupabasePaymentRepository } from '@/adapters/supabase/payment-repository';
import { computeCustomerAccount } from '@/domain/customer';
import { evaluateScheduleExcess, scheduledForExcess } from '@/domain/schedule-excess';
import { localDate, type Clock, type LocalDate } from '@/domain/time';
import { resolveScheduleExcess } from '@/features/payments/use-cases/resolve-schedule-excess';
import { createUser } from '../../scripts/lib/create-user';
import { fakeConnectivity } from '../support/fake-connectivity';
import { adminClient, anonClient, uniqueEmail } from './helpers/local-supabase';

const DB_URL = process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const TITLE = '00000000-0000-4000-8000-000000000101';

const pool = new pg.Pool({ connectionString: DB_URL, max: 2 });
const admin = adminClient();
const email = uniqueEmail('hu-abo-07');
const password = 'clave-local-123';
let owner: string;
let client: AppSupabaseClient;
let today: LocalDate;
let clock: Clock;

beforeAll(async () => {
  owner = (await createUser(admin, { email, fullName: 'Abonos que no cuadran', password })).userId;
  client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  today = localDate((await pool.query<{ d: string }>(`select public.today_bogota()::text as d`)).rows[0]!.d);
  clock = { now: () => new Date(`${today}T12:00:00-05:00`) };
});

afterAll(async () => {
  await pool.query('delete from public.payment_event where owner_id = $1', [owner]);
  await pool.query('delete from public.payment_reschedule where owner_id = $1', [owner]);
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
  clock,
});

/** Cliente con un libro vendido por `debt` y 4 programados de 10.000 a 10, 20, 30 y 40 días. */
const customerWith = async (debt: number) => {
  const customer = randomUUID();
  await pool.query(`insert into public.customer (id, owner_id, name) values ($1, $2, 'Clienta')`, [
    customer,
    owner,
  ]);
  await pool.query(
    `insert into public.copy (id, owner_id, title_id, number, status, customer_id, agreed_price, sold_at,
                              public_price_snapshot, colportor_price_snapshot)
     values ($1, $2, $3, 0, 'sold', $4, $5, now(), 75000, 37500)`,
    [randomUUID(), owner, TITLE, customer, debt],
  );
  const ids: string[] = [];
  for (const i of [1, 2, 3, 4]) {
    const id = randomUUID();
    await pool.query(
      `insert into public.payment (id, owner_id, customer_id, kind, status, agreed_amount, due_date, original_due_date)
       values ($1, $2, $3, 'scheduled', 'scheduled', 10000, public.today_bogota() + $4 * 10, public.today_bogota() + $4 * 10)`,
      [id, owner, customer, i],
    );
    ids.push(id);
  }
  return { customer, ids };
};

/** Lo que haría el front: leer la cuenta y evaluar con el disparador. */
const evaluate = async (customer: string) => {
  const data = await deps().customers.getAccountData(customer);
  if (!data.ok) throw new Error(data.error.code);
  const account = computeCustomerAccount(data.value, today);
  return evaluateScheduleExcess(account, scheduledForExcess(data.value.payments), 'review');
};

const scheduledAmounts = async (customer: string) =>
  (
    await pool.query<{ status: string; agreed_amount: number }>(
      `select status, agreed_amount from public.payment where customer_id = $1 order by due_date`,
      [customer],
    )
  ).rows.map((r) => [r.status, r.agreed_amount]);

describe('abonos que no cuadran contra Supabase local (HU-ABO-07)', () => {
  it('CA-3: sobrante 15.000 → cancela uno, el siguiente baja a 5.000 con su evento, y la cuenta queda sin sobrante', async () => {
    const { customer, ids } = await customerWith(25_000);
    expect((await evaluate(customer))?.excess).toBe(15_000);

    const result = await resolveScheduleExcess(
      deps(),
      customer,
      { action: 'auto_trim', order: 'nearest' },
      'review',
    );
    if (!result.ok) throw new Error(result.error.code);
    expect(result.value.account).toMatchObject({ balance: 25_000, scheduledTotal: 25_000, excess: 0 });
    expect(result.value.account.notices.excess).toBe(false);
    expect(await scheduledAmounts(customer)).toEqual([
      ['canceled', 10_000],
      ['scheduled', 5_000],
      ['scheduled', 10_000],
      ['scheduled', 10_000],
    ]);
    // El usuario lee el historial del recorte (RLS de payment_event).
    const { data, error } = await client.from('payment_event').select('type, data').eq('payment_id', ids[1]!);
    expect(error).toBeNull();
    expect(data).toEqual([
      { type: 'amount_reduced', data: { trigger: 'review', previousAmount: 10_000, newAmount: 5_000 } },
    ]);
  });

  it('CA-6: dejar como está con saldo 20.000 y programados 40.000 → nada cambia y la cuenta conserva el aviso', async () => {
    const { customer } = await customerWith(20_000);
    const before = await scheduledAmounts(customer);
    const result = await resolveScheduleExcess(deps(), customer, { action: 'leave' }, 'review');
    if (!result.ok) throw new Error(result.error.code);
    expect(result.value.account).toMatchObject({ remaining: 20_000, scheduledTotal: 40_000, excess: 20_000 });
    expect(result.value.account.notices.excess).toBe(true);
    expect(await scheduledAmounts(customer)).toEqual(before);
  });

  it('CA-7: otro dispositivo cobra uno entre la evaluación y el recorte → el servidor recorta sobre lo vigente', async () => {
    const { customer, ids } = await customerWith(30_000);
    expect((await evaluate(customer))?.suggestedPlan).toEqual([{ paymentId: ids[3], action: 'cancel' }]);
    // Otro teléfono cobra el más próximo por 15.000: el sobrante pasa de 10.000 a 15.000.
    await pool.query(
      `update public.payment set status = 'collected', paid_amount = 15000, paid_at = public.today_bogota(),
              method = 'cash' where id = $1`,
      [ids[0]],
    );
    const result = await resolveScheduleExcess(
      deps(),
      customer,
      { action: 'auto_trim', order: 'farthest' },
      'review',
    );
    if (!result.ok) throw new Error(result.error.code);
    expect(result.value.account.excess).toBe(0);
    expect(await scheduledAmounts(customer)).toEqual([
      ['collected', 10_000],
      ['scheduled', 10_000],
      ['scheduled', 5_000],
      ['canceled', 10_000],
    ]);
  });

  it('CA-7: si ya no hay sobrante → CONFLICT; dejar como está sin sobrante → NO_EXCESS', async () => {
    const { customer } = await customerWith(40_000);
    expect(
      await resolveScheduleExcess(deps(), customer, { action: 'auto_trim', order: 'nearest' }, 'review'),
    ).toEqual({ ok: false, error: { code: 'CONFLICT', retryable: false } });
    expect(await resolveScheduleExcess(deps(), customer, { action: 'leave' }, 'review')).toEqual({
      ok: false,
      error: { code: 'NO_EXCESS', retryable: false },
    });
  });

  it('CA-4 (ronda 38): saldo 0 → dejar como está se permite; opción inválida → VALIDATION; cliente ajeno → NOT_FOUND', async () => {
    const { customer } = await customerWith(0);
    expect((await resolveScheduleExcess(deps(), customer, { action: 'leave' }, 'review')).ok).toBe(true);
    expect(
      await createSupabasePaymentRepository(() => client).resolveScheduleExcess(
        customer,
        { action: 'cancel_selected', paymentIds: [] },
        'review',
      ),
    ).toEqual({ ok: false, error: { code: 'VALIDATION', retryable: false, details: { field: 'choice' } } });
    expect(await resolveScheduleExcess(deps(), randomUUID(), { action: 'leave' }, 'review')).toEqual({
      ok: false,
      error: { code: 'NOT_FOUND', retryable: false },
    });
  });
});
