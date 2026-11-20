// Comprueba, solo leyendo, la seguridad de un proyecto de Supabase en la nube (HU-BASE-07). Uso:
//   pnpm check:cloud <staging|prod>
// Lee SUPABASE_ACCESS_TOKEN y SUPABASE_PROJECT_REF_STAGING / SUPABASE_PROJECT_REF_PROD del entorno o de .env.local
// (nunca los imprime). Consulta por la Management API en modo de solo lectura: no hace falta la contraseña de la base.
import { z } from 'zod';
import { CLOUD_CHECK_SQL, describeProblem, evaluateCloudCheck, type CloudCheckRow } from './lib/cloud-check';

const target = process.argv[2];
if (target !== 'staging' && target !== 'prod') {
  process.stderr.write('Uso: pnpm check:cloud <staging|prod>\n');
  process.exit(1);
}

const refVar = target === 'prod' ? 'SUPABASE_PROJECT_REF_PROD' : 'SUPABASE_PROJECT_REF_STAGING';
const env = z
  .object({
    SUPABASE_ACCESS_TOKEN: z.string().trim().min(1),
    [refVar]: z.string().regex(/^[a-z0-9]{20}$/),
  })
  .safeParse(process.env);

if (!env.success) {
  process.stderr.write(`Faltan SUPABASE_ACCESS_TOKEN o ${refVar} (o el ref no tiene el formato esperado).\n`);
  process.exit(1);
}

const ref = String(env.data[refVar]);
const rowSchema = z.array(
  z.object({
    check: z.enum(['owner_table', 'default_privilege', 'auto_rls_trigger']),
    name: z.string(),
    ok: z.boolean(),
  }),
);

const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${env.data.SUPABASE_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: CLOUD_CHECK_SQL, read_only: true }),
});

if (!response.ok) {
  process.stderr.write(`La Management API respondió ${response.status} para ${target}.\n`);
  process.exit(1);
}

const rows: CloudCheckRow[] = rowSchema.parse(await response.json());
const problems = evaluateCloudCheck(rows);
const tables = rows.filter((row) => row.check === 'owner_table').length;

if (problems.length > 0) {
  process.stderr.write(`check:cloud ${target}: ${problems.length} problema(s).\n`);
  for (const problem of problems) process.stderr.write(`- ${describeProblem(problem)}\n`);
  process.exit(1);
}

process.stdout.write(
  `check:cloud ${target}: en orden (${tables} tablas con owner_id con RLS, sin permisos por defecto para anon/authenticated, RLS automática activa).\n`,
);
