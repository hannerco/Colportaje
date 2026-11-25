// HU-ABO-05 · Prórroga contra Supabase local, por el mismo camino que la app.
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AppSupabaseClient } from '@/adapters/supabase/client';
import { createSupabasePaymentRepository } from '@/adapters/supabase/payment-repository';
import { farAheadLimit } from '@/domain/manual-schedule';
import { addDays, localDate, type LocalDate } from '@/domain/time';
import { reschedulePayment } from '@/features/payments/use-cases/reschedule';
import { createUser } from '../../scripts/lib/create-user';
import { fakeConnectivity } from '../support/fake-connectivity';
import { adminClient, anonClient, uniqueEmail } from './helpers/local-supabase';

const DB_URL = process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const pool = new pg.Pool({ connectionString: DB_URL, max: 2 });
const admin = adminClient();
const password = 'clave-local-123';
let owner: string;
let customer: string;
let client: AppSupabaseClient;
let today: LocalDate;

beforeAll(async () => {
  const email = uniqueEmail('hu-abo-05');
  owner = (await createUser(admin, { email, fullName: 'Prórroga', password })).userId;
  client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  today = localDate((await pool.query<{ d: string }>('select public.today_bogota()::text as d')).rows[0]!.d);
  customer = randomUUID();
  await pool.query(`insert into public.customer (id, owner_id, name) values ($1, $2, 'Natalia')`, [
    customer,
    owner,
  ]);
});

afterAll(async () => {
  await pool.query('delete from public.payment_reschedule where owner_id = $1', [owner]);
  await pool.query('delete from public.payment where owner_id = $1', [owner]);
  await pool.query('delete from public.customer where owner_id = $1', [owner]);
  await admin.auth.admin.deleteUser(owner);
  await pool.end();
});

const deps = () => ({
  payments: createSupabasePaymentRepository(() => client),
  connectivity: fakeConnectivity(),
  clock: { now: () => new Date(`${today}T12:00:00-05:00`) },
});

/** Un programado con fecha `due` (puede ser pasada: así se ve uno que ya venció). */
const scheduled = async (due: LocalDate) => {
  const id = randomUUID();
  const c = await pool.connect();
  try {
    await c.query('begin');
    await c.query('set local session_replication_role = replica');
    await c.query(
      `insert into public.payment (id, owner_id, customer_id, kind, status, agreed_amount, due_date, original_due_date)
       values ($1, $2, $3, 'scheduled', 'scheduled', 10000, $4, $4)`,
      [id, owner, customer, due],
    );
    await c.query('commit');
  } finally {
    c.release();
  }
  return id;
};

const state = async (id: string) => {
  const p = await pool.query(
    'select due_date::text as due, original_due_date::text as original from public.payment where id = $1',
    [id],
  );
  const r = await pool.query('select 1 from public.payment_reschedule where payment_id = $1', [id]);
  return { ...p.rows[0], reschedules: r.rowCount };
};

describe('prórroga contra Supabase local (HU-ABO-05)', () => {
  it('CA-1 y CA-2: un vencido se prorroga dos veces; la original sigue igual y hay 2 filas de historial', async () => {
    const overdue = addDays(today, -19);
    const id = await scheduled(overdue);
    const first = addDays(today, 10);
    expect(await reschedulePayment(deps(), id, { newDueDate: first })).toEqual({
      ok: true,
      value: { moved: [{ paymentId: id, previousDueDate: overdue, newDueDate: first }] },
    });
    expect(await state(id)).toEqual({ due: first, original: overdue, reschedules: 1 });
    await reschedulePayment(deps(), id, { newDueDate: addDays(today, 25), note: 'Le pagan a fin de mes' });
    expect(await state(id)).toEqual({ due: addDays(today, 25), original: overdue, reschedules: 2 });
  });

  it('ronda 38: hacia atrás y a más de 2 meses se guarda sin confirmar', async () => {
    const id = await scheduled(addDays(today, 25));
    expect((await reschedulePayment(deps(), id, { newDueDate: addDays(today, 15) })).ok).toBe(true);
    const beyond = addDays(farAheadLimit(today), 5);
    expect(
      (await createSupabasePaymentRepository(() => client).reschedule(id, { newDueDate: beyond })).ok,
    ).toBe(true);
    expect(await state(id)).toMatchObject({ due: beyond, reschedules: 2 });
  });

  it('CA-5: prorrogar el primero de tres no mueve los demás; solo él tiene historial', async () => {
    const dues = [addDays(today, 10), addDays(today, 25), addDays(today, 40)];
    const ids = [await scheduled(dues[0]!), await scheduled(dues[1]!), await scheduled(dues[2]!)];
    await reschedulePayment(deps(), ids[0]!, { newDueDate: addDays(today, 15) });
    expect(await state(ids[0]!)).toMatchObject({ due: addDays(today, 15), reschedules: 1 });
    expect(await state(ids[1]!)).toEqual({ due: dues[1], original: dues[1], reschedules: 0 });
    expect(await state(ids[2]!)).toEqual({ due: dues[2], original: dues[2], reschedules: 0 });
  });
});
