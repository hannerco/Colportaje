import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assertDatabaseReachable, expectError, inTransaction, pool, type Tx } from './helpers/db';

beforeAll(assertDatabaseReachable);
afterAll(() => pool.end());

const insertAuthUser = (tx: Tx, id: string, metadata: Record<string, unknown> | null) =>
  tx.query(
    `insert into auth.users (id, email, aud, role, raw_user_meta_data)
     values ($1, $2, 'authenticated', 'authenticated', $3)`,
    [id, `${id}@example.test`, metadata],
  );

describe('trigger handle_new_user (HU-BASE-03 R2, BR-USR-03)', () => {
  it('R2: al crear un usuario se crean su perfil (con el nombre de los metadatos) y el rol colportor', async () => {
    await inTransaction(async (tx) => {
      const id = randomUUID();
      await insertAuthUser(tx, id, { full_name: '  Hanner Conde ' });
      const profile = await tx.query(
        `select full_name, email, time_format, is_active from public.profile where id = $1`,
        [id],
      );
      expect(profile.rows).toEqual([
        { full_name: 'Hanner Conde', email: `${id}@example.test`, time_format: '12h', is_active: true },
      ]);
      const roles = await tx.query(`select role from public.user_role where user_id = $1`, [id]);
      expect(roles.rows).toEqual([{ role: 'colportor' }]);
    });
  });

  it.each([null, {}, { full_name: '   ' }])(
    'sin nombre en los metadatos (%j) usa el correo',
    async (metadata) => {
      await inTransaction(async (tx) => {
        const id = randomUUID();
        await insertAuthUser(tx, id, metadata);
        const { rows } = await tx.query(`select full_name from public.profile where id = $1`, [id]);
        expect(rows).toEqual([{ full_name: `${id}@example.test` }]);
      });
    },
  );

  it('R2: si no se puede crear el perfil o el rol, el usuario tampoco se crea (misma transacción)', async () => {
    await inTransaction(async (tx) => {
      await tx.query(`alter table public.user_role add constraint test_rechaza check (false) not valid`);
      const id = randomUUID();
      expect(
        await expectError(
          tx,
          `insert into auth.users (id, email, aud, role) values ($1, 'x@example.test', 'authenticated', 'authenticated')`,
          [id],
        ),
      ).toBe('23514');
      const users = await tx.query(`select count(*)::int as n from auth.users where id = $1`, [id]);
      const profiles = await tx.query(`select count(*)::int as n from public.profile where id = $1`, [id]);
      expect([users.rows[0], profiles.rows[0]]).toEqual([{ n: 0 }, { n: 0 }]);
    });
  });
});
