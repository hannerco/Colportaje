import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Pruebas de seguridad (RLS) e integración contra Supabase local (`pnpm db:start`).
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['tests/rls/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
