// HU-ABO-04 · Programar, editar, corregir y cancelar abonos programados: funciones SQL, historial y A/B.
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

type Outcome = { ok: true; value: unknown } | { ok: false; code: string; detail?: string; pgCode?: string };

const call = (tx: Tx, user: string | null, sql: string, params: unknown[]) => {
  const run = async (): Promise<Outcome> => {
    await tx.query('savepoint fn');
    try {
      const { rows } = await tx.query<{ v: unknown }>(sql, params);
      await tx.query('release savepoint fn');
      return { ok: true, value: rows[0]?.v };
    } catch (error) {
      await tx.query('rollback to savepoint fn');
      const e = error as { message: string; code?: string; detail?: string };
      return { ok: false, code: e.message.split(':')[0]!, detail: e.detail, pgCode: e.code };
    }
  };
  return user === null ? asAnon(tx, run) : asUser(tx, user, run);
};

const schedule = (tx: Tx, user: string | null, id: string, customer: string, amount: number, due: string) =>
  call(tx, user, 'select public.schedule_single_payment($1, $2, $3, $4::date) as v', [
    id,
    customer,
    amount,
    due,
  ]);
const setAmount = (tx: Tx, user: string, id: string, amount: number) =>
  call(tx, user, 'select public.update_scheduled_amount($1, $2) as v', [id, amount]);
const correct = (tx: Tx, user: string, id: string, due: string) =>
  call(tx, user, 'select public.correct_scheduled_date($1, $2::date) as v', [id, due]);
const cancel = (tx: Tx, user: string, ids: string[]) =>
  call(tx, user, 'select public.cancel_scheduled_payments($1::uuid[]) as v', [ids]);

const day = async (tx: Tx, offset: number) =>
  (await tx.query<{ d: string }>('select (public.today_bogota() + $1::int)::text as d', [offset])).rows[0]!.d;

const setup = async (tx: Tx) => {
  const owner = await createUser(tx);
  const customer = randomUUID();
  await tx.query(
    `insert into public.customer (id, owner_id, name, updated_at) values ($1, $2, 'Natalia', '2026-01-01')`,
    [customer, owner],
  );
  return { owner, customer };
};

const row = async (tx: Tx, id: string) =>
  (
    await tx.query(
      `select status, agreed_amount, due_date::text as due, original_due_date::text as original, cancel_reason,
              canceled_at is not null as canceled, deleted_at is not null as deleted
       from public.payment where id = $1`,
      [id],
    )
  ).rows[0];

const touched = async (tx: Tx, customer: string) =>
  (await tx.query(`select updated_at > '2026-01-02' as t from public.customer where id = $1`, [customer]))
    .rows[0].t;

describe('schedule_single_payment', () => {
  it('CA-1 / R1: un prospecto sin libros recibe un abono de 50.000 (fecha acordada = original)', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = randomUUID();
      const due = await day(tx, 7);
      expect(await schedule(tx, owner, id, customer, 50_000, due)).toMatchObject({ ok: true });
      expect(await row(tx, id)).toMatchObject({
        status: 'scheduled',
        agreed_amount: 50_000,
        due,
        original: due,
      });
      expect(await touched(tx, customer)).toBe(true);
      // Reintento: no duplica.
      expect(await schedule(tx, owner, id, customer, 50_000, due)).toMatchObject({ ok: true });
      expect(
        (await tx.query('select 1 from public.payment where customer_id = $1', [customer])).rowCount,
      ).toBe(1);
    }));

  it('HU-ABO-08 CA-1: con fecha de ayer se guarda por cobrar; valor 0 → agreedAmount; archivado → CUSTOMER_ARCHIVED', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const past = randomUUID();
      const yesterday = await day(tx, -1);
      expect(await schedule(tx, owner, past, customer, 30_000, yesterday)).toMatchObject({ ok: true });
      expect(await row(tx, past)).toMatchObject({ status: 'scheduled', due: yesterday, original: yesterday });
      expect(await schedule(tx, owner, randomUUID(), customer, 0, await day(tx, 1))).toMatchObject({
        detail: 'agreedAmount',
      });
      await tx.query('update public.customer set archived_at = now() where id = $1', [customer]);
      expect(await schedule(tx, owner, randomUUID(), customer, 1, await day(tx, 1))).toMatchObject({
        code: 'CUSTOMER_ARCHIVED',
      });
    }));
});

describe('update_scheduled_amount y correct_scheduled_date', () => {
  it('CA-2: 35.000 → 35.500 se guarda (a mano no exige múltiplo); bajar deja amount_reduced con form_edit', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = randomUUID();
      await schedule(tx, owner, id, customer, 35_000, await day(tx, 5));
      expect(await setAmount(tx, owner, id, 35_500)).toEqual({ ok: true, value: customer });
      expect((await row(tx, id)).agreed_amount).toBe(35_500);
      await setAmount(tx, owner, id, 30_000);
      const events = await tx.query('select type, data from public.payment_event where payment_id = $1', [
        id,
      ]);
      expect(events.rows).toEqual([
        { type: 'amount_reduced', data: { trigger: 'form_edit', previousAmount: 35_500, newAmount: 30_000 } },
      ]);
    }));

  it('CA-3: corregir el segundo de cuatro al 05/12 mueve su fecha y su original, sin prórroga ni tocar los demás', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const ids = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
      const dues = [await day(tx, 10), await day(tx, 24), await day(tx, 38), await day(tx, 52)];
      for (const [i, id] of ids.entries()) await schedule(tx, owner, id, customer, 10_000, dues[i]!);
      const corrected = await day(tx, 28);
      expect(await correct(tx, owner, ids[1]!, corrected)).toMatchObject({ ok: true });
      expect(await row(tx, ids[1]!)).toMatchObject({ due: corrected, original: corrected });
      for (const i of [0, 2, 3])
        expect(await row(tx, ids[i]!)).toMatchObject({ due: dues[i], original: dues[i] });
      expect(
        (await tx.query('select 1 from public.payment_reschedule where owner_id = $1', [owner])).rowCount,
      ).toBe(0);
      expect(
        (await tx.query(`select current_setting('colportor.payment_correction', true) as v`)).rows[0].v,
      ).toBe('');
    }));

  it('HU-ABO-08 CA-2: corregir a una fecha pasada mueve la fecha y la original, sin prórroga', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = randomUUID();
      await schedule(tx, owner, id, customer, 10_000, await day(tx, 4));
      const past = await day(tx, -6);
      expect(await correct(tx, owner, id, past)).toMatchObject({ ok: true });
      expect(await row(tx, id)).toMatchObject({ status: 'scheduled', due: past, original: past });
      expect(
        (await tx.query('select 1 from public.payment_reschedule where payment_id = $1', [id])).rowCount,
      ).toBe(0);
    }));

  it('un abono cobrado, cancelado o ajeno no se edita ni se corrige', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = randomUUID();
      await schedule(tx, owner, id, customer, 10_000, await day(tx, 5));
      await tx.query(
        `update public.payment set status = 'collected', paid_amount = 10000, paid_at = public.today_bogota(), method = 'cash' where id = $1`,
        [id],
      );
      expect(await setAmount(tx, owner, id, 1)).toMatchObject({ code: 'PAYMENT_NOT_SCHEDULED' });
      expect(await correct(tx, owner, id, await day(tx, 3))).toMatchObject({ code: 'PAYMENT_NOT_SCHEDULED' });
      const intruder = await createUser(tx);
      expect(await setAmount(tx, intruder, id, 1)).toMatchObject({ code: 'NOT_FOUND' });
    }));
});

describe('cancel_scheduled_payments', () => {
  it('CA-5 / R4: queda cancelado con motivo manual y su evento; no cuenta como programado', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const a = randomUUID();
      const b = randomUUID();
      await schedule(tx, owner, a, customer, 10_000, await day(tx, 5));
      await schedule(tx, owner, b, customer, 20_000, await day(tx, 20));
      expect(await cancel(tx, owner, [a])).toEqual({ ok: true, value: customer });
      expect(await row(tx, a)).toMatchObject({
        status: 'canceled',
        cancel_reason: 'manual',
        canceled: true,
        deleted: false,
      });
      const events = await tx.query('select type, data from public.payment_event where payment_id = $1', [a]);
      expect(events.rows).toEqual([{ type: 'canceled', data: { reason: 'manual', agreedAmount: 10_000 } }]);
      const s = await tx.query(
        `select coalesce(sum(agreed_amount), 0)::int as total from public.payment
         where customer_id = $1 and status = 'scheduled' and deleted_at is null`,
        [customer],
      );
      expect(s.rows[0].total).toBe(20_000);
      // Reintento: el ya cancelado se ignora.
      expect(await cancel(tx, owner, [a])).toMatchObject({ ok: true });
    }));

  it('todo o nada: uno cobrado → PAYMENT_NOT_SCHEDULED; de varios clientes → VALIDATION; ajeno → NOT_FOUND', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const a = randomUUID();
      const paid = randomUUID();
      await schedule(tx, owner, a, customer, 10_000, await day(tx, 5));
      await schedule(tx, owner, paid, customer, 10_000, await day(tx, 6));
      await tx.query(
        `update public.payment set status = 'collected', paid_amount = 1, paid_at = public.today_bogota(), method = 'cash' where id = $1`,
        [paid],
      );
      expect(await cancel(tx, owner, [a, paid])).toMatchObject({ code: 'PAYMENT_NOT_SCHEDULED' });
      expect((await row(tx, a)).status).toBe('scheduled');

      const other = randomUUID();
      await tx.query(`insert into public.customer (id, owner_id, name) values ($1, $2, 'Otra')`, [
        other,
        owner,
      ]);
      const b = randomUUID();
      await schedule(tx, owner, b, other, 10_000, await day(tx, 5));
      expect(await cancel(tx, owner, [a, b])).toMatchObject({ code: 'VALIDATION', detail: 'paymentIds' });
      expect(await cancel(tx, owner, [])).toMatchObject({ code: 'VALIDATION' });

      const intruder = await createUser(tx);
      expect(await cancel(tx, intruder, [a])).toMatchObject({ code: 'NOT_FOUND' });
    }));
});

describe('seguridad', () => {
  it('A/B: programar en el cliente de otro → NOT_FOUND; inactivo → FORBIDDEN; anon no ejecuta', () =>
    inTransaction(async (tx) => {
      const a = await setup(tx);
      const b = await setup(tx);
      const due = await day(tx, 5);
      expect(await schedule(tx, b.owner, randomUUID(), a.customer, 1, due)).toMatchObject({
        code: 'NOT_FOUND',
      });
      expect(await schedule(tx, null, randomUUID(), a.customer, 1, due)).toMatchObject({ pgCode: '42501' });
      await tx.query('update public.profile set is_active = false where id = $1', [a.owner]);
      expect(await schedule(tx, a.owner, randomUUID(), a.customer, 1, due)).toMatchObject({
        code: 'FORBIDDEN',
      });
    }));
});
