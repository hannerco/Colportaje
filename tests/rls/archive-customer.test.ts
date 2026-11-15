// HU-CLI-11 · archive_customer, restore_customer y el bloqueo de archivar/descartar directo por la API.
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

const CORAZON = '00000000-0000-4000-8000-000000000201'; // seed

beforeAll(assertDatabaseReachable);
afterAll(() => pool.end());

type Outcome = { ok: true } | { ok: false; code: string; pgCode?: string };

const call = (tx: Tx, user: string | null, sql: string, params: unknown[]) => {
  const run = async (): Promise<Outcome> => {
    await tx.query('savepoint fn');
    try {
      await tx.query(sql, params);
      await tx.query('release savepoint fn');
      return { ok: true };
    } catch (error) {
      await tx.query('rollback to savepoint fn');
      const e = error as { message: string; code?: string };
      return { ok: false, code: e.message.split(':')[0]!, pgCode: e.code };
    }
  };
  return user === null ? asAnon(tx, run) : asUser(tx, user, run);
};

const archive = (tx: Tx, user: string | null, id: string) =>
  call(tx, user, 'select public.archive_customer($1)', [id]);
const restore = (tx: Tx, user: string | null, id: string) =>
  call(tx, user, 'select public.restore_customer($1)', [id]);

const setup = async (tx: Tx) => {
  const owner = await createUser(tx);
  const customer = randomUUID();
  await tx.query(
    `insert into public.customer (id, owner_id, name, updated_at) values ($1, $2, 'Rubén Darío Vélez', '2026-01-01')`,
    [customer, owner],
  );
  return { owner, customer };
};

const scheduled = async (tx: Tx, owner: string, customer: string, days: number) => {
  const id = randomUUID();
  await tx.query(
    `insert into public.payment (id, owner_id, customer_id, kind, status, agreed_amount, due_date, original_due_date)
     values ($1, $2, $3, 'scheduled', 'scheduled', 50000, public.today_bogota() + $4::int, public.today_bogota() + $4::int)`,
    [id, owner, customer, days],
  );
  return id;
};

const collected = async (tx: Tx, owner: string, customer: string) => {
  const id = randomUUID();
  await tx.query(
    `insert into public.payment (id, owner_id, customer_id, kind, status, paid_amount, paid_at, method)
     values ($1, $2, $3, 'extra', 'collected', 30000, public.today_bogota(), 'cash')`,
    [id, owner, customer],
  );
  return id;
};

const customerRow = async (tx: Tx, id: string) =>
  (
    await tx.query(
      `select archived_at is not null as archived, updated_at > '2026-01-02' as touched from public.customer where id = $1`,
      [id],
    )
  ).rows[0];

const paymentRow = async (tx: Tx, id: string) =>
  (
    await tx.query(
      `select status, cancel_reason, canceled_at is not null as has_canceled_at, leader_deposit_id
       from public.payment where id = $1`,
      [id],
    )
  ).rows[0];

describe('archive_customer (HU-CLI-11)', () => {
  it('CA-1 / R1: con un libro vendido → CUSTOMER_HAS_BOOKS y nada cambia', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const copy = randomUUID();
      await tx.query(
        `insert into public.copy (id, owner_id, title_id, number, public_price_snapshot, colportor_price_snapshot, received_at)
         values ($1, $2, $3, 0, 95000, 1000, '2026-10-30')`,
        [copy, owner, CORAZON],
      );
      await tx.query(
        `update public.copy set status = 'sold', customer_id = $2, agreed_price = 95000, sold_at = now() where id = $1`,
        [copy, customer],
      );
      const p = await scheduled(tx, owner, customer, 10);
      expect(await archive(tx, owner, customer)).toEqual({
        ok: false,
        code: 'CUSTOMER_HAS_BOOKS',
        pgCode: 'P0001',
      });
      expect(await customerRow(tx, customer)).toEqual({ archived: false, touched: false });
      expect(await paymentRow(tx, p)).toMatchObject({ status: 'scheduled' });
    }));

  it('CA-2 / R2 / R3: cancela los programados con customer_archived y evento; el cobrado no cambia', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const [p1, p2] = [await scheduled(tx, owner, customer, 10), await scheduled(tx, owner, customer, 20)];
      const cash = await collected(tx, owner, customer);
      expect(await archive(tx, owner, customer)).toEqual({ ok: true });
      for (const id of [p1, p2])
        expect(await paymentRow(tx, id)).toEqual({
          status: 'canceled',
          cancel_reason: 'customer_archived',
          has_canceled_at: true,
          leader_deposit_id: null,
        });
      const events = await tx.query(
        `select payment_id, type, data from public.payment_event where payment_id = any($1) order by payment_id`,
        [[p1, p2]],
      );
      expect(events.rows).toHaveLength(2);
      for (const e of events.rows)
        expect(e).toMatchObject({
          type: 'canceled',
          data: { trigger: 'customer_archived', reason: 'customer_archived', agreedAmount: 50000 },
        });
      expect(await paymentRow(tx, cash)).toEqual({
        status: 'collected',
        cancel_reason: null,
        has_canceled_at: false,
        leader_deposit_id: null,
      });
      expect(await customerRow(tx, customer)).toEqual({ archived: true, touched: true });
    }));

  it('archivar un archivado no cambia nada (reintento)', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      expect(await archive(tx, owner, customer)).toEqual({ ok: true });
      const before = (
        await tx.query('select archived_at, updated_at from public.customer where id = $1', [customer])
      ).rows[0];
      expect(await archive(tx, owner, customer)).toEqual({ ok: true });
      expect(
        (await tx.query('select archived_at, updated_at from public.customer where id = $1', [customer]))
          .rows[0],
      ).toEqual(before);
    }));

  it('archivar con saldo a favor se permite (no tiene libros vendidos)', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      await collected(tx, owner, customer);
      expect(await archive(tx, owner, customer)).toEqual({ ok: true });
    }));
});

describe('restore_customer (HU-CLI-11)', () => {
  it('CA-3 / R4: quita archived_at, mueve la última modificación y los cancelados siguen cancelados', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const p = await scheduled(tx, owner, customer, 10);
      await archive(tx, owner, customer);
      await tx.query('set local session_replication_role = replica');
      await tx.query(`update public.customer set updated_at = '2026-01-01' where id = $1`, [customer]);
      await tx.query('set local session_replication_role = origin');
      expect(await restore(tx, owner, customer)).toEqual({ ok: true });
      expect(await customerRow(tx, customer)).toEqual({ archived: false, touched: true });
      expect(await paymentRow(tx, p)).toMatchObject({
        status: 'canceled',
        cancel_reason: 'customer_archived',
      });
    }));

  it('CA-4: un cliente no archivado → CUSTOMER_NOT_ARCHIVED', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      expect(await restore(tx, owner, customer)).toEqual({
        ok: false,
        code: 'CUSTOMER_NOT_ARCHIVED',
        pgCode: 'P0001',
      });
    }));
});

describe('archivar y descartar solo por sus funciones (HU-CLI-11)', () => {
  it('por la API no se cambia archived_at ni deleted_at; los datos del cliente sí', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      for (const set of ['archived_at = now()', 'deleted_at = now()'])
        expect(await call(tx, owner, `update public.customer set ${set} where id = $1`, [customer])).toEqual({
          ok: false,
          code: 'INVALID_TRANSITION',
          pgCode: 'P0001',
        });
      expect(
        await call(tx, owner, `update public.customer set phone = '301' where id = $1`, [customer]),
      ).toEqual({
        ok: true,
      });
      await archive(tx, owner, customer);
      expect(
        await call(tx, owner, `update public.customer set archived_at = null where id = $1`, [customer]),
      ).toMatchObject({ ok: false, code: 'INVALID_TRANSITION' });
    }));
});

describe('seguridad (HU-CLI-11)', () => {
  it('otro usuario → NOT_FOUND; inactivo → FORBIDDEN; anónimo sin permiso; descartado → NOT_FOUND', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const other = await createUser(tx);
      const inactive = await createUser(tx, { isActive: false });
      expect(await archive(tx, other, customer)).toMatchObject({ ok: false, code: 'NOT_FOUND' });
      expect(await restore(tx, other, customer)).toMatchObject({ ok: false, code: 'NOT_FOUND' });
      expect(await archive(tx, inactive, customer)).toMatchObject({ ok: false, code: 'FORBIDDEN' });
      expect(await archive(tx, null, customer)).toMatchObject({ ok: false, pgCode: '42501' });
      expect(await restore(tx, null, customer)).toMatchObject({ ok: false, pgCode: '42501' });
      expect(await customerRow(tx, customer)).toMatchObject({ archived: false });
      await tx.query('update public.customer set deleted_at = now() where id = $1', [customer]);
      expect(await archive(tx, owner, customer)).toMatchObject({ ok: false, code: 'NOT_FOUND' });
    }));
});
