import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Pruebas de seguridad contra Supabase local (`pnpm db:start`); HU-BASE-02.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['tests/rls/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
