// HU-ABO-08 · Abonos programados con fecha pasada: lo nuevo (plan con primer abono pasado, abono que nace
// vencido) y lo que NO debe cambiar (la fecha real de un cobro sigue sin poder ser futura). Las demás reglas
// ajustadas se prueban en payment.test.ts, scheduled-payments.test.ts, payment-plan.test.ts y reschedule.test.ts.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { isOverdue, overdueDays } from '@/domain/payment';
import { buildPaymentPlan, withPaymentIds } from '@/domain/payment-plan';
import { addDays, localDate, type LocalDate } from '@/domain/time';
import { asUser, assertDatabaseReachable, createUser, inTransaction, pool, type Tx } from './helpers/db';

const TITLE = '00000000-0000-4000-8000-000000000101';

beforeAll(assertDatabaseReachable);
afterAll(() => pool.end());

type Outcome = { ok: true } | { ok: false; code: string; detail?: string };

const call = (tx: Tx, user: string, sql: string, params: unknown[]) =>
  asUser(tx, user, async (): Promise<Outcome> => {
    await tx.query('savepoint fn');
    try {
      await tx.query(sql, params);
      await tx.query('release savepoint fn');
      return { ok: true };
    } catch (error) {
      await tx.query('rollback to savepoint fn');
      const e = error as { message: string; detail?: string };
      return { ok: false, code: e.message.split(':')[0]!, detail: e.detail };
    }
  });

const todayOf = async (tx: Tx) =>
  localDate((await tx.query<{ d: string }>('select public.today_bogota()::text as d')).rows[0]!.d);

/** Natalia debe `debt` (un libro vendido por ese valor). */
const setup = async (tx: Tx, debt: number) => {
  const owner = await createUser(tx);
  const customer = randomUUID();
  await tx.query(
    `insert into public.customer (id, owner_id, name, updated_at) values ($1, $2, 'Natalia', '2026-01-01')`,
    [customer, owner],
  );
  await tx.query(
    `insert into public.copy (id, owner_id, title_id, number, status, customer_id, agreed_price, sold_at,
                              public_price_snapshot, colportor_price_snapshot, received_at)
     values ($1, $2, $3, 0, 'sold', $4, $5, now() - interval '60 days', $5, 1000, current_date - 90)`,
    [randomUUID(), owner, TITLE, customer, debt],
  );
  return { owner, customer };
};

const scheduledOf = async (tx: Tx, customer: string) =>
  (
    await tx.query<{ status: 'scheduled'; due: LocalDate; amount: number }>(
      `select status, due_date::text as due, agreed_amount as amount from public.payment
       where customer_id = $1 and kind = 'scheduled' and deleted_at is null order by due_date`,
      [customer],
    )
  ).rows;

describe('abonos programados con fecha pasada (HU-ABO-08)', () => {
  it('CA-1: un abono de 30.000 de ayer existe por cobrar y la lectura lo marca vencido hace 1 día', () =>
    inTransaction(async (tx) => {
      const today = await todayOf(tx);
      const { owner, customer } = await setup(tx, 100_000);
      const yesterday = addDays(today, -1);
      expect(
        await call(tx, owner, 'select public.schedule_single_payment($1, $2, $3, $4::date)', [
          randomUUID(),
          customer,
          30_000,
          yesterday,
        ]),
      ).toEqual({ ok: true });
      const [row] = await scheduledOf(tx, customer);
      expect(row).toEqual({ status: 'scheduled', due: yesterday, amount: 30_000 });
      const payment = { status: row!.status, dueDate: row!.due };
      expect(isOverdue(payment, today)).toBe(true);
      expect(overdueDays(payment, today)).toBe(1);
    }));

  it('CA-5 / R4: quincenal con primer abono hace 40 días, saldo 100.000 en abonos de 50.000 → 2 abonos, ambos vencidos', () =>
    inTransaction(async (tx) => {
      const today = await todayOf(tx);
      const { owner, customer } = await setup(tx, 100_000);
      const plan = buildPaymentPlan({
        base: 100_000,
        amount: 50_000,
        frequency: 'biweekly',
        firstDueDate: addDays(today, -40),
      });
      if (!plan.ok) throw new Error(plan.error.code);
      const items = withPaymentIds(plan.value, randomUUID).map((i) => ({
        paymentId: i.paymentId,
        dueDate: i.dueDate,
        amount: i.amount,
      }));
      expect(
        await call(tx, owner, 'select public.apply_payment_plan($1, $2, $3::jsonb)', [
          customer,
          'replace_all',
          JSON.stringify(items),
        ]),
      ).toEqual({ ok: true });
      const rows = await scheduledOf(tx, customer);
      expect(rows.map((r) => [r.due, r.amount])).toEqual(plan.value.map((i) => [i.dueDate, i.amount]));
      expect(rows).toHaveLength(2);
      for (const r of rows) expect(isOverdue({ status: r.status, dueDate: r.due }, today)).toBe(true);
    }));

  it('el plan sigue rechazando una fecha que no existe', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx, 60_000);
      expect(
        await call(tx, owner, 'select public.apply_payment_plan($1, $2, $3::jsonb)', [
          customer,
          'replace_all',
          JSON.stringify([{ paymentId: randomUUID(), dueDate: '2026-02-31', amount: 60_000 }]),
        ]),
      ).toMatchObject({ ok: false, code: 'VALIDATION', detail: 'dueDate' });
    }));

  it('CA-6: cobrar con fecha real de mañana sigue siendo un error (no futura)', () =>
    inTransaction(async (tx) => {
      const today = await todayOf(tx);
      const { owner, customer } = await setup(tx, 100_000);
      const id = randomUUID();
      await call(tx, owner, 'select public.schedule_single_payment($1, $2, $3, $4::date)', [
        id,
        customer,
        30_000,
        addDays(today, -3),
      ]);
      const outcome = await call(tx, owner, 'select * from public.collect_payment($1, null, $2::date)', [
        id,
        addDays(today, 1),
      ]);
      expect(outcome).toMatchObject({ ok: false, code: 'VALIDATION' });
      expect((await scheduledOf(tx, customer))[0]!.status).toBe('scheduled');
    }));
});
