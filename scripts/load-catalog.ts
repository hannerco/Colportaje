// Carga el catálogo de títulos (HU-BASE-04). Uso:
//   pnpm catalog:load scripts/data/catalog.json
// Lee NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY de .env.local (nunca los imprime).
// Formato del archivo: scripts/data/catalog.example.json.
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Database } from '../src/adapters/supabase/database.types';
import { loadCatalog, parseCatalog } from './lib/load-catalog';

const env = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().trim().min(1),
  })
  .safeParse(process.env);

if (!env.success) {
  process.stderr.write(
    'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local (ver .env.example).\n',
  );
  process.exit(1);
}

const file = process.argv[2];
if (!file) {
  process.stderr.write('Uso: pnpm catalog:load <archivo.json>\n');
  process.exit(1);
}

const admin = createClient<Database>(env.data.NEXT_PUBLIC_SUPABASE_URL, env.data.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

try {
  const records = parseCatalog(JSON.parse(await readFile(file, 'utf8')));
  const count = await loadCatalog(admin, records);
  const host = new URL(env.data.NEXT_PUBLIC_SUPABASE_URL).host;
  process.stdout.write(`Catálogo cargado en ${host}: ${count} títulos (creados o actualizados).\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
