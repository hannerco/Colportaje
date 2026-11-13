// Crea un usuario de Colportor (HU-BASE-03). Uso:
//   pnpm user:create --email ana@example.com --name "Ana Pérez" [--admin] [--password <clave>]
// Lee NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY de .env.local (nunca los imprime).
// Sin --password genera una clave segura y la muestra una sola vez.
import { parseArgs } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Database } from '../src/adapters/supabase/database.types';
import { createUser } from './lib/create-user';

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

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    name: { type: 'string' },
    password: { type: 'string' },
    admin: { type: 'boolean', default: false },
  },
});

if (!values.email || !values.name) {
  process.stderr.write(
    'Uso: pnpm user:create --email <correo> --name "<nombre>" [--admin] [--password <clave>]\n',
  );
  process.exit(1);
}

const admin = createClient<Database>(env.data.NEXT_PUBLIC_SUPABASE_URL, env.data.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

try {
  const created = await createUser(admin, {
    email: values.email,
    fullName: values.name,
    password: values.password,
    isAdmin: values.admin,
  });
  const host = new URL(env.data.NEXT_PUBLIC_SUPABASE_URL).host;
  process.stdout.write(
    `Usuario creado en ${host}: ${values.email} (admin: ${values.admin ? 'sí' : 'no'}).\n`,
  );
  if (created.generatedPassword) {
    process.stdout.write(
      `Contraseña: ${created.generatedPassword}\nCompártela por un canal privado; no se vuelve a mostrar.\n`,
    );
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
