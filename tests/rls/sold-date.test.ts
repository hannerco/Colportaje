// HU-CLI-13 · Fecha de venta: asignar con fecha, cambiarla, validación en la base, historial y seguridad.
// Las fechas se arman relativas al «hoy» de la base (Bogotá), así la prueba no depende del día en que corre.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { soldAtInstant, validateSoldAt } from '@/domain/copy-detail';
import { addDays, localDate, type LocalDate } from '@/domain/time';
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

const assign = (tx: Tx, user: string | null, copy: string, customer: string, soldOn?: LocalDate) =>
  soldOn
    ? call(tx, user, 'select public.assign_copy_to_customer($1, $2, $3::date) as v', [copy, customer, soldOn])
    : call(tx, user, 'select public.assign_copy_to_customer($1, $2) as v', [copy, customer]);
const updateSoldAt = (tx: Tx, user: string | null, copy: string, soldOn: LocalDate) =>
  call(tx, user, 'select public.update_sold_at($1, $2::date) as v', [copy, soldOn]);
const updateReceived = (tx: Tx, user: string, copy: string, date: LocalDate) =>
  call(tx, user, 'select public.update_copy_received_date($1, $2::date) as v', [copy, date]);

const todayOf = async (tx: Tx) =>
  localDate((await tx.query<{ d: string }>('select public.today_bogota()::text as d')).rows[0]!.d);

/** Una colportora, una clienta (Natalia) y un ejemplar recibido hace `receivedAgo` días. */
const setup = async (tx: Tx, receivedAgo = 21, title = CORAZON) => {
  const today = await todayOf(tx);
  const owner = await createUser(tx);
  const customer = randomUUID();
  await tx.query(
    `insert into public.customer (id, owner_id, name, updated_at) values ($1, $2, 'Natalia', '2026-01-01')`,
    [customer, owner],
  );
  const copy = await addCopy(tx, owner, addDays(today, -receivedAgo), title);
  return { today, owner, customer, copy };
};

const addCopy = async (tx: Tx, owner: string, receivedAt: LocalDate, title = CORAZON) => {
  const copy = randomUUID();
  await tx.query(
    `insert into public.copy (id, owner_id, title_id, number, public_price_snapshot, colportor_price_snapshot, received_at)
     values ($1, $2, $3, (select coalesce(max(number), 0) + 1 from public.copy where owner_id = $2 and title_id = $3),
             $4, 1000, $5)`,
    [copy, owner, title, title === MINI ? null : 95_000, receivedAt],
  );
  return copy;
};

const soldRow = async (tx: Tx, copy: string) =>
  (
    await tx.query<{ day: string; status: string; agreed_price: number; sold_at: Date }>(
      `select (sold_at at time zone 'America/Bogota')::date::text as day, status, agreed_price, sold_at
       from public.copy where id = $1`,
      [copy],
    )
  ).rows[0]!;

/** «Cliente desde»: el primer día de venta de los libros vendidos al cliente (Bogotá). */
const customerSince = async (tx: Tx, customer: string) =>
  (
    await tx.query<{ d: string }>(
      `select min((sold_at at time zone 'America/Bogota')::date)::text as d
       from public.copy where customer_id = $1 and status = 'sold' and deleted_at is null`,
      [customer],
    )
  ).rows[0]!.d;

const eventsOf = async (tx: Tx, copy: string) =>
  (await tx.query(`select type, data from public.copy_event where copy_id = $1 order by seq`, [copy])).rows;

const customerTouched = async (tx: Tx, customer: string) =>
  (await tx.query(`select updated_at > '2026-01-02' as t from public.customer where id = $1`, [customer]))
    .rows[0].t as boolean;

describe('assign_copy_to_customer con fecha de venta (HU-CLI-13)', () => {
  it('CA-1 / R1 / I-32: vendido hace 13 días se guarda ese día, a las 12:00 de Bogotá; «Cliente desde» es ese día', () =>
    inTransaction(async (tx) => {
      const { today, owner, customer, copy } = await setup(tx, 21);
      const soldOn = addDays(today, -13);
      expect(await assign(tx, owner, copy, customer, soldOn)).toMatchObject({ ok: true });
      const row = await soldRow(tx, copy);
      expect(row.day).toBe(soldOn);
      expect(row.sold_at.toISOString()).toBe(`${soldOn}T17:00:00.000Z`);
      // La MISMA regla que el dominio.
      expect(soldAtInstant(soldOn, new Date()).toISOString()).toBe(row.sold_at.toISOString());
      expect(await customerSince(tx, customer)).toBe(soldOn);
    }));

  it('R1 / I-32: sin fecha, o con la de hoy, es el instante actual', () =>
    inTransaction(async (tx) => {
      const { today, owner, customer, copy } = await setup(tx);
      const second = await addCopy(tx, owner, addDays(today, -3));
      expect(await assign(tx, owner, copy, customer)).toMatchObject({ ok: true });
      expect(await assign(tx, owner, second, customer, today)).toMatchObject({ ok: true });
      const now = (await tx.query<{ n: Date }>('select now() as n')).rows[0]!.n.getTime();
      for (const c of [copy, second]) {
        const row = await soldRow(tx, c);
        expect(row.day).toBe(today);
        expect(row.sold_at.getTime()).toBe(now);
      }
    }));

  it('CA-3: vender antes del día de recibido da SOLD_BEFORE_RECEIVED; el mismo día se puede', () =>
    inTransaction(async (tx) => {
      const { today, owner, customer, copy } = await setup(tx, 21);
      expect(await assign(tx, owner, copy, customer, addDays(today, -24))).toMatchObject({
        ok: false,
        code: 'SOLD_BEFORE_RECEIVED',
        pgCode: 'P0001',
      });
      expect((await soldRow(tx, copy)).status).toBe('in_stock');
      expect(validateSoldAt(addDays(today, -24), addDays(today, -21), today)).toMatchObject({ ok: false });
      expect(await assign(tx, owner, copy, customer, addDays(today, -21))).toMatchObject({ ok: true });
    }));

  it('CA-4: vender mañana da SOLD_IN_FUTURE', () =>
    inTransaction(async (tx) => {
      const { today, owner, customer, copy } = await setup(tx);
      expect(await assign(tx, owner, copy, customer, addDays(today, 1))).toMatchObject({
        ok: false,
        code: 'SOLD_IN_FUTURE',
      });
      expect((await soldRow(tx, copy)).status).toBe('in_stock');
    }));
});

describe('update_sold_at (HU-CLI-13)', () => {
  it('CA-2 / R3 / R4: de hace 13 a hace 15 días: se guarda, queda sold_at_changed y no cambia precio ni estado', () =>
    inTransaction(async (tx) => {
      const { today, owner, customer, copy } = await setup(tx, 21);
      const first = addDays(today, -13);
      const next = addDays(today, -15);
      await assign(tx, owner, copy, customer, first);
      await tx.query(`update public.customer set updated_at = '2026-01-01' where id = $1`, [customer]);
      expect(await updateSoldAt(tx, owner, copy, next)).toEqual({ ok: true, value: customer });
      const row = await soldRow(tx, copy);
      expect(row).toMatchObject({ day: next, status: 'sold', agreed_price: 95_000 });
      const events = await eventsOf(tx, copy);
      expect(events.map((e) => e.type)).toEqual(['received', 'sold', 'sold_at_changed']);
      expect(events[2]!.data).toEqual({ customerId: customer, oldDate: first, newDate: next });
      expect(await customerTouched(tx, customer)).toBe(true);
    }));

  it('el mismo día que ya tenía no cambia nada ni deja evento', () =>
    inTransaction(async (tx) => {
      const { today, owner, customer, copy } = await setup(tx);
      await assign(tx, owner, copy, customer, addDays(today, -5));
      expect(await updateSoldAt(tx, owner, copy, addDays(today, -5))).toEqual({ ok: true, value: customer });
      expect((await eventsOf(tx, copy)).map((e) => e.type)).toEqual(['received', 'sold']);
    }));

  it('CA-5 / R6: «Cliente desde» es la primera venta y cambia si esa venta pasa a un día posterior', () =>
    inTransaction(async (tx) => {
      const { today, owner, customer, copy } = await setup(tx, 21);
      const other = await addCopy(tx, owner, addDays(today, -21));
      await assign(tx, owner, copy, customer, addDays(today, -6)); // «10/11»
      await assign(tx, owner, other, customer, addDays(today, -11)); // «05/11»
      expect(await customerSince(tx, customer)).toBe(addDays(today, -11));
      await updateSoldAt(tx, owner, other, addDays(today, -4)); // «12/11»
      expect(await customerSince(tx, customer)).toBe(addDays(today, -6));
    }));

  it('CA-3 / CA-4 al editar: anterior al recibido o futuro se rechazan y la fecha no cambia', () =>
    inTransaction(async (tx) => {
      const { today, owner, customer, copy } = await setup(tx, 21);
      await assign(tx, owner, copy, customer, addDays(today, -13));
      expect(await updateSoldAt(tx, owner, copy, addDays(today, -22))).toMatchObject({
        ok: false,
        code: 'SOLD_BEFORE_RECEIVED',
      });
      expect(await updateSoldAt(tx, owner, copy, addDays(today, 1))).toMatchObject({
        ok: false,
        code: 'SOLD_IN_FUTURE',
      });
      expect((await soldRow(tx, copy)).day).toBe(addDays(today, -13));
    }));

  it('CA-6 / R5: con la venta movida, el recibido no puede pasar de la venta nueva', () =>
    inTransaction(async (tx) => {
      const { today, owner, customer, copy } = await setup(tx, 21);
      await assign(tx, owner, copy, customer, addDays(today, -13));
      await updateSoldAt(tx, owner, copy, addDays(today, -15));
      expect(await updateReceived(tx, owner, copy, addDays(today, -14))).toMatchObject({
        ok: false,
        code: 'DATE_AFTER_SALE',
      });
      expect(await updateReceived(tx, owner, copy, addDays(today, -15))).toMatchObject({ ok: true });
    }));

  it('CA-7: en físico da COPY_NOT_SOLD; un minibook da COPY_IS_MINIBOOK', () =>
    inTransaction(async (tx) => {
      const { today, owner, copy } = await setup(tx);
      expect(await updateSoldAt(tx, owner, copy, today)).toMatchObject({ ok: false, code: 'COPY_NOT_SOLD' });
      const mini = await addCopy(tx, owner, addDays(today, -3), MINI);
      expect(await updateSoldAt(tx, owner, mini, today)).toMatchObject({
        ok: false,
        code: 'COPY_IS_MINIBOOK',
      });
    }));

  it('dos cambios seguidos: gana el último y quedan los dos eventos', () =>
    inTransaction(async (tx) => {
      const { today, owner, customer, copy } = await setup(tx, 21);
      await assign(tx, owner, copy, customer, addDays(today, -13));
      await updateSoldAt(tx, owner, copy, addDays(today, -15));
      await updateSoldAt(tx, owner, copy, addDays(today, -10));
      expect((await soldRow(tx, copy)).day).toBe(addDays(today, -10));
      const changes = (await eventsOf(tx, copy)).filter((e) => e.type === 'sold_at_changed');
      expect(changes.map((e) => e.data.newDate)).toEqual([addDays(today, -15), addDays(today, -10)]);
    }));

  it('devolver el libro quita la fecha de venta y conserva el recibido (BR-COPY-08)', () =>
    inTransaction(async (tx) => {
      const { today, owner, customer, copy } = await setup(tx, 21);
      await assign(tx, owner, copy, customer, addDays(today, -13));
      await call(tx, owner, 'select public.return_copy_from_customer($1, $2) as v', [
        copy,
        'customer_returned',
      ]);
      const row = (
        await tx.query(`select sold_at, received_at::text as r from public.copy where id = $1`, [copy])
      ).rows[0];
      expect(row).toEqual({ sold_at: null, r: addDays(today, -21) });
    }));

  it('seguridad: sin sesión no se puede; otra colportora no ve el ejemplar (NOT_FOUND)', () =>
    inTransaction(async (tx) => {
      const { today, owner, customer, copy } = await setup(tx);
      await assign(tx, owner, copy, customer, addDays(today, -2));
      expect(await updateSoldAt(tx, null, copy, today)).toMatchObject({ ok: false });
      const other = await createUser(tx);
      expect(await updateSoldAt(tx, other, copy, today)).toMatchObject({ ok: false, code: 'NOT_FOUND' });
      expect((await soldRow(tx, copy)).day).toBe(addDays(today, -2));
    }));

  it('sin fecha da VALIDATION', () =>
    inTransaction(async (tx) => {
      const { owner, copy } = await setup(tx);
      expect(await call(tx, owner, 'select public.update_sold_at($1, null) as v', [copy])).toMatchObject({
        ok: false,
        code: 'VALIDATION',
      });
    }));
});
