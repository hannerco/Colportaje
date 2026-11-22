// Comprobación de solo lectura de la configuración de seguridad de un proyecto de Supabase (HU-BASE-07).
// La consulta y la evaluación están separadas del transporte: en la nube corre por la Management API
// (scripts/check-cloud.ts) y en las pruebas contra Supabase local con `pg` (tests/rls/cloud-check.test.ts).

/** Nombre del event trigger que crea Supabase con «Enable automatic RLS» (verificado en staging, Postgres 17). */
export const AUTO_RLS_TRIGGER = 'ensure_rls';

export type CloudCheckRow = {
  check: 'owner_table' | 'default_privilege' | 'auto_rls_trigger';
  name: string;
  ok: boolean;
};

export type CloudCheckProblem =
  | { problem: 'rls_disabled'; table: string }
  | { problem: 'default_privilege'; grant: string }
  | { problem: 'auto_rls_trigger_missing' };

/**
 * Una sola consulta (la Management API acepta una sentencia) que devuelve una fila por cosa revisada:
 * - cada tabla de `public` con `owner_id` y si tiene RLS;
 * - cada permiso por defecto sobre tablas nuevas de `public` para `anon` o `authenticated` (no debería haber).
 *   Solo cuenta el rol `postgres`, que es el que crea las tablas en las migraciones; los permisos por defecto de
 *   `supabase_admin` son internos de la plataforma (no se pueden cambiar desde el proyecto) y no aplican a nuestras tablas;
 * - si existe y está activo el event trigger de RLS automática.
 */
export const CLOUD_CHECK_SQL = `
select 'owner_table' as check, c.relname::text as name, c.relrowsecurity as ok
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join pg_attribute a on a.attrelid = c.oid and a.attname = 'owner_id' and not a.attisdropped
 where n.nspname = 'public' and c.relkind in ('r', 'p')
union all
select 'default_privilege', pg_get_userbyid(d.defaclrole) || ' → ' || pg_get_userbyid(acl.grantee) || ': ' || acl.privilege_type, false
  from pg_default_acl d
  cross join lateral aclexplode(d.defaclacl) acl
 where d.defaclnamespace = 'public'::regnamespace
   and d.defaclobjtype = 'r'
   and d.defaclrole = 'postgres'::regrole
   and pg_get_userbyid(acl.grantee) in ('anon', 'authenticated')
union all
select 'auto_rls_trigger', '${AUTO_RLS_TRIGGER}', exists (
  select 1 from pg_event_trigger where evtname = '${AUTO_RLS_TRIGGER}' and evtenabled <> 'D'
)
order by 1, 2
`;

/** Convierte las filas de la consulta en la lista de problemas (vacía = todo en orden). */
export function evaluateCloudCheck(rows: readonly CloudCheckRow[]): CloudCheckProblem[] {
  const problems: CloudCheckProblem[] = [];
  for (const row of rows) {
    if (row.check === 'owner_table' && !row.ok) problems.push({ problem: 'rls_disabled', table: row.name });
    if (row.check === 'default_privilege') problems.push({ problem: 'default_privilege', grant: row.name });
  }
  if (!rows.some((row) => row.check === 'auto_rls_trigger' && row.ok)) {
    problems.push({ problem: 'auto_rls_trigger_missing' });
  }
  return problems;
}

/** Texto en español para la consola (sin valores secretos: solo nombres de tablas y roles). */
export function describeProblem(problem: CloudCheckProblem): string {
  switch (problem.problem) {
    case 'rls_disabled':
      return `La tabla public.${problem.table} tiene owner_id y no tiene RLS.`;
    case 'default_privilege':
      return `Permiso por defecto sobre tablas nuevas de public: ${problem.grant}.`;
    case 'auto_rls_trigger_missing':
      return `Falta o está desactivado el event trigger «${AUTO_RLS_TRIGGER}» (RLS automática).`;
  }
}
