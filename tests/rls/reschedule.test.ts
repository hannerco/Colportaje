// HU-ABO-05 · reschedule_payment: reglas de fecha, confirmación, historial, idempotencia y A/B.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { rescheduleConfirmLimit } from '@/domain/reschedule';
import { localDate } from '@/domain/time';
import {
  asAnon,
  asUser,
  assertDatabaseReachable,
  createUser,
  inTransaction,
  pool,
  type Tx,
} from './helpers/db';

beforeAll(assertDatabaseReachable);
afterAll(() => pool.end());

type Outcome =
  | { ok: true; rows: { payment_id: string; previous_due_date: string; new_due_date: string }[] }
  | { ok: false; code: string; detail?: string; pgCode?: string };

const reschedule = (
  tx: Tx,
  user: string | null,
  id: string,
  date: string,
  note: string | null = null,
  confirmed = false,
) => {
  const run = async (): Promise<Outcome> => {
    await tx.query('savepoint fn');
    try {
      const { rows } = await tx.query(
        `select payment_id, previous_due_date::text, new_due_date::text
         from public.reschedule_payment($1, $2::date, $3, $4)`,
        [id, date, note, confirmed],
      );
      await tx.query('release savepoint fn');
      return { ok: true, rows };
    } catch (error) {
      await tx.query('rollback to savepoint fn');
      const e = error as { message: string; code?: string; detail?: string };
      return { ok: false, code: e.message.split(':')[0]!, detail: e.detail, pgCode: e.code };
    }
  };
  return user === null ? asAnon(tx, run) : asUser(tx, user, run);
};

const day = async (tx: Tx, offset: number) =>
  (await tx.query<{ d: string }>('select (public.today_bogota() + $1::int)::text as d', [offset])).rows[0]!.d;
const today = async (tx: Tx) => day(tx, 0);

const setup = async (tx: Tx) => {
  const owner = await createUser(tx);
  const customer = randomUUID();
  await tx.query(
    `insert into public.customer (id, owner_id, name, updated_at) values ($1, $2, 'Natalia', '2026-01-01')`,
    [customer, owner],
  );
  return { owner, customer };
};

/** Un programado con fecha `due` (puede ser pasada: se inserta sin triggers, como uno que ya venció). */
const scheduled = async (tx: Tx, owner: string, customer: string, due: string) => {
  const id = randomUUID();
  await tx.query('set local session_replication_role = replica');
  await tx.query(
    `insert into public.payment (id, owner_id, customer_id, kind, status, agreed_amount, due_date, original_due_date)
     values ($1, $2, $3, 'scheduled', 'scheduled', 10000, $4, $4)`,
    [id, owner, customer, due],
  );
  await tx.query('set local session_replication_role = origin');
  return id;
};

const state = async (tx: Tx, id: string) => {
  const p = await tx.query(
    `select due_date::text as due, original_due_date::text as original from public.payment where id = $1`,
    [id],
  );
  const r = await tx.query(
    `select previous_due_date::text as prev, new_due_date::text as next, note from public.payment_reschedule
     where payment_id = $1 order by seq`,
    [id],
  );
  return { ...p.rows[0], history: r.rows };
};

describe('reschedule_payment (HU-ABO-05)', () => {
  it('CA-1 / CA-2: un vencido se prorroga dos veces; la original no cambia y hay una fila por prórroga', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const overdue = await day(tx, -19);
      const id = await scheduled(tx, owner, customer, overdue);
      const first = await day(tx, 10);
      const second = await day(tx, 25);
      expect(await reschedule(tx, owner, id, first, 'Pidió plazo')).toEqual({
        ok: true,
        rows: [{ payment_id: id, previous_due_date: overdue, new_due_date: first }],
      });
      await reschedule(tx, owner, id, second);
      expect(await state(tx, id)).toEqual({
        due: second,
        original: overdue,
        history: [
          { prev: overdue, next: first, note: 'Pidió plazo' },
          { prev: first, next: second, note: null },
        ],
      });
      const c = await tx.query(`select updated_at > '2026-01-02' as t from public.customer where id = $1`, [
        customer,
      ]);
      expect(c.rows[0].t).toBe(true);
    }));

  it('reintentar la misma prórroga devuelve el mismo movimiento sin otra fila', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = await scheduled(tx, owner, customer, await day(tx, 3));
      const target = await day(tx, 10);
      const first = await reschedule(tx, owner, id, target);
      expect(await reschedule(tx, owner, id, target)).toEqual(first);
      expect((await state(tx, id)).history).toHaveLength(1);
    }));

  it('CA-3: del 30/11 al 20/11 → DATE_NOT_LATER (y a la misma fecha sin prórroga previa también)', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = await scheduled(tx, owner, customer, await day(tx, 25));
      expect(await reschedule(tx, owner, id, await day(tx, 15))).toMatchObject({ code: 'DATE_NOT_LATER' });
      expect(await reschedule(tx, owner, id, await day(tx, 25))).toMatchObject({ code: 'DATE_NOT_LATER' });
      expect((await state(tx, id)).history).toEqual([]);
    }));

  it('HU-ABO-08 R2 / CA-3: de hace 15 días a hace 6 (posterior a la actual aunque anterior a hoy) se guarda con 1 fila', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = await scheduled(tx, owner, customer, await day(tx, -15));
      const next = await day(tx, -6);
      expect(await reschedule(tx, owner, id, next)).toMatchObject({ ok: true });
      const after = await state(tx, id);
      expect(after.history).toHaveLength(1);
      expect(after).toMatchObject({ due: next });
    }));

  it('HU-ABO-08 CA-4: a una fecha anterior a la actual sigue siendo DATE_NOT_LATER', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = await scheduled(tx, owner, customer, await day(tx, -6));
      expect(await reschedule(tx, owner, id, await day(tx, -11))).toMatchObject({ code: 'DATE_NOT_LATER' });
    }));

  it('CA-4: más allá de hoy + 2 meses pide confirmar (con la fecha); confirmado se guarda; el límite exacto no pide', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = await scheduled(tx, owner, customer, await day(tx, 5));
      const limit = rescheduleConfirmLimit(localDate(await today(tx)));
      const beyond = (await tx.query<{ d: string }>('select ($1::date + 1)::text as d', [limit])).rows[0]!.d;
      const outcome = await reschedule(tx, owner, id, beyond);
      expect(outcome).toMatchObject({ code: 'RESCHEDULE_NEEDS_CONFIRMATION' });
      expect(!outcome.ok && JSON.parse(outcome.detail!)).toEqual([beyond]);
      expect((await state(tx, id)).history).toEqual([]);
      // Paridad con el dominio: el límite exacto no pide confirmación.
      expect(await reschedule(tx, owner, id, limit)).toMatchObject({ ok: true });
      expect(await reschedule(tx, owner, id, beyond, null, true)).toMatchObject({ ok: true });
    }));

  it('CA-5: prorrogar el primero de tres no mueve los demás; solo él tiene historial', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const dues = [await day(tx, 10), await day(tx, 25), await day(tx, 40)];
      const ids = [];
      for (const due of dues) ids.push(await scheduled(tx, owner, customer, due));
      const moved = await day(tx, 15);
      await reschedule(tx, owner, ids[0]!, moved);
      expect((await state(tx, ids[0]!)).due).toBe(moved);
      for (const i of [1, 2])
        expect(await state(tx, ids[i]!)).toEqual({ due: dues[i], original: dues[i], history: [] });
    }));

  it('R1: solo programados → PAYMENT_NOT_SCHEDULED; ajeno → NOT_FOUND; inactivo → FORBIDDEN; anon no', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = await scheduled(tx, owner, customer, await day(tx, 5));
      const target = await day(tx, 10);
      expect(await reschedule(tx, null, id, target)).toMatchObject({ pgCode: '42501' });
      const intruder = await createUser(tx);
      expect(await reschedule(tx, intruder, id, target)).toMatchObject({ code: 'NOT_FOUND' });
      await tx.query(
        `update public.payment set status = 'canceled', canceled_at = now(), cancel_reason = 'manual' where id = $1`,
        [id],
      );
      expect(await reschedule(tx, owner, id, target)).toMatchObject({ code: 'PAYMENT_NOT_SCHEDULED' });
      await tx.query('update public.profile set is_active = false where id = $1', [owner]);
      expect(await reschedule(tx, owner, id, target)).toMatchObject({ code: 'FORBIDDEN' });
    }));
});
