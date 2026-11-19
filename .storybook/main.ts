// Storybook del front (HU-UI-01, ADR-0050). Se publica en Vercel (proyecto colportor-storybook) con cada push.
import type { StorybookConfig } from '@storybook/nextjs-vite';

const config: StorybookConfig = {
  framework: { name: '@storybook/nextjs-vite', options: {} },
  stories: ['./Inicio.mdx', '../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-vitest'],
  // Solo datos de ejemplo: el Storybook no lee variables de entorno de la app ni habla con Supabase.
  core: { disableTelemetry: true },
  // Sin minificar el CSS: las páginas de Fundamentos muestran el valor de cada token tal como está en tokens.css
  // (rgba(31, 30, 29, 0.05)), no reescrito (#1f1e1d0d), para compararlo con la ficha del diseño.
  viteFinal: (vite) => ({ ...vite, build: { ...vite.build, cssMinify: false } }),
};

export default config;
