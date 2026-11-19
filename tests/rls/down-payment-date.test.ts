// HU-ABO-09 · Fecha de la cuota inicial en la ficha nueva: crear con fecha, actualizarla, conservarla, no futura,
// bloqueo si ya se entregó, y que siga siendo una sola. Fechas relativas al «hoy» de la base (Bogotá).
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asUser, assertDatabaseReachable, createUser, inTransaction, pool, type Tx } from './helpers/db';

const TITLE = '00000000-0000-4000-8000-000000000101';

beforeAll(assertDatabaseReachable);
afterAll(() => pool.end());

type Outcome = { ok: true } | { ok: false; code: string; detail?: string };

const setDown = (tx: Tx, user: string, payment: string, customer: string, amount: number, paidOn?: string) =>
  asUser(tx, user, async (): Promise<Outcome> => {
    await tx.query('savepoint fn');
    try {
      if (paidOn === undefined)
        await tx.query("select public.set_creation_down_payment($1, $2, $3, 'cash')", [
          payment,
          customer,
          amount,
        ]);
      else
        await tx.query("select public.set_creation_down_payment($1, $2, $3, 'cash', $4::date)", [
          payment,
          customer,
          amount,
          paidOn,
        ]);
      await tx.query('release savepoint fn');
      return { ok: true };
    } catch (error) {
      await tx.query('rollback to savepoint fn');
      const e = error as { message: string; detail?: string };
      return { ok: false, code: e.message.split(':')[0]!, detail: e.detail };
    }
  });

const day = async (tx: Tx, offset = 0) =>
  (await tx.query<{ d: string }>('select (public.today_bogota() + $1::int)::text as d', [offset])).rows[0]!.d;

/** Natalia con un libro de 180.000. */
const setup = async (tx: Tx) => {
  const owner = await createUser(tx);
  const customer = randomUUID();
  await tx.query(
    `insert into public.customer (id, owner_id, name, updated_at) values ($1, $2, 'Natalia', '2026-01-01')`,
    [customer, owner],
  );
  await tx.query(
    `insert into public.copy (id, owner_id, title_id, number, status, customer_id, agreed_price, sold_at,
                              public_price_snapshot, colportor_price_snapshot, received_at)
     values ($1, $2, $3, 0, 'sold', $4, 180000, now() - interval '30 days', 180000, 1000, current_date - 60)`,
    [randomUUID(), owner, TITLE, customer],
  );
  return { owner, customer };
};

const downPayments = async (tx: Tx, customer: string) =>
  (
    await tx.query(
      `select status, paid_amount, paid_at::text as paid, due_date::text as due, original_due_date::text as original
       from public.payment where customer_id = $1 and kind = 'down_payment' and deleted_at is null`,
      [customer],
    )
  ).rows;

describe('set_creation_down_payment con fecha (HU-ABO-09)', () => {
  it('CA-1 / R1: 50.000 con fecha de hace 13 días queda cobrada ese día (y la acordada y la original también)', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const paidOn = await day(tx, -13);
      expect(await setDown(tx, owner, randomUUID(), customer, 50_000, paidOn)).toEqual({ ok: true });
      expect(await downPayments(tx, customer)).toEqual([
        { status: 'collected', paid_amount: 50_000, paid: paidOn, due: paidOn, original: paidOn },
      ]);
    }));

  it('CA-2 / CA-3 / R2: actualizar a 60.000 con otra fecha la cambia; sin fecha la conserva; sigue siendo una sola', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = randomUUID();
      await setDown(tx, owner, id, customer, 50_000, await day(tx, -13));
      const next = await day(tx, -12);
      expect(await setDown(tx, owner, id, customer, 60_000, next)).toEqual({ ok: true });
      expect(await downPayments(tx, customer)).toEqual([
        { status: 'collected', paid_amount: 60_000, paid: next, due: next, original: next },
      ]);
      expect(await setDown(tx, owner, id, customer, 65_000)).toEqual({ ok: true });
      expect(await downPayments(tx, customer)).toEqual([
        { status: 'collected', paid_amount: 65_000, paid: next, due: next, original: next },
      ]);
    }));

  it('sin fecha al crear, es hoy (como en HU-ABO-02)', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      await setDown(tx, owner, randomUUID(), customer, 40_000);
      const today = await day(tx);
      expect(await downPayments(tx, customer)).toEqual([
        { status: 'collected', paid_amount: 40_000, paid: today, due: today, original: today },
      ]);
    }));

  it('CA-4 / R3: mañana da VALIDATION con el campo paidOn, al crear y al actualizar', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const tomorrow = await day(tx, 1);
      expect(await setDown(tx, owner, randomUUID(), customer, 50_000, tomorrow)).toEqual({
        ok: false,
        code: 'VALIDATION',
        detail: 'paidOn',
      });
      expect(await downPayments(tx, customer)).toEqual([]);
      const id = randomUUID();
      await setDown(tx, owner, id, customer, 50_000, await day(tx, -2));
      expect(await setDown(tx, owner, id, customer, 50_000, tomorrow)).toMatchObject({ detail: 'paidOn' });
      expect((await downPayments(tx, customer))[0]!.paid).toBe(await day(tx, -2));
    }));

  it('CA-5 / R4: entregada en un Abibono confirmado, cambiar su fecha da PAYMENT_LOCKED', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = randomUUID();
      await setDown(tx, owner, id, customer, 50_000, await day(tx, -5));
      const deposit = randomUUID();
      await tx.query(
        `insert into public.leader_deposit (id, owner_id, cash_amount, transfer_amount) values ($1, $2, 50000, 0)`,
        [deposit, owner],
      );
      await tx.query('update public.payment set leader_deposit_id = $2 where id = $1', [id, deposit]);
      await tx.query(
        `update public.leader_deposit set status = 'confirmed', confirmed_at = now() where id = $1`,
        [deposit],
      );
      await tx.query(`update public.payment set status = 'delivered' where id = $1`, [id]);
      expect(await setDown(tx, owner, id, customer, 50_000, await day(tx, -4))).toMatchObject({
        ok: false,
        code: 'PAYMENT_LOCKED',
      });
    }));

  it('R4: 0 la sigue borrando aunque traiga fecha', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = randomUUID();
      await setDown(tx, owner, id, customer, 50_000, await day(tx, -5));
      expect(await setDown(tx, owner, id, customer, 0, await day(tx, -4))).toEqual({ ok: true });
      expect(await downPayments(tx, customer)).toEqual([]);
    }));
});
