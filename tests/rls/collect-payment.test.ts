// HU-ABO-06 · collect_payment: transición, valores por defecto, parcial, fecha real, errores y A/B.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
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
  | { ok: true; rows: { customer_id: string; agreed_amount: number; paid_amount: number }[] }
  | { ok: false; code: string; detail?: string; pgCode?: string };

const collect = (
  tx: Tx,
  user: string | null,
  id: string,
  amount: number | null = null,
  paidAt: string | null = null,
  method: string | null = null,
) => {
  const run = async (): Promise<Outcome> => {
    await tx.query('savepoint fn');
    try {
      const { rows } = method
        ? await tx.query(`select * from public.collect_payment($1, $2, $3::date, $4::public.pay_method)`, [
            id,
            amount,
            paidAt,
            method,
          ])
        : await tx.query(`select * from public.collect_payment($1, $2, $3::date)`, [id, amount, paidAt]);
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

const setup = async (tx: Tx) => {
  const owner = await createUser(tx);
  const customer = randomUUID();
  await tx.query(
    `insert into public.customer (id, owner_id, name, updated_at) values ($1, $2, 'Jhon Fredy Ospina', '2026-01-01')`,
    [customer, owner],
  );
  return { owner, customer };
};

/** Un programado de `agreed` con fecha hoy + `offset` (negativa = vencido; se inserta sin triggers). */
const scheduled = async (tx: Tx, owner: string, customer: string, agreed: number, offset = 5) => {
  const id = randomUUID();
  await tx.query('set local session_replication_role = replica');
  await tx.query(
    `insert into public.payment (id, owner_id, customer_id, kind, status, agreed_amount, due_date, original_due_date)
     values ($1, $2, $3, 'scheduled', 'scheduled', $4, public.today_bogota() + $5::int, public.today_bogota() + $5::int)`,
    [id, owner, customer, agreed, offset],
  );
  await tx.query('set local session_replication_role = origin');
  return id;
};

const row = async (tx: Tx, id: string) =>
  (
    await tx.query(
      `select status, agreed_amount, paid_amount, paid_at::text, method, due_date::text, leader_deposit_id
       from public.payment where id = $1`,
      [id],
    )
  ).rows[0];

describe('collect_payment (HU-ABO-06)', () => {
  it('CA-1 / R1 / R4 / R5: por defecto lo acordado, hoy y Transferencia; lo acordado se conserva', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = await scheduled(tx, owner, customer, 40_000);
      const due = await day(tx, 5);
      expect(await collect(tx, owner, id)).toEqual({
        ok: true,
        rows: [{ customer_id: customer, agreed_amount: 40_000, paid_amount: 40_000 }],
      });
      expect(await row(tx, id)).toEqual({
        status: 'collected',
        agreed_amount: 40_000,
        paid_amount: 40_000,
        paid_at: await day(tx, 0),
        method: 'transfer',
        due_date: due,
        // R5: cobrado y sin Abibono = "por entregar".
        leader_deposit_id: null,
      });
      const c = await tx.query(`select updated_at > '2026-01-02' as t from public.customer where id = $1`, [
        customer,
      ]);
      expect(c.rows[0].t).toBe(true);
    }));

  it('CA-2 / R2: paga 30.000 de 40.000 → cobrado por 30.000 y no se crea ningún abono', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = await scheduled(tx, owner, customer, 40_000);
      expect(await collect(tx, owner, id, 30_000, null, 'cash')).toMatchObject({
        ok: true,
        rows: [{ agreed_amount: 40_000, paid_amount: 30_000 }],
      });
      expect(await row(tx, id)).toMatchObject({ paid_amount: 30_000, agreed_amount: 40_000, method: 'cash' });
      const n = await tx.query('select count(*)::int as n from public.payment where customer_id = $1', [
        customer,
      ]);
      expect(n.rows[0].n).toBe(1);
    }));

  it('CA-4: fecha real de ayer se guarda; de mañana → VALIDATION (paidAt); 0 → VALIDATION (paidAmount)', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = await scheduled(tx, owner, customer, 40_000);
      expect(await collect(tx, owner, id, null, await day(tx, 1))).toMatchObject({
        code: 'VALIDATION',
        detail: 'paidAt',
      });
      expect(await collect(tx, owner, id, 0)).toMatchObject({ code: 'VALIDATION', detail: 'paidAmount' });
      expect(await collect(tx, owner, id, null, await day(tx, -1))).toMatchObject({ ok: true });
      expect((await row(tx, id)).paid_at).toBe(await day(tx, -1));
    }));

  it('un vencido se puede cobrar (sale de vencidos)', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = await scheduled(tx, owner, customer, 40_000, -12);
      expect(await collect(tx, owner, id)).toMatchObject({ ok: true });
      expect((await row(tx, id)).status).toBe('collected');
    }));

  it('CA-5 / R1: ya cobrado, cancelado o entregado → PAYMENT_NOT_SCHEDULED; nada cambia', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = await scheduled(tx, owner, customer, 40_000);
      await collect(tx, owner, id, 30_000);
      expect(await collect(tx, owner, id, 40_000)).toMatchObject({ code: 'PAYMENT_NOT_SCHEDULED' });
      expect((await row(tx, id)).paid_amount).toBe(30_000);
      const canceled = await scheduled(tx, owner, customer, 10_000);
      await tx.query(
        `update public.payment set status = 'canceled', canceled_at = now(), cancel_reason = 'manual' where id = $1`,
        [canceled],
      );
      expect(await collect(tx, owner, canceled)).toMatchObject({ code: 'PAYMENT_NOT_SCHEDULED' });
    }));

  it('seguridad: ajeno → NOT_FOUND; archivado → CUSTOMER_ARCHIVED; inactivo → FORBIDDEN; anon no', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = await scheduled(tx, owner, customer, 40_000);
      expect(await collect(tx, null, id)).toMatchObject({ pgCode: '42501' });
      const intruder = await createUser(tx);
      expect(await collect(tx, intruder, id)).toMatchObject({ code: 'NOT_FOUND' });
      expect((await row(tx, id)).status).toBe('scheduled');
      await tx.query('set local session_replication_role = replica');
      await tx.query(`update public.customer set archived_at = now() where id = $1`, [customer]);
      await tx.query('set local session_replication_role = origin');
      expect(await collect(tx, owner, id)).toMatchObject({ code: 'CUSTOMER_ARCHIVED' });
      await tx.query('set local session_replication_role = replica');
      await tx.query(`update public.customer set archived_at = null where id = $1`, [customer]);
      await tx.query('set local session_replication_role = origin');
      await tx.query('update public.profile set is_active = false where id = $1', [owner]);
      expect(await collect(tx, owner, id)).toMatchObject({ code: 'FORBIDDEN' });
    }));
});
