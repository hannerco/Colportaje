// Clientes contra Supabase local. Las claves se leen de `supabase status` en cada corrida
// (son las de desarrollo local, iguales en todas las instalaciones); nunca se escriben en el repo.
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { AppSupabaseClient } from '@/adapters/supabase/client';
import type { Database } from '@/adapters/supabase/database.types';

const statusSchema = z.object({
  API_URL: z.url(),
  ANON_KEY: z.string().min(1),
  SERVICE_ROLE_KEY: z.string().min(1),
});

let cached: z.infer<typeof statusSchema> | undefined;

const localStatus = () => {
  if (!cached) {
    let output: string;
    try {
      output = execSync('pnpm exec supabase status -o json', {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
    } catch (cause) {
      throw new Error('Supabase local no está corriendo. Arráncalo con `pnpm db:start`.', { cause });
    }
    cached = statusSchema.parse(JSON.parse(output.slice(output.indexOf('{'))));
  }
  return cached;
};

const noPersistence = { auth: { persistSession: false, autoRefreshToken: false } } as const;

/** Cliente como el de la app (clave anónima + sesión del usuario). */
export const anonClient = (): AppSupabaseClient =>
  createClient<Database>(localStatus().API_URL, localStatus().ANON_KEY, noPersistence);

/** Cliente con la service_role, solo para preparar y limpiar datos de prueba. */
export const adminClient = (): AppSupabaseClient =>
  createClient<Database>(localStatus().API_URL, localStatus().SERVICE_ROLE_KEY, noPersistence);

export const uniqueEmail = (label: string) =>
  `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;

/** Cliente local con la sesión de `accessToken` y un `fetch` propio (para simular fallos de red). */
export const clientWithFetch = (accessToken: string, customFetch: typeof fetch): AppSupabaseClient =>
  createClient<Database>(localStatus().API_URL, localStatus().ANON_KEY, {
    ...noPersistence,
    global: { fetch: customFetch, headers: { Authorization: `Bearer ${accessToken}` } },
  });
