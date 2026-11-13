import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PublicEnv } from '@/lib/env';
import type { Database } from './database.types';

export type AppSupabaseClient = SupabaseClient<Database>;

/** Se pide el cliente al usarlo, no al construir los repositorios: así el build no exige variables. */
export type GetSupabaseClient = () => AppSupabaseClient;

/** Cliente del navegador; guarda la sesión en cookies (SECURITY.md). */
export const createSupabaseBrowserClient = (env: PublicEnv): AppSupabaseClient =>
  createBrowserClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
