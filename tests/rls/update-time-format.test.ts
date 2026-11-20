// Ajustes · update_my_time_format: cada usuario activo cambia solo su formato de hora (BR-GEN-07).
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

type Outcome = { ok: true } | { ok: false; code: string };

const update = (tx: Tx, user: string | null, format: string) => {
  const run = async (): Promise<Outcome> => {
    await tx.query('savepoint fn');
    try {
      await tx.query(`select public.update_my_time_format($1::public.time_format)`, [format]);
      await tx.query('release savepoint fn');
      return { ok: true };
    } catch (error) {
      await tx.query('rollback to savepoint fn');
      return { ok: false, code: (error as { message: string }).message.split(':')[0]! };
    }
  };
  return user === null ? asAnon(tx, run) : asUser(tx, user, run);
};

const formatOf = async (tx: Tx, user: string) =>
  (await tx.query(`select time_format from public.profile where id = $1`, [user])).rows[0].time_format;

describe('update_my_time_format (Ajustes, BR-GEN-07)', () => {
  it('por defecto es 12 h; el usuario lo cambia a 24 h y de vuelta, sin tocar el de otro', async () => {
    await inTransaction(async (tx) => {
      const me = await createUser(tx);
      const other = await createUser(tx);
      expect(await formatOf(tx, me)).toBe('12h');
      expect(await update(tx, me, '24h')).toEqual({ ok: true });
      expect(await formatOf(tx, me)).toBe('24h');
      expect(await formatOf(tx, other)).toBe('12h');
      expect(await update(tx, me, '12h')).toEqual({ ok: true });
      expect(await formatOf(tx, me)).toBe('12h');
    });
  });

  it('un usuario desactivado no puede (FORBIDDEN)', async () => {
    await inTransaction(async (tx) => {
      const inactive = await createUser(tx, { isActive: false });
      expect(await update(tx, inactive, '24h')).toEqual({ ok: false, code: 'FORBIDDEN' });
      expect(await formatOf(tx, inactive)).toBe('12h');
    });
  });

  it('sin sesión no se puede ejecutar', async () => {
    await inTransaction(async (tx) => {
      const outcome = await update(tx, null, '24h');
      expect(outcome.ok).toBe(false);
    });
  });

  it('el perfil sigue sin update directo por la API', async () => {
    await inTransaction(async (tx) => {
      const me = await createUser(tx);
      const { rows } = await tx.query(
        `select has_table_privilege('authenticated', 'public.profile', 'UPDATE') as can_update`,
      );
      expect(rows[0].can_update).toBe(false);
      expect(await formatOf(tx, me)).toBe('12h');
    });
  });
});
