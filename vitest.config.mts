import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/domain/**/*.ts'],
      exclude: ['src/domain/**/*.test.ts'],
      // Reglas comunes §10: dominio con cobertura ≥ 95 %.
      thresholds: { lines: 95, branches: 95, functions: 95, statements: 95 },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: [
            'src/**/*.test.{ts,tsx}',
            'tests/architecture/**/*.test.ts',
            'tests/offline/**/*.test.ts',
            'tests/storybook/**/*.test.ts',
          ],
        },
      },
      {
        // Cada story es también una prueba (ADR-0050): se pinta en Chromium, corre su función `play` y pasa el
        // complemento de accesibilidad (falla ante cualquier violación, 00-REGLAS-COMUNES-FRONT §8).
        extends: true,
        plugins: [storybookTest({ configDir: fileURLToPath(new URL('./.storybook', import.meta.url)) })],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
