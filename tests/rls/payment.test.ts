import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PAYMENT_ACTIONS, PAYMENT_TRANSITIONS, type PaymentStatus } from '@/domain/payment';
import {
  asUser,
  assertDatabaseReachable,
  createUser,
  expectError,
  inTransaction,
  pool,
  type Tx,
} from './helpers/db';

const RAISED = 'P0001';
const CHECK_VIOLATION = '23514';
const FK_VIOLATION = '23503';
const INSUFFICIENT_PRIVILEGE = '42501';
const STATUSES: PaymentStatus[] = ['scheduled', 'collected', 'delivered', 'canceled'];

beforeAll(assertDatabaseReachable);
afterAll(() => pool.end());

type Row = Record<string, unknown>;

/** Fechas relativas a "hoy" en Bogotá, calculadas por la propia base. */
const day = async (tx: Tx, offset: number) =>
  (await tx.query<{ d: string }>(`select (public.today_bogota() + $1::int)::text as d`, [offset])).rows[0]!.d;

const defaultsFor = async (tx: Tx, status: PaymentStatus, kind = 'scheduled'): Promise<Row> => {
  const future = await day(tx, 10);
  const today = await day(tx, 0);
  if (kind === 'down_payment') {
    return {
      kind,
      status,
      paid_amount: 40_000,
      paid_at: today,
      method: 'transfer',
      due_date: today,
      original_due_date: today,
    };
  }
  if (kind === 'extra') return { kind, status, paid_amount: 20_000, paid_at: today, method: 'cash' };
  const base: Row = { kind, status, agreed_amount: 60_000, due_date: future, original_due_date: future };
  if (status === 'collected' || status === 'delivered')
    return { ...base, paid_amount: 60_000, paid_at: today, method: 'transfer' };
  if (status === 'canceled')
    return { ...base, canceled_at: new Date().toISOString(), cancel_reason: 'manual' };
  return base;
};

const insertPayment = async (tx: Tx, owner: string, customer: string, row: Row) => {
  const values: Row = { id: randomUUID(), owner_id: owner, customer_id: customer, ...row };
  const keys = Object.keys(values);
  await tx.query(
    `insert into public.payment (${keys.join(', ')}) values (${keys.map((_, i) => `$${i + 1}`).join(', ')})`,
    Object.values(values),
  );
  return values.id as string;
};

const setup = async (tx: Tx) => {
  const owner = await createUser(tx);
  const customer = randomUUID();
  await tx.query(`insert into public.customer (id, owner_id, name) values ($1, $2, 'Clienta')`, [
    customer,
    owner,
  ]);
  return { owner, customer };
};

/** Error al insertar (con savepoint para seguir usando la transacción). */
const insertError = async (tx: Tx, owner: string, customer: string, row: Row) => {
  await tx.query('savepoint s');
  try {
    await insertPayment(tx, owner, customer, row);
  } catch (error) {
    await tx.query('rollback to savepoint s');
    return { code: (error as { code?: string }).code, message: (error as Error).message };
  }
  throw new Error(`Se esperaba un error al insertar ${JSON.stringify(row)}`);
};

describe('payment: checks (HU-ABO-01 R1–R3)', () => {
  it('CA-2: un abono programado sin fecha acordada se rechaza', async () => {
    await inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const row = { ...(await defaultsFor(tx, 'scheduled')), due_date: null, original_due_date: null };
      expect((await insertError(tx, owner, customer, row)).code).toBe(CHECK_VIOLATION);
    });
  });

  it.each([
    ['R1: por cobrar sin valor acordado', 'scheduled', 'scheduled', { agreed_amount: null }],
    ['R1: cuota inicial en estado por cobrar', 'scheduled', 'down_payment', {}],
    ['R2: cobrado sin método', 'collected', 'scheduled', { method: null }],
    ['R2: cobrado sin fecha real', 'collected', 'scheduled', { paid_at: null }],
    ['R2: valor real 0', 'collected', 'scheduled', { paid_amount: 0 }],
    ['R3: cancelado sin motivo', 'canceled', 'scheduled', { cancel_reason: null }],
    [
      'BR-PAY-03: abono extra con fecha acordada',
      'collected',
      'extra',
      { due_date: '2026-01-01', original_due_date: '2026-01-01' },
    ],
    [
      'BR-PAY-03: cuota inicial con fecha acordada distinta de la de pago',
      'collected',
      'down_payment',
      { due_date: '2026-01-01' },
    ],
  ] as const)('%s se rechaza', async (_label, status, kind, overrides) => {
    await inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const row = { ...(await defaultsFor(tx, status, kind)), ...overrides };
      expect((await insertError(tx, owner, customer, row)).code).toBe(CHECK_VIOLATION);
    });
  });

  it('acepta los tres tipos bien formados (cuota inicial, programado, extra)', async () => {
    await inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      await insertPayment(tx, owner, customer, await defaultsFor(tx, 'collected', 'down_payment'));
      await insertPayment(tx, owner, customer, await defaultsFor(tx, 'scheduled'));
      await insertPayment(tx, owner, customer, await defaultsFor(tx, 'collected', 'extra'));
    });
  });

  it('un abono no puede ser del cliente de otro usuario', async () => {
    await inTransaction(async (tx) => {
      const a = await setup(tx);
      const b = await setup(tx);
      expect((await insertError(tx, a.owner, b.customer, await defaultsFor(tx, 'scheduled'))).code).toBe(
        FK_VIOLATION,
      );
    });
  });
});

describe('payment: fechas (HU-ABO-01 R4–R6)', () => {
  it('HU-ABO-08 R3: un programado nuevo con fecha de ayer se acepta (nace vencido); con fecha de hoy, también', async () => {
    await inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const yesterday = await day(tx, -1);
      const past = await insertPayment(tx, owner, customer, {
        ...(await defaultsFor(tx, 'scheduled')),
        due_date: yesterday,
        original_due_date: yesterday,
      });
      const saved = await tx.query(`select status, due_date::text as due from public.payment where id = $1`, [
        past,
      ]);
      expect(saved.rows[0]).toEqual({ status: 'scheduled', due: yesterday });
      const today = await day(tx, 0);
      await insertPayment(tx, owner, customer, {
        ...(await defaultsFor(tx, 'scheduled')),
        due_date: today,
        original_due_date: today,
      });
    });
  });

  it('BR-PAY-03: un programado nace con fecha original igual a la acordada', async () => {
    await inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const error = await insertError(tx, owner, customer, {
        ...(await defaultsFor(tx, 'scheduled')),
        original_due_date: await day(tx, 20),
      });
      expect(error.message).toMatch(/^INVALID_ORIGINAL_DUE_DATE/);
    });
  });

  it('HU-ABO-08 R3: cambiar la fecha a una pasada se acepta; editar otros campos de un abono vencido sí se permite', async () => {
    await inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = await insertPayment(tx, owner, customer, await defaultsFor(tx, 'scheduled'));
      await tx.query('update public.payment set due_date = public.today_bogota() - 1 where id = $1', [id]);
      const moved = await tx.query(
        `select due_date = public.today_bogota() - 1 as yesterday from public.payment where id = $1`,
        [id],
      );
      expect(moved.rows[0].yesterday).toBe(true);

      // Un abono que nació vencido (ya no hace falta saltar los triggers).
      const past = await day(tx, -5);
      const overdue = await insertPayment(tx, owner, customer, {
        ...(await defaultsFor(tx, 'scheduled')),
        due_date: past,
        original_due_date: past,
      });
      await tx.query('update public.payment set agreed_amount = 70000 where id = $1', [overdue]);
      await tx.query(
        `update public.payment set status = 'collected', paid_amount = 70000, paid_at = public.today_bogota(), method = 'cash' where id = $1`,
        [overdue],
      );
    });
  });

  it('R6: la fecha real no puede ser futura', async () => {
    await inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const tomorrow = await day(tx, 1);
      const error = await insertError(tx, owner, customer, {
        ...(await defaultsFor(tx, 'collected', 'extra')),
        paid_at: tomorrow,
      });
      expect(error.message).toMatch(/^PAID_AT_IN_FUTURE/);
      const id = await insertPayment(tx, owner, customer, await defaultsFor(tx, 'scheduled'));
      expect(
        await expectError(
          tx,
          `update public.payment set status = 'collected', paid_amount = 1, paid_at = public.today_bogota() + 1, method = 'cash' where id = $1`,
          [id],
        ),
      ).toBe(RAISED);
    });
  });

  it('R4: la fecha original no cambia; en una corrección durante la creación cambia junto con la acordada, sin prórroga', async () => {
    await inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = await insertPayment(tx, owner, customer, await defaultsFor(tx, 'scheduled'));
      expect(
        await expectError(
          tx,
          'update public.payment set original_due_date = public.today_bogota() + 20 where id = $1',
          [id],
        ),
      ).toBe(RAISED);

      await tx.query(`select set_config('colportor.payment_correction', 'on', true)`);
      await tx.query(
        `update public.payment set due_date = public.today_bogota() + 20, original_due_date = public.today_bogota() + 20 where id = $1`,
        [id],
      );
      await tx.query(`select set_config('colportor.payment_correction', '', true)`);
      const { rows } = await tx.query(
        'select count(*)::int as n from public.payment_reschedule where payment_id = $1',
        [id],
      );
      expect(rows).toEqual([{ n: 0 }]);
    });
  });
});

describe('payment: transiciones con la misma tabla que el dominio (HU-ABO-01, BR-PAY-02)', () => {
  const domainAllows = (from: PaymentStatus, to: PaymentStatus) =>
    PAYMENT_ACTIONS.some((a) => PAYMENT_TRANSITIONS[a].from === from && PAYMENT_TRANSITIONS[a].to === to);
  const pairs = STATUSES.flatMap((from) =>
    STATUSES.filter((to) => to !== from).map((to) => [from, to] as const),
  );

  it.each(pairs)('%s → %s', async (from, to) => {
    await inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = await insertPayment(tx, owner, customer, await defaultsFor(tx, from));
      const target = await defaultsFor(tx, to);
      const set = ['status', 'paid_amount', 'paid_at', 'method', 'canceled_at', 'cancel_reason']
        .map((column, i) => `${column} = $${i + 2}`)
        .join(', ');
      const sql = `update public.payment set ${set} where id = $1`;
      const params = [
        id,
        to,
        target.paid_amount ?? null,
        target.paid_at ?? null,
        target.method ?? null,
        target.canceled_at ?? null,
        target.cancel_reason ?? null,
      ];
      if (domainAllows(from, to)) await tx.query(sql, params);
      else expect(await expectError(tx, sql, params)).toBe(RAISED);
    });
  });

  it('CA-7 (base): cobrar un abono cancelado se rechaza', async () => {
    await inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = await insertPayment(tx, owner, customer, await defaultsFor(tx, 'canceled'));
      expect(
        await expectError(
          tx,
          `update public.payment set status = 'collected', paid_amount = 1, paid_at = public.today_bogota(), method = 'cash' where id = $1`,
          [id],
        ),
      ).toBe(RAISED);
    });
  });

  it.each(STATUSES)('BR-PAY-11: borrar (lógico) desde %s', async (status) => {
    await inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = await insertPayment(tx, owner, customer, await defaultsFor(tx, status));
      const sql = 'update public.payment set deleted_at = now() where id = $1';
      if (status === 'scheduled' || status === 'collected') {
        await tx.query(sql, [id]);
        expect(await expectError(tx, 'update public.payment set agreed_amount = 1 where id = $1', [id])).toBe(
          RAISED,
        );
      } else {
        expect(await expectError(tx, sql, [id])).toBe(RAISED);
      }
    });
  });
});

describe('payment: historial (HU-ABO-01 R7, BR-AUD-01)', () => {
  it('cancelar, recortar y reabrir dejan payment_event; una prórroga deja payment_reschedule', async () => {
    await inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const reduced = await insertPayment(tx, owner, customer, await defaultsFor(tx, 'scheduled'));
      const canceled = await insertPayment(tx, owner, customer, await defaultsFor(tx, 'scheduled'));
      const reopened = await insertPayment(tx, owner, customer, await defaultsFor(tx, 'delivered'));

      await tx.query(`select set_config('colportor.payment_event', '{"trigger":"extra_payment"}', true)`);
      await tx.query('update public.payment set agreed_amount = 25000 where id = $1', [reduced]);
      await tx.query(`select set_config('colportor.payment_event', '{"trigger":"book_returned"}', true)`);
      await tx.query(
        `update public.payment set status = 'canceled', canceled_at = now(), cancel_reason = 'book_returned' where id = $1`,
        [canceled],
      );
      await tx.query(`select set_config('colportor.payment_event', '{"reason":"Faltó un recibo"}', true)`);
      await tx.query(`update public.payment set status = 'collected' where id = $1`, [reopened]);
      await tx.query(`select set_config('colportor.payment_event', '{"note":"Pidió plazo"}', true)`);
      await tx.query('update public.payment set due_date = due_date + 15 where id = $1', [reduced]);
      await tx.query(`select set_config('colportor.payment_event', '', true)`);

      const events = await tx.query('select payment_id, type, data from public.payment_event order by seq');
      expect(events.rows).toEqual([
        {
          payment_id: reduced,
          type: 'amount_reduced',
          data: { trigger: 'extra_payment', previousAmount: 60_000, newAmount: 25_000 },
        },
        {
          payment_id: canceled,
          type: 'canceled',
          data: { trigger: 'book_returned', reason: 'book_returned', agreedAmount: 60_000 },
        },
        { payment_id: reopened, type: 'reopened', data: { reason: 'Faltó un recibo' } },
      ]);
      const reschedules = await tx.query<{ payment_id: string; note: string; days: number }>(
        'select payment_id, note, new_due_date - previous_due_date as days from public.payment_reschedule',
      );
      expect(reschedules.rows).toEqual([{ payment_id: reduced, note: 'Pidió plazo', days: 15 }]);
    });
  });

  it('subir el valor acordado o cobrar no deja eventos', async () => {
    await inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = await insertPayment(tx, owner, customer, await defaultsFor(tx, 'scheduled'));
      await tx.query('update public.payment set agreed_amount = 90000 where id = $1', [id]);
      await tx.query(
        `update public.payment set status = 'collected', paid_amount = 90000, paid_at = public.today_bogota(), method = 'cash' where id = $1`,
        [id],
      );
      const { rows } = await tx.query(
        'select count(*)::int as n from public.payment_event where payment_id = $1',
        [id],
      );
      expect(rows).toEqual([{ n: 0 }]);
    });
  });
});

describe('RLS A/B de payment, payment_reschedule y payment_event', () => {
  it('A lee solo lo suyo y no escribe directamente', async () => {
    await inTransaction(async (tx) => {
      const a = await setup(tx);
      const b = await setup(tx);
      for (const { owner, customer } of [a, b]) {
        const id = await insertPayment(tx, owner, customer, await defaultsFor(tx, 'scheduled'));
        await tx.query(
          'update public.payment set due_date = due_date + 1, agreed_amount = 50000 where id = $1',
          [id],
        );
      }
      await asUser(tx, a.owner, async () => {
        for (const table of ['payment', 'payment_reschedule', 'payment_event']) {
          const { rows } = await tx.query<{ owner_id: string }>(`select owner_id from public.${table}`);
          expect(rows.length, table).toBeGreaterThan(0);
          expect(
            rows.every((r) => r.owner_id === a.owner),
            table,
          ).toBe(true);
        }
        expect(await expectError(tx, 'update public.payment set agreed_amount = 1')).toBe(
          INSUFFICIENT_PRIVILEGE,
        );
        expect(await expectError(tx, 'delete from public.payment_event')).toBe(INSUFFICIENT_PRIVILEGE);
        expect(await expectError(tx, 'delete from public.payment_reschedule')).toBe(INSUFFICIENT_PRIVILEGE);
      });
    });
  });
});
