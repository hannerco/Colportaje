// Límites entre capas: docs/03-arquitectura/ARCHITECTURE.md §2 (HU-BASE-01 R2).
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import { LAYER_RULES } from './eslint.layers.mjs';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'coverage/**', 'next-env.d.ts', 'docs/**']),
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-ignore': true, 'ts-nocheck': true, 'ts-expect-error': 'allow-with-description' },
      ],
      'no-console': 'error',
      eqeqeq: ['error', 'always'],
    },
  },
  ...LAYER_RULES,
]);
