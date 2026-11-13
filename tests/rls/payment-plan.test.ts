// HU-ABO-03 · apply_payment_plan: base recalculada, total exacto, modos, idempotencia y A/B.
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

type Item = { paymentId: string; dueDate: string; amount: number };
type Outcome = { ok: true } | { ok: false; code: string; detail?: string; pgCode?: string };

const apply = (tx: Tx, user: string | null, customer: string, mode: string, items: unknown) => {
  const run = async (): Promise<Outcome> => {
    await tx.query('savepoint fn');
    try {
      await tx.query('select public.apply_payment_plan($1, $2, $3::jsonb)', [
        customer,
        mode,
        JSON.stringify(items),
      ]);
      await tx.query('release savepoint fn');
      return { ok: true };
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

const items = async (tx: Tx, amounts: number[]): Promise<Item[]> =>
  Promise.all(
    amounts.map(async (amount, i) => ({
      paymentId: randomUUID(),
      dueDate: await day(tx, (i + 1) * 15),
      amount,
    })),
  );

const setup = async (tx: Tx, debt: number, paid = 0) => {
  const owner = await createUser(tx);
  const customer = randomUUID();
  await tx.query(
    `insert into public.customer (id, owner_id, name, updated_at) values ($1, $2, 'Natalia', '2026-01-01')`,
    [customer, owner],
  );
  if (debt > 0) {
    await tx.query(
      `insert into public.copy (id, owner_id, title_id, number, status, customer_id, agreed_price, sold_at,
                                public_price_snapshot, colportor_price_snapshot, received_at)
       values ($1, $2, $3, 0, 'sold', $4, $5, now(), $5, 1000, '2026-10-01')`,
      [randomUUID(), owner, TITLE, customer, debt],
    );
  }
  if (paid > 0) {
    await tx.query(
      `insert into public.payment (id, owner_id, customer_id, kind, status, paid_amount, paid_at, method)
       values ($1, $2, $3, 'extra', 'collected', $4, public.today_bogota(), 'cash')`,
      [randomUUID(), owner, customer, paid],
    );
  }
  return { owner, customer };
};

const scheduled = async (tx: Tx, customer: string) =>
  (
    await tx.query(
      `select id, agreed_amount, due_date::text = original_due_date::text as same, deleted_at is not null as deleted
       from public.payment where customer_id = $1 and kind = 'scheduled' order by created_at, due_date`,
      [customer],
    )
  ).rows;

describe('apply_payment_plan (HU-ABO-03)', () => {
  it('replace_all: crea los programados (fecha original = acordada) y mueve la última modificación', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx, 180_000, 40_000);
      const plan = await items(tx, [50_000, 30_000, 30_000, 30_000]);
      expect(await apply(tx, owner, customer, 'replace_all', plan)).toEqual({ ok: true });
      const rows = await scheduled(tx, customer);
      expect(rows.map((r) => [r.agreed_amount, r.same, r.deleted])).toEqual([
        [50_000, true, false],
        [30_000, true, false],
        [30_000, true, false],
        [30_000, true, false],
      ]);
      const c = await tx.query(`select updated_at > '2026-01-02' as t from public.customer where id = $1`, [
        customer,
      ]);
      expect(c.rows[0].t).toBe(true);
    }));

  it('CA-7: cambiar el valor a 70.000 en la ficha nueva deja solo los 2 abonos nuevos (los 4 anteriores borrados)', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx, 140_000);
      await apply(tx, owner, customer, 'replace_all', await items(tx, [35_000, 35_000, 35_000, 35_000]));
      expect(await apply(tx, owner, customer, 'replace_all', await items(tx, [70_000, 70_000]))).toEqual({
        ok: true,
      });
      const rows = await scheduled(tx, customer);
      expect(rows.filter((r) => r.deleted)).toHaveLength(4);
      expect(rows.filter((r) => !r.deleted).map((r) => r.agreed_amount)).toEqual([70_000, 70_000]);
      // Borrar al reemplazar no deja eventos de historial.
      expect(
        (await tx.query('select 1 from public.payment_event where owner_id = $1', [owner])).rowCount,
      ).toBe(0);
    }));

  it('CA-8: debe 100.000 con 40.000 programados; un plan unscheduled_only de 60.000 no toca los existentes', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx, 100_000);
      const existing = await items(tx, [40_000]);
      await apply(tx, owner, customer, 'replace_all', [{ ...existing[0]!, amount: 100_000 }]);
      // Bajamos el existente a 40.000 (edición de HU-ABO-04) para dejar 60.000 sin programar.
      await tx.query('update public.payment set agreed_amount = 40000 where id = $1', [
        existing[0]!.paymentId,
      ]);
      expect(await apply(tx, owner, customer, 'unscheduled_only', await items(tx, [30_000, 30_000]))).toEqual(
        { ok: true },
      );
      const rows = (await scheduled(tx, customer)).filter((r) => !r.deleted);
      expect(rows.map((r) => r.agreed_amount)).toEqual([40_000, 30_000, 30_000]);
      expect(rows[0]!.id).toBe(existing[0]!.paymentId);
    }));

  it('R4: los abonos deben sumar exactamente la base → PLAN_TOTAL_MISMATCH y no crea nada', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx, 140_000);
      expect(
        await apply(tx, owner, customer, 'replace_all', await items(tx, [30_000, 30_000])),
      ).toMatchObject({
        code: 'PLAN_TOTAL_MISMATCH',
      });
      expect(await apply(tx, owner, customer, 'unscheduled_only', await items(tx, [150_000]))).toMatchObject({
        code: 'PLAN_TOTAL_MISMATCH',
      });
      expect(await scheduled(tx, customer)).toEqual([]);
    }));

  it('CA-9: saldo 0 (o todo programado en unscheduled_only) → PLAN_REQUIRES_BALANCE', () =>
    inTransaction(async (tx) => {
      const paidUp = await setup(tx, 50_000, 50_000);
      expect(
        await apply(tx, paidUp.owner, paidUp.customer, 'replace_all', await items(tx, [1_000])),
      ).toMatchObject({
        code: 'PLAN_REQUIRES_BALANCE',
      });
      const { owner, customer } = await setup(tx, 60_000);
      await apply(tx, owner, customer, 'replace_all', await items(tx, [60_000]));
      expect(await apply(tx, owner, customer, 'unscheduled_only', await items(tx, [1_000]))).toMatchObject({
        code: 'PLAN_REQUIRES_BALANCE',
      });
    }));

  it('reintentar el mismo plan no duplica; mezclar ids existentes con nuevos → CONFLICT', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx, 60_000);
      const plan = await items(tx, [30_000, 30_000]);
      await apply(tx, owner, customer, 'replace_all', plan);
      expect(await apply(tx, owner, customer, 'replace_all', plan)).toEqual({ ok: true });
      expect(await apply(tx, owner, customer, 'unscheduled_only', plan)).toEqual({ ok: true });
      expect((await scheduled(tx, customer)).filter((r) => !r.deleted)).toHaveLength(2);
      const mixed = [plan[0]!, { ...plan[1]!, paymentId: randomUUID() }];
      expect(await apply(tx, owner, customer, 'replace_all', mixed)).toMatchObject({ code: 'CONFLICT' });
    }));

  it.each([
    ['sin abonos', [], 'items'],
    ['no es arreglo', { a: 1 }, 'items'],
    ['id que no es UUID', [{ paymentId: 'x', dueDate: '2099-01-01', amount: 1 }], 'items'],
    ['valor 0', [{ paymentId: randomUUID(), dueDate: '2099-01-01', amount: 0 }], 'items'],
    ['valor con decimales', [{ paymentId: randomUUID(), dueDate: '2099-01-01', amount: 1.5 }], 'items'],
    ['valor como texto', [{ paymentId: randomUUID(), dueDate: '2099-01-01', amount: '1' }], 'items'],
    ['fecha inexistente', [{ paymentId: randomUUID(), dueDate: '2099-02-31', amount: 1 }], 'dueDate'],
    ['fecha pasada', [{ paymentId: randomUUID(), dueDate: '2020-01-01', amount: 1 }], 'dueDate'],
  ])('VALIDATION: %s', (_, plan, field) =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx, 60_000);
      expect(await apply(tx, owner, customer, 'replace_all', plan)).toMatchObject({
        code: 'VALIDATION',
        detail: field,
      });
    }),
  );

  it('VALIDATION: ids repetidos y modo desconocido', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx, 60_000);
      const [one] = await items(tx, [30_000]);
      expect(await apply(tx, owner, customer, 'replace_all', [one, one])).toMatchObject({ detail: 'items' });
      expect(await apply(tx, owner, customer, 'otro', [one])).toMatchObject({ detail: 'mode' });
    }));
});

describe('apply_payment_plan: seguridad', () => {
  it('A/B: el cliente de otro → NOT_FOUND; archivado → CUSTOMER_ARCHIVED; inactivo → FORBIDDEN; anon no', () =>
    inTransaction(async (tx) => {
      const a = await setup(tx, 60_000);
      const b = await setup(tx, 60_000);
      expect(await apply(tx, b.owner, a.customer, 'replace_all', await items(tx, [60_000]))).toMatchObject({
        code: 'NOT_FOUND',
      });
      expect(await apply(tx, null, a.customer, 'replace_all', await items(tx, [60_000]))).toMatchObject({
        pgCode: '42501',
      });
      await tx.query('update public.customer set archived_at = now() where id = $1', [a.customer]);
      expect(await apply(tx, a.owner, a.customer, 'replace_all', await items(tx, [60_000]))).toMatchObject({
        code: 'CUSTOMER_ARCHIVED',
      });
      await tx.query('update public.profile set is_active = false where id = $1', [b.owner]);
      expect(await apply(tx, b.owner, b.customer, 'replace_all', await items(tx, [60_000]))).toMatchObject({
        code: 'FORBIDDEN',
      });
      expect(await scheduled(tx, a.customer)).toEqual([]);
    }));
});
