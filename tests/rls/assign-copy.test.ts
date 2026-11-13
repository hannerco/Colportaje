// HU-CLI-09 · assign_copy_to_customer y return_copy_from_customer: reglas, eventos, idempotencia y A/B.
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

const CORAZON = '00000000-0000-4000-8000-000000000201'; // seed: religioso
const MINI = '00000000-0000-4000-8000-000000000301';

beforeAll(assertDatabaseReachable);
afterAll(() => pool.end());

type Outcome = { ok: true; value: unknown } | { ok: false; code: string; pgCode?: string };

const call = (tx: Tx, user: string | null, sql: string, params: unknown[]) => {
  const run = async (): Promise<Outcome> => {
    await tx.query('savepoint fn');
    try {
      const { rows } = await tx.query<{ v: unknown }>(sql, params);
      await tx.query('release savepoint fn');
      return { ok: true, value: rows[0]?.v };
    } catch (error) {
      await tx.query('rollback to savepoint fn');
      const e = error as { message: string; code?: string };
      return { ok: false, code: e.message.split(':')[0]!, pgCode: e.code };
    }
  };
  return user === null ? asAnon(tx, run) : asUser(tx, user, run);
};

const assign = (tx: Tx, user: string | null, copy: string, customer: string) =>
  call(tx, user, 'select public.assign_copy_to_customer($1, $2) as v', [copy, customer]);
const giveBack = (tx: Tx, user: string | null, copy: string, reason = 'wrong_registration') =>
  call(tx, user, 'select public.return_copy_from_customer($1, $2) as v', [copy, reason]);

const setup = async (tx: Tx, title = CORAZON) => {
  const owner = await createUser(tx);
  const customer = randomUUID();
  await tx.query(
    `insert into public.customer (id, owner_id, name, updated_at) values ($1, $2, 'Natalia', '2026-01-01')`,
    [customer, owner],
  );
  const copy = randomUUID();
  await tx.query(
    `insert into public.copy (id, owner_id, title_id, number, public_price_snapshot, colportor_price_snapshot, received_at)
     values ($1, $2, $3, 0, $4, 1000, '2026-10-30')`,
    [copy, owner, title, title === MINI ? null : 95_000],
  );
  return { owner, customer, copy };
};

const copyRow = async (tx: Tx, copy: string) =>
  (
    await tx.query(
      `select status, customer_id, agreed_price, sold_at is not null as sold, received_at::text as received
       from public.copy where id = $1`,
      [copy],
    )
  ).rows[0];

const customerTouched = async (tx: Tx, customer: string) =>
  (await tx.query(`select updated_at > '2026-01-02' as t from public.customer where id = $1`, [customer]))
    .rows[0].t;

describe('assign_copy_to_customer (HU-CLI-09)', () => {
  it('CA-3 / R2: queda vendido al cliente por su precio público, con evento y última modificación', () =>
    inTransaction(async (tx) => {
      const { owner, customer, copy } = await setup(tx);
      expect(await assign(tx, owner, copy, customer)).toMatchObject({ ok: true });
      expect(await copyRow(tx, copy)).toEqual({
        status: 'sold',
        customer_id: customer,
        agreed_price: 95_000,
        sold: true,
        received: '2026-10-30',
      });
      const events = await tx.query(
        `select type, data from public.copy_event where copy_id = $1 order by seq`,
        [copy],
      );
      expect(events.rows.map((e) => e.type)).toEqual(['received', 'sold']);
      expect(events.rows[1].data).toEqual({ customerId: customer, agreedPrice: 95_000 });
      expect(await customerTouched(tx, customer)).toBe(true);
    }));

  it('reintentar con el mismo ejemplar y cliente no cambia nada ni deja otro evento', () =>
    inTransaction(async (tx) => {
      const { owner, customer, copy } = await setup(tx);
      await assign(tx, owner, copy, customer);
      expect(await assign(tx, owner, copy, customer)).toMatchObject({ ok: true });
      const n = await tx.query(`select 1 from public.copy_event where copy_id = $1 and type = 'sold'`, [
        copy,
      ]);
      expect(n.rowCount).toBe(1);
    }));

  it('R1 / R6: un ejemplar ya vendido a otro cliente → COPY_NOT_IN_STOCK', () =>
    inTransaction(async (tx) => {
      const { owner, customer, copy } = await setup(tx);
      const other = randomUUID();
      await tx.query(`insert into public.customer (id, owner_id, name) values ($1, $2, 'Otra')`, [
        other,
        owner,
      ]);
      await assign(tx, owner, copy, customer);
      expect(await assign(tx, owner, copy, other)).toMatchObject({ ok: false, code: 'COPY_NOT_IN_STOCK' });
      expect((await copyRow(tx, copy)).customer_id).toBe(customer);
    }));

  it.each(['flagged', 'lost', 'returned_to_leader'])('R1: un ejemplar %s → COPY_NOT_IN_STOCK', (status) =>
    inTransaction(async (tx) => {
      const { owner, customer, copy } = await setup(tx);
      await tx.query(`update public.copy set status = $2 where id = $1`, [
        copy,
        status === 'lost' ? 'flagged' : status,
      ]);
      if (status === 'lost') await tx.query(`update public.copy set status = 'lost' where id = $1`, [copy]);
      expect(await assign(tx, owner, copy, customer)).toMatchObject({ code: 'COPY_NOT_IN_STOCK' });
    }),
  );

  it('CA-6: un minibook en físico → COPY_IS_MINIBOOK', () =>
    inTransaction(async (tx) => {
      const { owner, customer, copy } = await setup(tx, MINI);
      expect(await assign(tx, owner, copy, customer)).toMatchObject({ code: 'COPY_IS_MINIBOOK' });
    }));

  it('R3: un cliente archivado → CUSTOMER_ARCHIVED y el ejemplar sigue en físico', () =>
    inTransaction(async (tx) => {
      const { owner, customer, copy } = await setup(tx);
      await tx.query('update public.customer set archived_at = now() where id = $1', [customer]);
      expect(await assign(tx, owner, copy, customer)).toMatchObject({ code: 'CUSTOMER_ARCHIVED' });
      expect((await copyRow(tx, copy)).status).toBe('in_stock');
    }));

  it('A/B: el ejemplar o el cliente de otro usuario → NOT_FOUND', () =>
    inTransaction(async (tx) => {
      const a = await setup(tx);
      const b = await setup(tx);
      expect(await assign(tx, a.owner, b.copy, a.customer)).toMatchObject({ code: 'NOT_FOUND' });
      expect(await assign(tx, a.owner, a.copy, b.customer)).toMatchObject({ code: 'NOT_FOUND' });
      expect((await copyRow(tx, b.copy)).status).toBe('in_stock');
    }));

  it('usuario inactivo → FORBIDDEN; anon no ejecuta', () =>
    inTransaction(async (tx) => {
      const { owner, customer, copy } = await setup(tx);
      expect(await assign(tx, null, copy, customer)).toMatchObject({ pgCode: '42501' });
      await tx.query('update public.profile set is_active = false where id = $1', [owner]);
      expect(await assign(tx, owner, copy, customer)).toMatchObject({ code: 'FORBIDDEN' });
    }));
});

describe('return_copy_from_customer (HU-CLI-09 R4; compartida con HU-CLI-10)', () => {
  it('CA-4: vuelve a físico sin cliente, precio ni venta, con su recibido original; evento returned', () =>
    inTransaction(async (tx) => {
      const { owner, customer, copy } = await setup(tx);
      await assign(tx, owner, copy, customer);
      await tx.query(`update public.customer set updated_at = '2026-01-01' where id = $1`, [customer]);
      expect(await giveBack(tx, owner, copy)).toEqual({ ok: true, value: customer });
      expect(await copyRow(tx, copy)).toEqual({
        status: 'in_stock',
        customer_id: null,
        agreed_price: null,
        sold: false,
        received: '2026-10-30',
      });
      const last = await tx.query(
        `select type, data from public.copy_event where copy_id = $1 order by seq desc limit 1`,
        [copy],
      );
      expect(last.rows[0]).toEqual({ type: 'returned', data: { reason: 'wrong_registration' } });
      expect(await customerTouched(tx, customer)).toBe(true);
      expect((await tx.query(`select current_setting('colportor.copy_event', true) as v`)).rows[0].v).toBe(
        '',
      );
    }));

  it('la devolución de HU-CLI-10 usa el motivo customer_returned; otro motivo → VALIDATION', () =>
    inTransaction(async (tx) => {
      const { owner, customer, copy } = await setup(tx);
      await assign(tx, owner, copy, customer);
      expect(await giveBack(tx, owner, copy, 'otro')).toMatchObject({ code: 'VALIDATION' });
      await giveBack(tx, owner, copy, 'customer_returned');
      const last = await tx.query(
        `select data from public.copy_event where copy_id = $1 order by seq desc limit 1`,
        [copy],
      );
      expect(last.rows[0].data).toEqual({ reason: 'customer_returned' });
    }));

  it('un ejemplar que no está vendido → COPY_NOT_SOLD; uno ajeno → NOT_FOUND', () =>
    inTransaction(async (tx) => {
      const a = await setup(tx);
      const b = await setup(tx);
      expect(await giveBack(tx, a.owner, a.copy)).toMatchObject({ code: 'COPY_NOT_SOLD' });
      await assign(tx, b.owner, b.copy, b.customer);
      expect(await giveBack(tx, a.owner, b.copy)).toMatchObject({ code: 'NOT_FOUND' });
      expect((await copyRow(tx, b.copy)).status).toBe('sold');
    }));
});
