import type { Tx } from './db';

export type OwnerTableViolation = {
  table: string;
  problem: 'rls_disabled' | 'no_policy' | 'no_authenticated_grant' | 'anon_has_privileges';
};

/**
 * Recorre toda tabla de `public` con columna `owner_id` y reporta lo que le falte del patrón
 * de la migración base (HU-BASE-02 R1, R6, CA-5, CA-7). Una tabla nueva entra sola.
 */
export async function findOwnerTableViolations(tx: Tx): Promise<OwnerTableViolation[]> {
  const { rows } = await tx.query<{
    table: string;
    rls: boolean;
    policies: number;
    authenticated_select: boolean;
    anon_any: boolean;
  }>(`
    select c.relname as table,
           c.relrowsecurity as rls,
           (select count(*)::int from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as policies,
           has_table_privilege('authenticated', c.oid, 'select') as authenticated_select,
           has_table_privilege('anon', c.oid, 'select, insert, update, delete, truncate, references, trigger') as anon_any
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      join pg_attribute a on a.attrelid = c.oid and a.attname = 'owner_id' and not a.attisdropped
     where n.nspname = 'public' and c.relkind in ('r', 'p')
     order by c.relname
  `);
  return rows.flatMap((row): OwnerTableViolation[] => [
    ...(row.rls ? [] : [{ table: row.table, problem: 'rls_disabled' as const }]),
    ...(row.policies > 0 ? [] : [{ table: row.table, problem: 'no_policy' as const }]),
    ...(row.authenticated_select ? [] : [{ table: row.table, problem: 'no_authenticated_grant' as const }]),
    ...(row.anon_any ? [{ table: row.table, problem: 'anon_has_privileges' as const }] : []),
  ]);
}
