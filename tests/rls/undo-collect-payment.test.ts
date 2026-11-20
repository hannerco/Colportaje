// HU-ABO-10 · undo_collect_payment: un cobro vuelve a por cobrar, lo acordado se conserva y los bloqueos funcionan.
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

type Outcome = { ok: true; customer: string } | { ok: false; code: string };

const undo = (tx: Tx, user: string | null, id: string) => {
  const run = async (): Promise<Outcome> => {
    await tx.query('savepoint fn');
    try {
      const { rows } = await tx.query(`select public.undo_collect_payment($1) as customer`, [id]);
      await tx.query('release savepoint fn');
      return { ok: true, customer: rows[0].customer };
    } catch (error) {
      await tx.query('rollback to savepoint fn');
      return { ok: false, code: (error as { message: string }).message.split(':')[0]! };
    }
  };
  return user === null ? asAnon(tx, run) : asUser(tx, user, run);
};

const setup = async (tx: Tx) => {
  const owner = await createUser(tx);
  const customer = randomUUID();
  await tx.query(
    `insert into public.customer (id, owner_id, name, updated_at) values ($1, $2, 'Jhon Fredy Ospina', '2026-01-01')`,
    [customer, owner],
  );
  return { owner, customer };
};

/** Un abono cobrado (se inserta sin triggers): programado por 40.000, cobrado por 30.000 en efectivo. */
const collected = async (tx: Tx, owner: string, customer: string, kind = 'scheduled') => {
  const id = randomUUID();
  await tx.query('set local session_replication_role = replica');
  await tx.query(
    `insert into public.payment (id, owner_id, customer_id, kind, status, agreed_amount, due_date, original_due_date,
                                 paid_amount, paid_at, method)
     values ($1, $2, $3, $4::public.payment_kind, 'collected',
             case when $4 = 'scheduled' then 40000 end,
             case when $4 = 'extra' then null else public.today_bogota() - 3 end,
             case when $4 = 'extra' then null else public.today_bogota() - 3 end,
             30000, public.today_bogota() - 3, 'cash')`,
    [id, owner, customer, kind],
  );
  await tx.query('set local session_replication_role = origin');
  return id;
};

const row = async (tx: Tx, id: string) =>
  (
    await tx.query(
      `select status, agreed_amount, paid_amount, paid_at::text, method, (due_date = public.today_bogota() - 3) as same_due
       from public.payment where id = $1`,
      [id],
    )
  ).rows[0];

describe('undo_collect_payment (HU-ABO-10)', () => {
  it('un cobro vuelve a por cobrar: se borran valor, fecha y método reales y lo acordado se conserva', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = await collected(tx, owner, customer);
      expect(await undo(tx, owner, id)).toEqual({ ok: true, customer });
      expect(await row(tx, id)).toEqual({
        status: 'scheduled',
        agreed_amount: 40_000,
        paid_amount: null,
        paid_at: null,
        method: null,
        same_due: true,
      });
      const c = await tx.query(`select updated_at > '2026-01-02' as t from public.customer where id = $1`, [
        customer,
      ]);
      expect(c.rows[0].t).toBe(true);
    }));

  it('el abono deshecho se puede volver a cobrar', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = await collected(tx, owner, customer);
      await undo(tx, owner, id);
      await asUser(tx, owner, () => tx.query(`select * from public.collect_payment($1)`, [id]));
      expect((await row(tx, id)).status).toBe('collected');
    }));

  it('uno que no está cobrado da INVALID_TRANSITION', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = await collected(tx, owner, customer);
      await undo(tx, owner, id);
      expect(await undo(tx, owner, id)).toEqual({ ok: false, code: 'INVALID_TRANSITION' });
    }));

  it('la cuota inicial y el abono extra no se deshacen (INVALID_TRANSITION)', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      for (const kind of ['down_payment', 'extra']) {
        const id = await collected(tx, owner, customer, kind);
        expect(await undo(tx, owner, id)).toEqual({ ok: false, code: 'INVALID_TRANSITION' });
      }
    }));

  it('un cobro dentro de un Abibono (borrador o entregado) se bloquea con PAYMENT_LOCKED', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = await collected(tx, owner, customer);
      const deposit = randomUUID();
      await tx.query(
        `insert into public.leader_deposit (id, owner_id, cash_amount, transfer_amount) values ($1, $2, 30000, 0)`,
        [deposit, owner],
      );
      await tx.query('update public.payment set leader_deposit_id = $2 where id = $1', [id, deposit]);
      expect(await undo(tx, owner, id)).toEqual({ ok: false, code: 'PAYMENT_LOCKED' });
      expect((await row(tx, id)).status).toBe('collected');
    }));

  it('un cliente archivado da CUSTOMER_ARCHIVED', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = await collected(tx, owner, customer);
      await tx.query(`update public.customer set archived_at = now() where id = $1`, [customer]);
      expect(await undo(tx, owner, id)).toEqual({ ok: false, code: 'CUSTOMER_ARCHIVED' });
    }));

  it('aislamiento A/B, sin sesión y usuario inactivo', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const other = await createUser(tx);
      const id = await collected(tx, owner, customer);
      expect(await undo(tx, other, id)).toEqual({ ok: false, code: 'NOT_FOUND' });
      expect((await undo(tx, null, id)).ok).toBe(false);
      await tx.query(`update public.profile set is_active = false where id = $1`, [owner]);
      expect(await undo(tx, owner, id)).toEqual({ ok: false, code: 'FORBIDDEN' });
      expect((await row(tx, id)).status).toBe('collected');
    }));
});
