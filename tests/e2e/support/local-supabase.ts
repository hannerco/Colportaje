// Variables de Supabase LOCAL para las pruebas de punta a punta (HU-PAN-BASE-01). Se leen de
// `supabase status` al correr: no hay archivos de claves y nunca se apunta a la nube.
import { execSync } from 'node:child_process';

export type LocalSupabase = { url: string; anonKey: string; serviceRoleKey: string };

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost']);

let cached: LocalSupabase | undefined;

export const localSupabase = (): LocalSupabase => {
  if (cached) return cached;
  let output: string;
  try {
    output = execSync('pnpm exec supabase status -o env', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    throw new Error('Supabase local no responde: corre `pnpm db:start` antes de `pnpm test:e2e`.');
  }
  const env = Object.fromEntries(
    [...output.matchAll(/^([A-Z_]+)="?([^"\r\n]*)"?$/gm)].map((match) => [match[1]!, match[2]!]),
  );
  const url = env.API_URL;
  const anonKey = env.ANON_KEY;
  const serviceRoleKey = env.SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceRoleKey)
    throw new Error('`supabase status` no dio API_URL, ANON_KEY y SERVICE_ROLE_KEY.');
  // Barrera: la service_role de estas pruebas solo existe para la base local.
  if (!LOCAL_HOSTS.has(new URL(url).hostname))
    throw new Error(`Las E2E solo corren contra Supabase local, no ${url}.`);
  cached = { url, anonKey, serviceRoleKey };
  return cached;
};
