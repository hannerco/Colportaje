// HU-ABO-02 · Cuota inicial, abono extra y corrección de cobros: funciones SQL, bloqueos y A/B.
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

const TITLE = '00000000-0000-4000-8000-000000000101';

beforeAll(assertDatabaseReachable);
afterAll(() => pool.end());

type Outcome =
  | { ok: true; rows: Record<string, unknown>[] }
  | { ok: false; code: string; detail?: string; pgCode?: string };

const call = (tx: Tx, user: string | null, sql: string, params: unknown[]) => {
  const run = async (): Promise<Outcome> => {
    await tx.query('savepoint fn');
    try {
      const { rows } = await tx.query(sql, params);
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

const setDown = (
  tx: Tx,
  user: string,
  payment: string,
  customer: string,
  amount: number | null,
  method?: string,
) =>
  call(
    tx,
    user,
    "select public.set_creation_down_payment($1, $2, $3, coalesce($4, 'transfer')::public.pay_method)",
    [payment, customer, amount, method ?? null],
  );
const register = (
  tx: Tx,
  user: string,
  payment: string,
  customer: string,
  kind: string,
  amount: number,
  paidAt?: string,
) =>
  call(tx, user, 'select public.register_collected_payment($1, $2, $3::public.payment_kind, $4, $5::date)', [
    payment,
    customer,
    kind,
    amount,
    paidAt ?? null,
  ]);
const correct = (
  tx: Tx,
  user: string,
  payment: string,
  fields: { amount?: number; paidAt?: string; method?: string },
) =>
  call(
    tx,
    user,
    'select public.update_collected_payment($1, $2, $3::date, $4::public.pay_method) as customer_id',
    [payment, fields.amount ?? null, fields.paidAt ?? null, fields.method ?? null],
  );
const remove = (tx: Tx, user: string | null, payment: string) =>
  call(tx, user, 'select * from public.delete_payment($1)', [payment]);

const day = async (tx: Tx, offset = 0) =>
  (await tx.query<{ d: string }>('select (public.today_bogota() + $1::int)::text as d', [offset])).rows[0]!.d;

/** Natalia con un libro de `debt`. */
const setup = async (tx: Tx, debt = 180_000) => {
  const owner = await createUser(tx);
  const customer = randomUUID();
  await tx.query(
    `insert into public.customer (id, owner_id, name, updated_at) values ($1, $2, 'Natalia', '2026-01-01')`,
    [customer, owner],
  );
  await tx.query(
    `insert into public.copy (id, owner_id, title_id, number, status, customer_id, agreed_price, sold_at,
                              public_price_snapshot, colportor_price_snapshot, received_at)
     values ($1, $2, $3, 0, 'sold', $4, $5, now(), $5, 1000, '2026-10-01')`,
    [randomUUID(), owner, TITLE, customer, debt],
  );
  return { owner, customer };
};

const payments = async (tx: Tx, customer: string) =>
  (
    await tx.query(
      `select id, kind, status, paid_amount, paid_at::text, method, due_date::text, original_due_date::text,
              deleted_at is not null as deleted, leader_deposit_id
       from public.payment where customer_id = $1 order by created_at, id`,
      [customer],
    )
  ).rows;

const touched = async (tx: Tx, customer: string) =>
  (await tx.query(`select updated_at > '2026-01-02' as t from public.customer where id = $1`, [customer]))
    .rows[0].t;

describe('set_creation_down_payment (ficha nueva)', () => {
  it('CA-1: 40.000 crea una cuota cobrada por Transferencia con fecha de hoy', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = randomUUID();
      expect(await setDown(tx, owner, id, customer, 40_000)).toMatchObject({ ok: true });
      const today = await day(tx);
      expect(await payments(tx, customer)).toEqual([
        expect.objectContaining({
          id,
          kind: 'down_payment',
          status: 'collected',
          paid_amount: 40_000,
          method: 'transfer',
          paid_at: today,
          due_date: today,
          original_due_date: today,
          deleted: false,
        }),
      ]);
      expect(await touched(tx, customer)).toBe(true);
    }));

  it('CA-2: cambiar a 50.000 deja una sola cuota, de 50.000 (también con otro id o como reintento)', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = randomUUID();
      await setDown(tx, owner, id, customer, 40_000);
      await setDown(tx, owner, id, customer, 50_000, 'cash');
      await setDown(tx, owner, randomUUID(), customer, 50_000, 'cash');
      const rows = await payments(tx, customer);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ id, paid_amount: 50_000, method: 'cash' });
    }));

  it('CA-3: $0 la borra (lógico); otra vez $0 no hace nada; un valor nuevo crea otra', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = randomUUID();
      await setDown(tx, owner, id, customer, 40_000);
      await setDown(tx, owner, id, customer, 0);
      expect(await payments(tx, customer)).toEqual([expect.objectContaining({ id, deleted: true })]);
      expect(await setDown(tx, owner, id, customer, null)).toMatchObject({ ok: true });
      await setDown(tx, owner, randomUUID(), customer, 30_000);
      expect((await payments(tx, customer)).filter((p) => !p.deleted)).toHaveLength(1);
    }));

  it('un cliente archivado → CUSTOMER_ARCHIVED; un valor negativo → VALIDATION en paidAmount', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      expect(await setDown(tx, owner, randomUUID(), customer, -1)).toMatchObject({
        code: 'VALIDATION',
        detail: 'paidAmount',
      });
      await tx.query('update public.customer set archived_at = now() where id = $1', [customer]);
      expect(await setDown(tx, owner, randomUUID(), customer, 1)).toMatchObject({
        code: 'CUSTOMER_ARCHIVED',
      });
    }));
});

describe('register_collected_payment (cliente guardado)', () => {
  it('CA-4: un extra de 20.000 nace cobrado, sin fecha acordada, y no se duplica al reintentar', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx, 40_000);
      const id = randomUUID();
      expect(await register(tx, owner, id, customer, 'extra', 20_000)).toMatchObject({ ok: true });
      expect(await register(tx, owner, id, customer, 'extra', 20_000)).toMatchObject({ ok: true });
      expect(await payments(tx, customer)).toEqual([
        expect.objectContaining({
          kind: 'extra',
          status: 'collected',
          paid_amount: 20_000,
          method: 'transfer',
          due_date: null,
        }),
      ]);
    }));

  it('otra cuota inicial (recompra) con fecha pasada usa esa fecha como acordada y original', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const past = await day(tx, -3);
      await register(tx, owner, randomUUID(), customer, 'down_payment', 30_000, past);
      expect((await payments(tx, customer))[0]).toMatchObject({
        paid_at: past,
        due_date: past,
        original_due_date: past,
      });
    }));

  it('CA-7: fecha real de mañana → VALIDATION en paidAt; valor 0 → paidAmount; tipo programado → kind', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      expect(await register(tx, owner, randomUUID(), customer, 'extra', 1, await day(tx, 1))).toMatchObject({
        code: 'VALIDATION',
        detail: 'paidAt',
      });
      expect(await register(tx, owner, randomUUID(), customer, 'extra', 0)).toMatchObject({
        detail: 'paidAmount',
      });
      expect(await register(tx, owner, randomUUID(), customer, 'scheduled', 1)).toMatchObject({
        detail: 'kind',
      });
      expect(await payments(tx, customer)).toEqual([]);
    }));

  it('R7: en un archivado no se registra; el id de un abono de otro cliente → CONFLICT', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = randomUUID();
      await register(tx, owner, id, customer, 'extra', 1);
      const other = randomUUID();
      await tx.query(`insert into public.customer (id, owner_id, name) values ($1, $2, 'Otra')`, [
        other,
        owner,
      ]);
      expect(await register(tx, owner, id, other, 'extra', 1)).toMatchObject({ code: 'CONFLICT' });
      await tx.query('update public.customer set archived_at = now() where id = $1', [customer]);
      expect(await register(tx, owner, randomUUID(), customer, 'extra', 1)).toMatchObject({
        code: 'CUSTOMER_ARCHIVED',
      });
    }));
});

describe('update_collected_payment y delete_payment', () => {
  const inDeposit = async (tx: Tx, owner: string, payment: string, confirm: boolean) => {
    const deposit = randomUUID();
    await tx.query(
      `insert into public.leader_deposit (id, owner_id, cash_amount, transfer_amount) values ($1, $2, 50000, 0)`,
      [deposit, owner],
    );
    await tx.query('update public.payment set leader_deposit_id = $2 where id = $1', [payment, deposit]);
    if (confirm) {
      await tx.query(
        `update public.leader_deposit set status = 'confirmed', confirmed_at = now() where id = $1`,
        [deposit],
      );
      await tx.query(`update public.payment set status = 'delivered' where id = $1`, [payment]);
    }
    return deposit;
  };

  it('CA-5: un cobro de 50.000 en un borrador se corrige a 45.000 y el borrador no cambia sus montos', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = randomUUID();
      await register(tx, owner, id, customer, 'extra', 50_000);
      const deposit = await inDeposit(tx, owner, id, false);
      expect(await correct(tx, owner, id, { amount: 45_000 })).toMatchObject({
        ok: true,
        rows: [{ customer_id: customer }],
      });
      expect((await payments(tx, customer))[0]).toMatchObject({
        paid_amount: 45_000,
        leader_deposit_id: deposit,
      });
      const d = await tx.query(
        'select cash_amount, transfer_amount from public.leader_deposit where id = $1',
        [deposit],
      );
      expect(d.rows[0]).toEqual({ cash_amount: 50_000, transfer_amount: 0 });
    }));

  it('R4: borrar un cobro de un borrador lo desvincula', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = randomUUID();
      await register(tx, owner, id, customer, 'extra', 50_000);
      await inDeposit(tx, owner, id, false);
      expect(await remove(tx, owner, id)).toMatchObject({
        ok: true,
        rows: [{ customer_id: customer, previous_status: 'collected' }],
      });
      expect((await payments(tx, customer))[0]).toMatchObject({ deleted: true, leader_deposit_id: null });
      // Reintento: ya borrado, no hace nada.
      expect(await remove(tx, owner, id)).toMatchObject({ ok: true });
    }));

  it('CA-6: un cobro de un Abibono confirmado → PAYMENT_LOCKED al editar o borrar', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = randomUUID();
      await register(tx, owner, id, customer, 'extra', 50_000);
      await inDeposit(tx, owner, id, true);
      expect(await correct(tx, owner, id, { amount: 1 })).toMatchObject({ code: 'PAYMENT_LOCKED' });
      expect(await remove(tx, owner, id)).toMatchObject({ code: 'PAYMENT_LOCKED' });
      const down = randomUUID();
      await setDown(tx, owner, down, customer, 40_000);
      await inDeposit(tx, owner, down, true);
      expect(await setDown(tx, owner, down, customer, 0)).toMatchObject({ code: 'PAYMENT_LOCKED' });
    }));

  it('corregir la fecha real de una cuota inicial mueve también su fecha acordada y original', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = randomUUID();
      await setDown(tx, owner, id, customer, 40_000);
      const past = await day(tx, -2);
      expect(await correct(tx, owner, id, { paidAt: past, method: 'cash' })).toMatchObject({ ok: true });
      expect((await payments(tx, customer))[0]).toMatchObject({
        paid_at: past,
        due_date: past,
        original_due_date: past,
        method: 'cash',
        paid_amount: 40_000,
      });
      expect(await correct(tx, owner, id, { paidAt: await day(tx, 1) })).toMatchObject({ detail: 'paidAt' });
    }));

  it('R7: en un archivado sí se corrige y se borra un cobro existente', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = randomUUID();
      await register(tx, owner, id, customer, 'extra', 50_000);
      await tx.query('update public.customer set archived_at = now() where id = $1', [customer]);
      expect(await correct(tx, owner, id, { amount: 40_000 })).toMatchObject({ ok: true });
      expect(await remove(tx, owner, id)).toMatchObject({ ok: true });
    }));

  it('solo se corrige un cobrado; un programado se borra; un cancelado no', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const scheduled = randomUUID();
      const canceled = randomUUID();
      for (const id of [scheduled, canceled]) {
        await tx.query(
          `insert into public.payment (id, owner_id, customer_id, kind, status, agreed_amount, due_date, original_due_date)
           values ($1, $2, $3, 'scheduled', 'scheduled', 10000, public.today_bogota() + 5, public.today_bogota() + 5)`,
          [id, owner, customer],
        );
      }
      await tx.query(
        `update public.payment set status = 'canceled', canceled_at = now(), cancel_reason = 'manual' where id = $1`,
        [canceled],
      );
      expect(await correct(tx, owner, scheduled, { amount: 1 })).toMatchObject({
        code: 'VALIDATION',
        detail: 'status',
      });
      expect(await remove(tx, owner, scheduled)).toMatchObject({ rows: [{ previous_status: 'scheduled' }] });
      expect(await remove(tx, owner, canceled)).toMatchObject({ code: 'INVALID_TRANSITION' });
    }));

  it('A/B y seguridad: un abono ajeno → NOT_FOUND; inactivo → FORBIDDEN; anon no ejecuta', () =>
    inTransaction(async (tx) => {
      const a = await setup(tx);
      const b = await setup(tx);
      const id = randomUUID();
      await register(tx, a.owner, id, a.customer, 'extra', 50_000);
      expect(await correct(tx, b.owner, id, { amount: 1 })).toMatchObject({ code: 'NOT_FOUND' });
      expect(await remove(tx, b.owner, id)).toMatchObject({ code: 'NOT_FOUND' });
      expect(await register(tx, b.owner, randomUUID(), a.customer, 'extra', 1)).toMatchObject({
        code: 'NOT_FOUND',
      });
      expect(await remove(tx, null, id)).toMatchObject({ pgCode: '42501' });
      await tx.query('update public.profile set is_active = false where id = $1', [a.owner]);
      expect(await remove(tx, a.owner, id)).toMatchObject({ code: 'FORBIDDEN' });
      expect((await payments(tx, a.customer))[0]).toMatchObject({ paid_amount: 50_000, deleted: false });
    }));
});
