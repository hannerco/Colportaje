// Storybook del front (HU-UI-01, ADR-0050). Se publica en Vercel (proyecto colportor-storybook) con cada push.
import type { StorybookConfig } from '@storybook/nextjs-vite';

const config: StorybookConfig = {
  framework: { name: '@storybook/nextjs-vite', options: {} },
  stories: ['./Inicio.mdx', '../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-vitest'],
  // Solo datos de ejemplo: el Storybook no lee variables de entorno de la app ni habla con Supabase.
  core: { disableTelemetry: true },
};

export default config;
