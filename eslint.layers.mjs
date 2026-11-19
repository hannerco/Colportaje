// Reglas de dependencias entre capas (docs/03-arquitectura/ARCHITECTURE.md §2).
// Cada capa declara qué capas NO puede importar; ESLint falla si se rompe (HU-BASE-01 R2).

const LAYERS = ['domain', 'repositories', 'adapters', 'features', 'ui', 'lib', 'copy', 'app'];

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Importar una capa por alias (`@/adapters/...`) o por ruta relativa que sube hasta ella (`../../adapters/...`).
 * Las capas son carpetas directas de `src/`, así que una ruta relativa a otra capa sube con `../` y lo primero
 * que encuentra es el nombre de la capa. `./copy` (p. ej. `domain/copy.ts`) es un archivo propio, no la capa `copy`.
 */
const layerImport = (layer) => {
  const l = escape(layer);
  return `^(?:@/${l}|(?:\\.\\./)+${l})(?:/|$)`;
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
  // El dominio es TypeScript puro: solo se importa a sí mismo (R1) y las librerías de cálculo puro de ADR-0048.
  domain: [
    {
      // vitest y fast-check solo aparecen en pruebas; la prueba de pureza revisa el código sin ellas.
      // fuse.js: búsqueda difusa (OQ-21), sin red, DOM ni estado (ADR-0048, lista cerrada).
      regex: '^(?!\\.{1,2}/|@/domain(?:/|$)|vitest$|fast-check$|fuse\\.js$)',
      message:
        'Límite entre capas: "domain" es TypeScript puro y solo importa las librerías de cálculo puro de ADR-0048 (ARCHITECTURE §2, HU-BASE-01 R1).',
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

// ─── Front: niveles de ui/, íconos y Radix (ADR-0050, HU-UI-01) ────────────────────────────────────────────
// Usan la regla de typescript-eslint (otro nombre de regla) para no pisar los patrones de capas de arriba: en
// ESLint flat config, dos bloques que configuran la MISMA regla para un archivo se reemplazan, no se suman. Por
// eso cada archivo cae en un solo grupo de abajo, con la lista completa de lo que tiene prohibido.

const UI_LEVELS = ['atoms', 'molecules', 'organisms', 'templates'];

const LUCIDE = {
  regex: '^lucide-react(?:/|$)',
  message:
    'Íconos: solo src/ui/icons importa lucide-react; en el resto se usa <Icon name="…"> (ADR-0050, 00-REGLAS-COMUNES-FRONT §6).',
};
const RADIX = {
  regex: '^@radix-ui/',
  message: 'Radix: solo los componentes de src/ui usan @radix-ui (ADR-0050 §4).',
};

/** Un nivel de ui/ no importa uno superior (por alias o por ruta relativa). */
const higherLevels = (level) =>
  UI_LEVELS.slice(UI_LEVELS.indexOf(level) + 1).map((higher) => ({
    regex: `^(?:@/ui/|(?:\.\./)+)${higher}(?:/|$)`,
    message: `Niveles de ui/: "${level}" no puede importar "${higher}" (ADR-0050, 00-REGLAS-COMUNES-FRONT §3).`,
  }));

const uiGroup = (name, files, patterns, ignores = []) => ({
  name: `colportor/ui/${name}`,
  files,
  ignores,
  rules: { '@typescript-eslint/no-restricted-imports': ['error', { patterns }] },
});

export const UI_RULES = [
  // Todo src fuera de ui/: ni Lucide ni Radix.
  uiGroup('outside-ui', ['src/**/*.{ts,tsx}'], [LUCIDE, RADIX], ['src/ui/**']),
  // ui/ fuera de los niveles y de icons (platform, tokens…): sin Lucide.
  uiGroup(
    'ui-base',
    ['src/ui/**/*.{ts,tsx}'],
    [LUCIDE],
    ['src/ui/icons/**', ...UI_LEVELS.map((l) => `src/ui/${l}/**`)],
  ),
  // Cada nivel: sin Lucide y sin importar un nivel superior.
  ...UI_LEVELS.map((level) =>
    uiGroup(level, [`src/ui/${level}/**/*.{ts,tsx}`], [LUCIDE, ...higherLevels(level)]),
  ),
];
