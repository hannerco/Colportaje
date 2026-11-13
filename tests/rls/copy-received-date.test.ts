// HU-INV-05 · Fecha de recibido: validación en la base, función de la app, historial y seguridad.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { validateReceivedDate } from '@/domain/copy-detail';
import { localDate } from '@/domain/time';
import {
  asAnon,
  asUser,
  assertDatabaseReachable,
  createUser,
  expectError,
  inTransaction,
  pool,
  type Tx,
} from './helpers/db';

const TITLE = '00000000-0000-4000-8000-000000000101';
const RAISED = 'P0001';

beforeAll(assertDatabaseReachable);
afterAll(() => pool.end());

type Outcome = { ok: true } | { ok: false; code: string; pgCode?: string };

const today = async (tx: Tx) =>
  (await tx.query<{ d: string }>('select public.today_bogota()::text as d')).rows[0]!.d;

/** Ejemplar recibido el 2026-10-20; si `soldAt`, vendido a una clienta en ese instante. */
const setup = async (tx: Tx, soldAt: string | null = null) => {
  const owner = await createUser(tx);
  const customer = randomUUID();
  await tx.query(
    `insert into public.customer (id, owner_id, name, updated_at) values ($1, $2, 'María', '2026-01-01')`,
    [customer, owner],
  );
  const copy = randomUUID();
  await tx.query(
    `insert into public.copy (id, owner_id, title_id, number, status, customer_id, agreed_price, sold_at,
                              public_price_snapshot, colportor_price_snapshot, received_at)
     values ($1, $2, $3, 0, $4, $5, $6, $7, 98000, 49000, '2026-10-20')`,
    [
      copy,
      owner,
      TITLE,
      soldAt ? 'sold' : 'in_stock',
      soldAt ? customer : null,
      soldAt ? 93_000 : null,
      soldAt,
    ],
  );
  return { owner, customer, copy };
};

const updateDate = (tx: Tx, user: string | null, copy: string, date: string) => {
  const call = async (): Promise<Outcome> => {
    await tx.query('savepoint upd');
    try {
      await tx.query('select public.update_copy_received_date($1, $2::date)', [copy, date]);
      await tx.query('release savepoint upd');
      return { ok: true };
    } catch (error) {
      await tx.query('rollback to savepoint upd');
      const e = error as { message: string; code?: string };
      return { ok: false, code: e.message.split(':')[0]!, pgCode: e.code };
    }
  };
  return user === null ? asAnon(tx, call) : asUser(tx, user, call);
};

const receivedOf = async (tx: Tx, copy: string) =>
  (await tx.query<{ d: string }>('select received_at::text as d from public.copy where id = $1', [copy]))
    .rows[0]!.d;

describe('update_copy_received_date (HU-INV-05)', () => {
  it('CA-2: vendido el 02/11 → el 03/11 da DATE_AFTER_SALE; el 28/10 se guarda y queda en el historial', () =>
    inTransaction(async (tx) => {
      const { owner, copy } = await setup(tx, '2026-11-02T15:00:00Z');
      expect(await updateDate(tx, owner, copy, '2026-11-03')).toMatchObject({
        ok: false,
        code: 'DATE_AFTER_SALE',
      });
      expect(await receivedOf(tx, copy)).toBe('2026-10-20');

      expect(await updateDate(tx, owner, copy, '2026-10-28')).toEqual({ ok: true });
      expect(await receivedOf(tx, copy)).toBe('2026-10-28');
      const events = await tx.query(
        'select type, data from public.copy_event where copy_id = $1 and type = $2',
        [copy, 'received_date_changed'],
      );
      expect(events.rows).toEqual([
        { type: 'received_date_changed', data: { oldDate: '2026-10-20', newDate: '2026-10-28' } },
      ]);
    }));

  it('R4: en un vendido no cambia nada del cliente (ni su última modificación) ni de la venta', () =>
    inTransaction(async (tx) => {
      const { owner, customer, copy } = await setup(tx, '2026-11-02T15:00:00Z');
      await updateDate(tx, owner, copy, '2026-10-25');
      const c = await tx.query(`select updated_at::date::text as d from public.customer where id = $1`, [
        customer,
      ]);
      expect(c.rows[0].d).toBe('2026-01-01');
      const s = await tx.query('select status, customer_id, agreed_price from public.copy where id = $1', [
        copy,
      ]);
      expect(s.rows[0]).toEqual({ status: 'sold', customer_id: customer, agreed_price: 93_000 });
    }));

  it('R1: una fecha futura → DATE_IN_FUTURE; hoy sí se acepta', () =>
    inTransaction(async (tx) => {
      const { owner, copy } = await setup(tx);
      const tomorrow = (await tx.query<{ d: string }>('select (public.today_bogota() + 1)::text as d'))
        .rows[0]!.d;
      expect(await updateDate(tx, owner, copy, tomorrow)).toMatchObject({ code: 'DATE_IN_FUTURE' });
      expect(await updateDate(tx, owner, copy, await today(tx))).toEqual({ ok: true });
    }));

  it('la misma fecha no deja evento', () =>
    inTransaction(async (tx) => {
      const { owner, copy } = await setup(tx);
      await updateDate(tx, owner, copy, '2026-10-20');
      const n = await tx.query(
        `select 1 from public.copy_event where copy_id = $1 and type = 'received_date_changed'`,
        [copy],
      );
      expect(n.rowCount).toBe(0);
    }));

  it.each([
    ['2026-11-02', '2026-11-03T03:30:00Z', true], // vendido el 02/11 a las 10:30 p. m. en Bogotá
    ['2026-11-03', '2026-11-03T03:30:00Z', false],
    ['2026-11-02', '2026-11-02T15:00:00Z', true],
    ['2026-11-03', '2026-11-02T15:00:00Z', false],
    ['2026-10-01', '2026-11-02T15:00:00Z', true],
  ])('paridad con el dominio: recibido %s con venta %s', (date, soldAt, accepted) =>
    inTransaction(async (tx) => {
      const { owner, copy } = await setup(tx, soldAt);
      const domain = validateReceivedDate(localDate(date), localDate(await today(tx)), new Date(soldAt));
      expect(domain.ok).toBe(accepted);
      expect((await updateDate(tx, owner, copy, date)).ok).toBe(accepted);
    }),
  );
});

describe('la base valida la fecha en toda escritura del ejemplar (trigger)', () => {
  it('vender con una fecha de venta anterior al recibido se rechaza', () =>
    inTransaction(async (tx) => {
      const { customer, copy } = await setup(tx);
      expect(
        await expectError(
          tx,
          `update public.copy set status = 'sold', customer_id = $2, agreed_price = 1, sold_at = '2026-10-19T15:00:00Z' where id = $1`,
          [copy, customer],
        ),
      ).toBe(RAISED);
    }));

  it('insertar un ejemplar con recibido futuro se rechaza', () =>
    inTransaction(async (tx) => {
      const owner = await createUser(tx);
      expect(
        await expectError(
          tx,
          `insert into public.copy (id, owner_id, title_id, number, public_price_snapshot, colportor_price_snapshot, received_at)
           values ($1, $2, $3, 0, 1, 1, public.today_bogota() + 1)`,
          [randomUUID(), owner, TITLE],
        ),
      ).toBe(RAISED);
    }));

  it('otros cambios de un ejemplar antiguo no se frenan por su fecha', () =>
    inTransaction(async (tx) => {
      const { copy } = await setup(tx);
      await tx.query(`update public.copy set status = 'flagged' where id = $1`, [copy]);
    }));
});

describe('update_copy_received_date: seguridad', () => {
  it('A/B: B no cambia el ejemplar de A (NOT_FOUND); un eliminado tampoco se cambia', () =>
    inTransaction(async (tx) => {
      const { copy } = await setup(tx);
      const intruder = await createUser(tx);
      expect(await updateDate(tx, intruder, copy, '2026-10-01')).toMatchObject({ code: 'NOT_FOUND' });
      expect(await receivedOf(tx, copy)).toBe('2026-10-20');

      const other = await setup(tx);
      await tx.query('update public.copy set deleted_at = now() where id = $1', [other.copy]);
      expect(await updateDate(tx, other.owner, other.copy, '2026-10-01')).toMatchObject({
        code: 'NOT_FOUND',
      });
    }));

  it('usuario inactivo → FORBIDDEN; anon no puede ejecutar la función', () =>
    inTransaction(async (tx) => {
      const { owner, copy } = await setup(tx);
      await tx.query('update public.profile set is_active = false where id = $1', [owner]);
      expect(await updateDate(tx, owner, copy, '2026-10-01')).toMatchObject({ code: 'FORBIDDEN' });
      expect(await updateDate(tx, null, copy, '2026-10-01')).toMatchObject({ pgCode: '42501' });
    }));
});
