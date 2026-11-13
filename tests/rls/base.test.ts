import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fixedClock, todayBogota } from '@/domain/time';
import {
  asAnon,
  asUser,
  assertDatabaseReachable,
  createOwnerTable,
  createUser,
  expectError,
  inTransaction,
  pool,
  type Tx,
} from './helpers/db';

// Códigos de Postgres: 42501 = sin permiso o fila rechazada por RLS.
const INSUFFICIENT_PRIVILEGE = '42501';

beforeAll(assertDatabaseReachable);
afterAll(() => pool.end());

/** Usuarios A y B, cada uno con una fila en la tabla de prueba `rls_probe`. */
async function twoOwners(tx: Tx, a: { isAdmin?: boolean; isActive?: boolean } = {}) {
  const userA = await createUser(tx, a);
  const userB = await createUser(tx);
  await createOwnerTable(tx, 'rls_probe');
  await tx.query(`insert into public.rls_probe (owner_id, note) values ($1, 'de A'), ($2, 'de B')`, [
    userA,
    userB,
  ]);
  return { userA, userB };
}

const owners = async (tx: Tx) =>
  (await tx.query<{ owner_id: string }>('select owner_id from public.rls_probe')).rows.map((r) => r.owner_id);

describe('RLS: aislamiento por usuario (HU-BASE-02)', () => {
  it('CA-1: A solo ve lo suyo, no cambia ni borra lo de B y no inserta a nombre de B', async () => {
    await inTransaction(async (tx) => {
      const { userA, userB } = await twoOwners(tx);
      await asUser(tx, userA, async () => {
        expect(await owners(tx)).toEqual([userA]);
        const updated = await tx.query(`update public.rls_probe set note = 'x' where owner_id = $1`, [userB]);
        expect(updated.rowCount).toBe(0);
        const deleted = await tx.query(`delete from public.rls_probe where owner_id = $1`, [userB]);
        expect(deleted.rowCount).toBe(0);
        expect(
          await expectError(tx, `insert into public.rls_probe (owner_id, note) values ($1, 'falso')`, [
            userB,
          ]),
        ).toBe(INSUFFICIENT_PRIVILEGE);
      });
      const { rows } = await tx.query(`select note from public.rls_probe where owner_id = $1`, [userB]);
      expect(rows).toEqual([{ note: 'de B' }]);
    });
  });

  it('CA-1 (borde): sin owner_id, el default auth.uid() lo asigna al usuario actual', async () => {
    await inTransaction(async (tx) => {
      const { userA } = await twoOwners(tx);
      await asUser(tx, userA, async () => {
        const { rows } = await tx.query(
          `insert into public.rls_probe (note) values ('nueva') returning owner_id`,
        );
        expect(rows).toEqual([{ owner_id: userA }]);
      });
    });
  });

  it('CA-2: ser admin no da acceso a la fila de B', async () => {
    await inTransaction(async (tx) => {
      const { userA } = await twoOwners(tx, { isAdmin: true });
      await asUser(tx, userA, async () => {
        expect(await owners(tx)).toEqual([userA]);
      });
    });
  });

  it('CA-3: un usuario desactivado no ve ni escribe nada, ni siquiera lo suyo', async () => {
    await inTransaction(async (tx) => {
      const { userA } = await twoOwners(tx, { isActive: false });
      await asUser(tx, userA, async () => {
        expect(await owners(tx)).toEqual([]);
        expect(await expectError(tx, `insert into public.rls_probe (note) values ('x')`)).toBe(
          INSUFFICIENT_PRIVILEGE,
        );
      });
    });
  });

  it('CA-6: una fila actualizada cambia su updated_at', async () => {
    await inTransaction(async (tx) => {
      const { userA } = await twoOwners(tx);
      // now() no avanza dentro de una transacción: se parte de una fecha vieja.
      await tx.query(`update public.rls_probe set updated_at = '2020-01-01' where owner_id = $1`, [userA]);
      await asUser(tx, userA, async () => {
        await tx.query(`update public.rls_probe set note = 'editada'`);
        const { rows } = await tx.query<{ changed: boolean }>(
          `select updated_at > '2020-01-01' as changed from public.rls_probe`,
        );
        expect(rows).toEqual([{ changed: true }]);
      });
    });
  });

  it('CA-6: profile también actualiza su updated_at', async () => {
    await inTransaction(async (tx) => {
      const userA = await createUser(tx);
      await tx.query(`update public.profile set updated_at = '2020-01-01' where id = $1`, [userA]);
      await tx.query(`update public.profile set full_name = 'Otro nombre' where id = $1`, [userA]);
      const { rows } = await tx.query(
        `select updated_at > '2020-01-01' as changed from public.profile where id = $1`,
        [userA],
      );
      expect(rows).toEqual([{ changed: true }]);
    });
  });
});

describe('RLS: GRANT explícitos (HU-BASE-02 R6)', () => {
  it('CA-7: una tabla nueva sin GRANT no es accesible para authenticated; con GRANT y política, A ve solo lo suyo', async () => {
    await inTransaction(async (tx) => {
      const userA = await createUser(tx);
      await createOwnerTable(tx, 'rls_no_grant', { grant: false });
      await asUser(tx, userA, async () => {
        expect(await expectError(tx, 'select * from public.rls_no_grant')).toBe(INSUFFICIENT_PRIVILEGE);
      });

      const { userA: owner } = await twoOwners(tx);
      await asUser(tx, owner, async () => {
        expect(await owners(tx)).toEqual([owner]);
      });
    });
  });

  it('CA-7: anon no tiene ningún permiso sobre las tablas de la base', async () => {
    await inTransaction(async (tx) => {
      await asAnon(tx, async () => {
        for (const table of ['profile', 'user_role', 'app_settings']) {
          expect(await expectError(tx, `select * from public.${table}`)).toBe(INSUFFICIENT_PRIVILEGE);
        }
      });
    });
  });
});

describe('RLS: app_settings, user_role y profile (HU-BASE-02 R4)', () => {
  it('CA-4: un usuario no admin no puede modificar app_settings ni user_role', async () => {
    await inTransaction(async (tx) => {
      const userA = await createUser(tx);
      const userB = await createUser(tx);
      await asUser(tx, userA, async () => {
        const updated = await tx.query(`update public.app_settings set bonus_goal = 1`);
        expect(updated.rowCount).toBe(0);
        expect(await expectError(tx, `insert into public.app_settings (id, bonus_goal) values (1, 1)`)).toBe(
          INSUFFICIENT_PRIVILEGE,
        );
        expect(
          await expectError(tx, `insert into public.user_role (user_id, role) values ($1, 'admin')`, [userA]),
        ).toBe(INSUFFICIENT_PRIVILEGE);
        const deleted = await tx.query(`delete from public.user_role where user_id = $1`, [userB]);
        expect(deleted.rowCount).toBe(0);
      });
      const { rows } = await tx.query(`select bonus_goal from public.app_settings`);
      expect(rows).toEqual([{ bonus_goal: 4_000_000 }]);
    });
  });

  it('R4: el admin sí puede cambiar app_settings y gestionar roles', async () => {
    await inTransaction(async (tx) => {
      const admin = await createUser(tx, { isAdmin: true });
      const userB = await createUser(tx);
      await asUser(tx, admin, async () => {
        expect((await tx.query(`update public.app_settings set bonus_goal = 5000000`)).rowCount).toBe(1);
        await tx.query(`insert into public.user_role (user_id, role) values ($1, 'admin')`, [userB]);
        const removed = await tx.query(`delete from public.user_role where user_id = $1 and role = 'admin'`, [
          userB,
        ]);
        expect(removed.rowCount).toBe(1);
      });
    });
  });

  it('R4: un admin desactivado ya no administra', async () => {
    await inTransaction(async (tx) => {
      const admin = await createUser(tx, { isAdmin: true, isActive: false });
      await asUser(tx, admin, async () => {
        expect((await tx.query(`update public.app_settings set bonus_goal = 5000000`)).rowCount).toBe(0);
      });
    });
  });

  it('R4: todo autenticado lee app_settings (una sola fila, bonus_goal 4.000.000)', async () => {
    await inTransaction(async (tx) => {
      const userA = await createUser(tx);
      await asUser(tx, userA, async () => {
        const { rows } = await tx.query(`select * from public.app_settings`);
        expect(rows).toEqual([{ id: 1, bonus_goal: 4_000_000 }]);
      });
    });
  });

  it('profile y user_role: cada quien lee lo suyo (aunque esté desactivado); el admin lee todos', async () => {
    await inTransaction(async (tx) => {
      const userA = await createUser(tx, { isActive: false });
      const admin = await createUser(tx, { isAdmin: true });
      await asUser(tx, userA, async () => {
        const profiles = await tx.query<{ id: string; is_active: boolean }>(
          `select id, is_active from public.profile`,
        );
        expect(profiles.rows).toEqual([{ id: userA, is_active: false }]);
        const roles = await tx.query(`select user_id, role from public.user_role`);
        expect(roles.rows).toEqual([{ user_id: userA, role: 'colportor' }]);
      });
      await asUser(tx, admin, async () => {
        const { rows } = await tx.query<{ id: string }>(`select id from public.profile where id = any($1)`, [
          [userA, admin],
        ]);
        expect(rows.map((r) => r.id).sort()).toEqual([userA, admin].sort());
      });
    });
  });

  it('profile: nadie lo edita por la API todavía', async () => {
    await inTransaction(async (tx) => {
      const userA = await createUser(tx);
      await asUser(tx, userA, async () => {
        expect(await expectError(tx, `update public.profile set is_active = true`)).toBe(
          INSUFFICIENT_PRIVILEGE,
        );
      });
    });
  });
});

describe('today_bogota() (BR-GEN-05)', () => {
  it('coincide con todayBogota del dominio para el mismo instante', async () => {
    await inTransaction(async (tx) => {
      const userA = await createUser(tx);
      await asUser(tx, userA, async () => {
        const { rows } = await tx.query<{ now: Date; today: string }>(
          `select now() as now, today_bogota()::text as today`,
        );
        const [row] = rows;
        expect(row?.today).toBe(todayBogota(fixedClock(row!.now.toISOString())));
      });
    });
  });
});
