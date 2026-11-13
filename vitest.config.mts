import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'tests/architecture/**/*.test.ts', 'tests/offline/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**/*.ts'],
      exclude: ['src/domain/**/*.test.ts'],
      // Reglas comunes §10: dominio con cobertura ≥ 95 %.
      thresholds: { lines: 95, branches: 95, functions: 95, statements: 95 },
    },
  },
});
