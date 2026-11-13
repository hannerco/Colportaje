// Reglas de dependencias entre capas (docs/03-arquitectura/ARCHITECTURE.md §2).
// Cada capa declara qué capas NO puede importar; ESLint falla si se rompe (HU-BASE-01 R2).

const LAYERS = ['domain', 'repositories', 'adapters', 'features', 'ui', 'lib', 'copy', 'app'];

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Importar una capa por alias (`@/adapters/...`) o por ruta relativa (`../../adapters/...`). */
const layerImport = (layer) => {
  const l = escape(layer);
  return `^(?:@/${l}|\\.{1,2}/(?:.*/)?${l})(?:/|$)`;
};

const forbidLayers = (from, layers) =>
  layers.map((to) => ({
    regex: layerImport(to),
    message: `Límite entre capas: "${from}" no puede importar "${to}" (ARCHITECTURE §2).`,
  }));

const NO_SUPABASE = {
  regex: '^@supabase/',
  message: 'Límite entre capas: solo "adapters" habla con Supabase (ARCHITECTURE §2).',
};

const others = (layer) => LAYERS.filter((l) => l !== layer);

/** Capa → patrones prohibidos. */
const RULES = {
  // El dominio es TypeScript puro: solo se importa a sí mismo (R1).
  domain: [
    {
      // vitest y fast-check solo aparecen en pruebas; la prueba de pureza revisa el código sin ellas.
      regex: '^(?!\\.{1,2}/|@/domain(?:/|$)|vitest$|fast-check$)',
      message:
        'Límite entre capas: "domain" es TypeScript puro y no importa paquetes externos (ARCHITECTURE §2, HU-BASE-01 R1).',
    },
    ...forbidLayers('domain', others('domain')),
  ],
  repositories: [
    ...forbidLayers('repositories', ['adapters', 'features', 'ui', 'lib', 'copy', 'app']),
    NO_SUPABASE,
  ],
  adapters: forbidLayers('adapters', ['features', 'ui', 'copy', 'app']),
  features: [...forbidLayers('features', ['adapters', 'app']), NO_SUPABASE],
  ui: [
    ...forbidLayers('ui', ['features', 'adapters', 'repositories', 'app']),
    {
      regex: '^@/domain/(?!money$|time$)',
      message: 'Límite entre capas: "ui" solo usa domain/money y domain/time para formato (ARCHITECTURE §2).',
    },
    NO_SUPABASE,
  ],
  lib: [...forbidLayers('lib', ['adapters', 'features', 'repositories', 'ui', 'copy', 'app']), NO_SUPABASE],
  copy: forbidLayers('copy', others('copy')),
  // `app` es la raíz de composición: conecta adapters con features, pero no habla con Supabase.
  app: [NO_SUPABASE],
};

export const LAYER_RULES = Object.entries(RULES).map(([layer, patterns]) => ({
  name: `colportor/layers/${layer}`,
  files: [`src/${layer}/**/*.{ts,tsx}`],
  rules: { 'no-restricted-imports': ['error', { patterns }] },
}));
