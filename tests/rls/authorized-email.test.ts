// Ronda 34 (#41, #43): correos autorizados, gancho de Auth y Admin · Usuarios (BR-USR-01, 05, 07).
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asUser, assertDatabaseReachable, createUser, expectError, inTransaction, pool } from './helpers/db';

const INSUFFICIENT_PRIVILEGE = '42501';

beforeAll(assertDatabaseReachable);
afterAll(() => pool.end());

const hook = async (tx: Parameters<Parameters<typeof inTransaction>[0]>[0], email: string) =>
  (
    await tx.query<{ result: Record<string, unknown> }>(
      `select public.hook_before_user_created($1::jsonb) as result`,
      [JSON.stringify({ user: { email } })],
    )
  ).rows[0]!.result;

describe('Correos autorizados (ronda 34)', () => {
  it('solo un admin autoriza; un colportor no ve ni escribe la lista', async () => {
    await inTransaction(async (tx) => {
      const admin = await createUser(tx, { isAdmin: true });
      const colportor = await createUser(tx);
      await asUser(tx, admin, async () => {
        await tx.query(
          `insert into public.authorized_email (email, full_name) values ('maria@gmail.com', 'María')`,
        );
      });
      await asUser(tx, colportor, async () => {
        expect((await tx.query('select * from public.authorized_email')).rows).toEqual([]);
        expect(
          await expectError(
            tx,
            `insert into public.authorized_email (email, full_name) values ('x@gmail.com', 'X')`,
          ),
        ).toBe(INSUFFICIENT_PRIVILEGE);
      });
    });
  });

  it('el correo se guarda en minúsculas y sin espacios (otro valor se rechaza)', async () => {
    await inTransaction(async (tx) => {
      const admin = await createUser(tx, { isAdmin: true });
      await asUser(tx, admin, async () => {
        expect(
          await expectError(
            tx,
            `insert into public.authorized_email (email, full_name) values ('Maria@Gmail.com', 'M')`,
          ),
        ).toBe('23514');
      });
    });
  });

  it('el gancho deja pasar un correo autorizado y rechaza los demás', async () => {
    await inTransaction(async (tx) => {
      await tx.query(
        `insert into public.authorized_email (email, full_name) values ('maria@gmail.com', 'María')`,
      );
      expect(await hook(tx, 'Maria@Gmail.com')).toEqual({});
      expect(await hook(tx, 'otro@gmail.com')).toEqual({
        error: { http_code: 403, message: 'Este correo no tiene acceso a Colportor.' },
      });
    });
  });

  it('al entrar por primera vez toma el nombre del admin y, si se pidió, el rol admin', async () => {
    await inTransaction(async (tx) => {
      await tx.query(
        `insert into public.authorized_email (email, full_name, is_admin) values ('ana@gmail.com', 'Ana Pérez', true)`,
      );
      const id = randomUUID();
      await tx.query(
        `insert into auth.users (id, email, aud, role, raw_user_meta_data) values ($1, 'ana@gmail.com', 'authenticated', 'authenticated', '{"full_name": "Ana de Google"}')`,
        [id],
      );
      const profile = await tx.query(`select full_name from public.profile where id = $1`, [id]);
      expect(profile.rows).toEqual([{ full_name: 'Ana Pérez' }]);
      const roles = await tx.query(`select role from public.user_role where user_id = $1 order by role`, [
        id,
      ]);
      expect(roles.rows.map((r) => r.role).sort()).toEqual(['admin', 'colportor']);
    });
  });

  it('admin_users: Pendiente hasta que entra; quitar solo un Pendiente; desactivar y reactivar', async () => {
    await inTransaction(async (tx) => {
      const admin = await createUser(tx, { isAdmin: true });
      const other = await createUser(tx);
      await asUser(tx, admin, async () => {
        await tx.query(
          `insert into public.authorized_email (email, full_name) values ('luz@gmail.com', 'Luz')`,
        );
        const { rows } = await tx.query<{ email: string; status: string }>(
          `select email, status from public.admin_users()`,
        );
        expect(rows.find((r) => r.email === 'luz@gmail.com')?.status).toBe('pending');
        expect(rows.filter((r) => r.status === 'active').length).toBeGreaterThanOrEqual(2);

        await tx.query(`select public.admin_set_user_active($1, false)`, [other]);
        const after = await tx.query<{ status: string }>(
          `select status from public.admin_users() where user_id = $1`,
          [other],
        );
        expect(after.rows).toEqual([{ status: 'inactive' }]);
        await tx.query(`select public.admin_set_user_active($1, true)`, [other]);

        // No se desactiva a sí mismo.
        expect(await expectError(tx, `select public.admin_set_user_active($1, false)`, [admin])).toBe(
          'P0001',
        );

        const removed = await tx.query(`delete from public.authorized_email where email = 'luz@gmail.com'`);
        expect(removed.rowCount).toBe(1);
      });
    });
  });

  it('un colportor no lista usuarios ni desactiva a nadie', async () => {
    await inTransaction(async (tx) => {
      const colportor = await createUser(tx);
      const other = await createUser(tx);
      await asUser(tx, colportor, async () => {
        expect((await tx.query('select * from public.admin_users()')).rows).toEqual([]);
        expect(await expectError(tx, `select public.admin_set_user_active($1, false)`, [other])).toBe(
          'P0001',
        );
      });
    });
  });
});
