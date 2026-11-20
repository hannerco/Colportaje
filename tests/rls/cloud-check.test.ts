// HU-BASE-07 · La consulta de `pnpm check:cloud` contra Supabase local y su evaluación.
// En la nube corre por la Management API; aquí, la misma SQL dentro de una transacción que se revierte.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CLOUD_CHECK_SQL, evaluateCloudCheck, type CloudCheckRow } from '../../scripts/lib/cloud-check';
import { assertDatabaseReachable, createOwnerTable, inTransaction, pool, type Tx } from './helpers/db';

beforeAll(assertDatabaseReachable);
afterAll(() => pool.end());

async function runCheck(tx: Tx): Promise<CloudCheckRow[]> {
  const { rows } = await tx.query<CloudCheckRow>(CLOUD_CHECK_SQL);
  return rows;
}

describe('check:cloud (HU-BASE-07)', () => {
  it('CA-9: todas las tablas migradas con owner_id tienen RLS', async () => {
    await inTransaction(async (tx) => {
      const rows = await runCheck(tx);
      const tables = rows.filter((row) => row.check === 'owner_table');
      expect(tables.length).toBeGreaterThan(0);
      expect(evaluateCloudCheck(rows).filter((p) => p.problem === 'rls_disabled')).toEqual([]);
    });
  });

  it('CA-9: una tabla de prueba sin RLS hace fallar la comprobación', async () => {
    await inTransaction(async (tx) => {
      await tx.query('create table public.cloud_check_sin_rls (id uuid primary key, owner_id uuid not null)');
      expect(evaluateCloudCheck(await runCheck(tx))).toContainEqual({
        problem: 'rls_disabled',
        table: 'cloud_check_sin_rls',
      });
    });
  });

  it('CA-9: una tabla que sigue el patrón no aparece como problema', async () => {
    await inTransaction(async (tx) => {
      await createOwnerTable(tx, 'cloud_check_ok');
      expect(evaluateCloudCheck(await runCheck(tx))).not.toContainEqual({
        problem: 'rls_disabled',
        table: 'cloud_check_ok',
      });
    });
  });

  it('CA-9: falla si falta el trigger de RLS automática o hay permisos por defecto para anon/authenticated', () => {
    const rows: CloudCheckRow[] = [
      { check: 'owner_table', name: 'customer', ok: true },
      { check: 'default_privilege', name: 'postgres → anon: SELECT', ok: false },
      { check: 'auto_rls_trigger', name: 'ensure_rls', ok: false },
    ];
    expect(evaluateCloudCheck(rows)).toEqual([
      { problem: 'default_privilege', grant: 'postgres → anon: SELECT' },
      { problem: 'auto_rls_trigger_missing' },
    ]);
  });

  it('CA-9: con RLS, sin permisos por defecto y con el trigger activo, no hay problemas', () => {
    const rows: CloudCheckRow[] = [
      { check: 'owner_table', name: 'customer', ok: true },
      { check: 'auto_rls_trigger', name: 'ensure_rls', ok: true },
    ];
    expect(evaluateCloudCheck(rows)).toEqual([]);
  });
});
