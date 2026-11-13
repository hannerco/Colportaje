import { browserConnectivity } from '@/adapters/browser/connectivity';
import { createSupabaseAuthRepository } from '@/adapters/supabase/auth-repository';
import { createSupabaseBrowserClient, type AppSupabaseClient } from '@/adapters/supabase/client';
import { createSupabaseProfileRepository } from '@/adapters/supabase/profile-repository';
import { getPublicEnv } from '@/lib/env';
import type { Repositories } from '@/repositories';

/** Conecta las implementaciones reales (raíz de composición, ARCHITECTURE §2). */
export function createAppRepositories(): Repositories {
  let client: AppSupabaseClient | undefined;
  // El cliente (y la validación de variables) se crea al primer uso, ya en el navegador.
  const getClient = () => (client ??= createSupabaseBrowserClient(getPublicEnv()));
  return {
    auth: createSupabaseAuthRepository(getClient),
    profiles: createSupabaseProfileRepository(getClient),
    connectivity: browserConnectivity,
  };
}
