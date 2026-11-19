// Pruebas de punta a punta (00-REGLAS-COMUNES-FRONT §10, HU-PAN-BASE-01): la app de producción (`next build` +
// `next start`, con el service worker activo) contra Supabase LOCAL, en móvil (390 × 844) y escritorio (1440 × 900).
// Requiere `pnpm db:start`. Las variables públicas se leen de `supabase status` y se hornean en el build de la prueba.
import { defineConfig, devices } from '@playwright/test';
import { STORAGE_STATE } from './tests/e2e/support/global-setup';
import { localSupabase } from './tests/e2e/support/local-supabase';

const PORT = 3100;
const { url, anonKey } = localSupabase();

export default defineConfig({
  testDir: 'tests/e2e',
  globalSetup: './tests/e2e/support/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    storageState: STORAGE_STATE,
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true },
    },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: `pnpm build && pnpm start -p ${PORT}`,
    url: `http://localhost:${PORT}/manifest.webmanifest`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey },
  },
});
