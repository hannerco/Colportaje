import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assertDatabaseReachable, createOwnerTable, inTransaction, pool } from './helpers/db';
import { findOwnerTableViolations } from './helpers/owner-tables';

beforeAll(assertDatabaseReachable);
afterAll(() => pool.end());

describe('RLS: prueba genérica de tablas con owner_id (HU-BASE-02 R1, R6)', () => {
  it('CA-5: toda tabla con owner_id del esquema migrado tiene RLS, política y GRANT, y nada para anon', async () => {
    await inTransaction(async (tx) => {
      expect(await findOwnerTableViolations(tx)).toEqual([]);
    });
  });

  it('CA-5: una tabla con owner_id agregada en el futuro entra sola y se detecta si le falta RLS', async () => {
    await inTransaction(async (tx) => {
      await tx.query(`create table public.rls_bad (id uuid primary key, owner_id uuid not null)`);
      expect(await findOwnerTableViolations(tx)).toEqual([
        { table: 'rls_bad', problem: 'rls_disabled' },
        { table: 'rls_bad', problem: 'no_policy' },
        { table: 'rls_bad', problem: 'no_authenticated_grant' },
      ]);
    });
  });

  it('CA-7: detecta una tabla sin GRANT a authenticated o con permisos para anon', async () => {
    await inTransaction(async (tx) => {
      await createOwnerTable(tx, 'rls_no_grant', { grant: false });
      await createOwnerTable(tx, 'rls_anon');
      await tx.query('grant select on public.rls_anon to anon');
      expect(await findOwnerTableViolations(tx)).toEqual([
        { table: 'rls_anon', problem: 'anon_has_privileges' },
        { table: 'rls_no_grant', problem: 'no_authenticated_grant' },
      ]);
    });
  });

  it('una tabla que sigue el patrón completo no tiene violaciones', async () => {
    await inTransaction(async (tx) => {
      await createOwnerTable(tx, 'rls_ok');
      expect(await findOwnerTableViolations(tx)).toEqual([]);
    });
  });
});
