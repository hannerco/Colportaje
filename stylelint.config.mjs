// Solo tokens en los estilos (HU-UI-02, BR-GEN-13, ADR-0034, 00-REGLAS-COMUNES-FRONT §5): fuera de
// src/ui/tokens/tokens.css no se escriben colores, tamaños de letra ni sombras; se usa var(--…).
const why = '(BR-GEN-13, HU-UI-02): usa un token de src/ui/tokens/tokens.css.';

/** @type {import('stylelint').Config} */
const config = {
  ignoreFiles: ['src/ui/tokens/tokens.css'],
  rules: {
    'color-no-hex': [true, { message: `Color literal ${why}` }],
    'color-named': ['never', { message: `Color con nombre ${why}` }],
    'function-disallowed-list': [
      ['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'color'],
      { message: `Función de color ${why}` },
    ],
    // Cualquier número en el tamaño de letra o en una sombra es un valor literal.
    'declaration-property-value-disallowed-list': [
      { '/^font(-size)?$/': ['/\\d/'], '/^(box|text)-shadow$/': ['/\\d/'] },
      { message: `Tamaño de letra o sombra literal ${why}` },
    ],
  },
};

export default config;
