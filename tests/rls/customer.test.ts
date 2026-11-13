import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  asUser,
  assertDatabaseReachable,
  createUser,
  expectError,
  inTransaction,
  pool,
  type Tx,
} from './helpers/db';

const INSUFFICIENT_PRIVILEGE = '42501';
const CHECK_VIOLATION = '23514';
const NOT_NULL_VIOLATION = '23502';

beforeAll(assertDatabaseReachable);
afterAll(() => pool.end());

const insertCustomer = (tx: Tx, owner: string, columns: Record<string, unknown> = {}) => {
  const values = { id: randomUUID(), owner_id: owner, name: 'Clienta de prueba', ...columns };
  const keys = Object.keys(values);
  return tx.query(
    `insert into public.customer (${keys.join(', ')}) values (${keys.map((_, i) => `$${i + 1}`).join(', ')})`,
    Object.values(values),
  );
};

const expectInsertError = async (tx: Tx, owner: string, columns: Record<string, unknown>) => {
  await tx.query('savepoint s');
  try {
    await insertCustomer(tx, owner, columns);
  } catch (error) {
    await tx.query('rollback to savepoint s');
    return (error as { code?: string }).code;
  }
  throw new Error(`Se esperaba un error al insertar ${JSON.stringify(columns)}`);
};

describe('customer: checks (HU-CLI-01 R5)', () => {
  it.each([
    ['nombre vacío', { name: '   ' }, CHECK_VIOLATION],
    ['sin nombre', { name: null }, NOT_NULL_VIOLATION],
    ['latitud fuera de rango', { latitude: 91, longitude: 0 }, CHECK_VIOLATION],
    ['longitud fuera de rango', { latitude: 0, longitude: -181 }, CHECK_VIOLATION],
    ['solo latitud', { latitude: 6.25 }, CHECK_VIOLATION],
    ['solo longitud', { longitude: -75.56 }, CHECK_VIOLATION],
    ['precisión negativa', { location_accuracy_m: -1 }, CHECK_VIOLATION],
    ['emoji demasiado largo', { avatar_emoji: 'x'.repeat(17) }, CHECK_VIOLATION],
  ])('R5: rechaza %s', async (_label, columns, code) => {
    await inTransaction(async (tx) => {
      const owner = await createUser(tx);
      expect(await expectInsertError(tx, owner, columns)).toBe(code);
    });
  });

  it('R5: acepta un cliente solo con nombre y uno con ubicación completa', async () => {
    await inTransaction(async (tx) => {
      const owner = await createUser(tx);
      await insertCustomer(tx, owner);
      await insertCustomer(tx, owner, {
        latitude: 6.244203,
        longitude: -75.581215,
        location_accuracy_m: 12,
        avatar_emoji: '👩🏽‍🌾',
      });
    });
  });

  it('R1 / BR-GEN-03: la tabla no tiene columnas de valores derivados', async () => {
    const { rows } = await pool.query<{ column_name: string }>(
      `select column_name from information_schema.columns where table_schema = 'public' and table_name = 'customer'`,
    );
    const columns = rows.map((r) => r.column_name);
    for (const derived of ['debt', 'paid_total', 'balance', 'credit', 'is_prospect', 'standing', 'status']) {
      expect(columns).not.toContain(derived);
    }
  });
});

describe('customer: RLS A/B (HU-CLI-01, BR-GEN-01)', () => {
  it('A ve, edita y archiva solo sus clientes; no ve ni toca los de B; nadie borra físicamente', async () => {
    await inTransaction(async (tx) => {
      const a = await createUser(tx);
      const b = await createUser(tx);
      await insertCustomer(tx, b, { name: 'De B' });
      await asUser(tx, a, async () => {
        await tx.query(`insert into public.customer (id, name) values ($1, 'De A')`, [randomUUID()]);
        const { rows } = await tx.query<{ name: string; owner_id: string }>(
          'select name, owner_id from public.customer',
        );
        expect(rows).toEqual([{ name: 'De A', owner_id: a }]);
        expect(
          (await tx.query(`update public.customer set name = 'x' where owner_id = $1`, [b])).rowCount,
        ).toBe(0);
        expect((await tx.query(`update public.customer set archived_at = now()`)).rowCount).toBe(1);
        expect(await expectError(tx, 'delete from public.customer')).toBe(INSUFFICIENT_PRIVILEGE);
      });
    });
  });

  it('BR-CUS-16: editar el cliente actualiza su "Última modificación"', async () => {
    await inTransaction(async (tx) => {
      const a = await createUser(tx);
      const id = randomUUID();
      await insertCustomer(tx, a, { id, updated_at: '2020-01-01' });
      await asUser(tx, a, async () => {
        await tx.query(`update public.customer set phone = '3001234567' where id = $1`, [id]);
        const { rows } = await tx.query(`select updated_at > '2020-01-01' as changed from public.customer`);
        expect(rows).toEqual([{ changed: true }]);
      });
    });
  });
});
