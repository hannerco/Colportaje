// HU-UI-02 · Sin valores visuales literales fuera de tokens.css (BR-GEN-13, TESTING.md «Pruebas de arquitectura
// (UI)»): ni colores, ni tamaños de letra, ni sombras escritos a mano en .ts, .tsx o .css de src/. Y stylelint
// falla ante un color literal en un .module.css (CA-3).
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import stylelint from 'stylelint';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '../..');

/**
 * Archivos que no se revisan, con su motivo:
 * - tokens.css: es el único lugar con valores visuales;
 * - app/manifest.ts: el manifiesto de la PWA exige colores literales (no entiende variables CSS);
 * - stories y pruebas: comparan contra los valores esperados (p. ej. `rgb(9, 46, 83)`), no pintan con ellos.
 */
const EXCLUDED = [
  /^src\/ui\/tokens\/tokens\.css$/,
  /^src\/app\/manifest\.ts$/,
  /\.stories\.tsx$/,
  /\.test\.tsx?$/,
];

const CSS_RULES: [RegExp, string][] = [
  [/#[0-9a-f]{3,8}\b/i, 'color #hex'],
  [/\b(?:rgba?|hsla?|hwb|oklch|oklab)\(/i, 'función de color'],
  [/font(?:-size)?\s*:[^;]*\d+(?:\.\d+)?(?:px|rem|em)\b/i, 'tamaño de letra literal'],
  [/(?:box|text)-shadow\s*:[^;]*\d+px/i, 'sombra literal'],
];
const TS_RULES: [RegExp, string][] = [
  [/fontSize\s*:\s*['"`]?\d/, 'tamaño de letra literal'],
  [/['"`]#[0-9a-f]{3,8}['"`]/i, 'color #hex'],
  [/\b(?:rgba?|hsla?)\(\s*\d/i, 'función de color'],
  [/(?:boxShadow|textShadow)\s*:\s*['"`][^'"`]*\d+px/, 'sombra literal'],
  [/\b(?:text|bg|border|shadow)-\[/, 'clase con valor arbitrario'],
];

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  );

/** `archivo: tipo de literal` por cada valor visual escrito a mano en `root/src`. */
export function findVisualLiterals(root: string): string[] {
  const found: string[] = [];
  for (const path of walk(join(root, 'src'))) {
    const file = relative(root, path).split(sep).join('/');
    if (!/\.(?:css|tsx?)$/.test(file) || EXCLUDED.some((rule) => rule.test(file))) continue;
    // Los comentarios pueden citar valores del diseño; no pintan.
    const code = readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    for (const [pattern, kind] of file.endsWith('.css') ? CSS_RULES : TS_RULES)
      if (pattern.test(code)) found.push(`${file}: ${kind}`);
  }
  return found;
}

const tmp: string[] = [];
afterAll(() => tmp.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

const fixture = (files: Record<string, string>) => {
  const root = mkdtempSync(join(tmpdir(), 'colportor-literals-'));
  tmp.push(root);
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(join(root, file, '..'), { recursive: true });
    writeFileSync(join(root, file), content);
  }
  return root;
};

describe('arquitectura: sin valores visuales literales (HU-UI-02, BR-GEN-13)', () => {
  it('el repositorio cumple', () => {
    expect(findVisualLiterals(ROOT)).toEqual([]);
  });

  it('CA-4: un .tsx con style={{ fontSize: 14 }} hace fallar la prueba', () => {
    const root = fixture({
      'src/ui/atoms/Foo/Foo.tsx': 'export const Foo = () => <p style={{ fontSize: 14 }}>x</p>;\n',
    });
    expect(findVisualLiterals(root)).toEqual(['src/ui/atoms/Foo/Foo.tsx: tamaño de letra literal']);
  });

  it('detecta colores, sombras y clases arbitrarias; acepta tokens, comentarios y las excepciones', () => {
    const root = fixture({
      'src/ui/atoms/A/A.module.css': '.a { color: #fff; }\n',
      'src/ui/atoms/B/B.module.css': '.b { box-shadow: 0 1px 2px var(--color-scrim); }\n',
      'src/ui/atoms/C/C.module.css': '.c { font: 600 12px/1.4 sans-serif; }\n',
      'src/ui/atoms/D/D.tsx': "export const D = () => <p style={{ color: '#092E53' }} />;\n",
      'src/ui/atoms/E/E.tsx': 'export const E = () => <p className="bg-[#fff]" />;\n',
      'src/ui/atoms/Ok/Ok.module.css':
        '/* #092E53 del diseño */\n.ok { color: var(--color-text); font-size: var(--text-body); box-shadow: var(--shadow-card); }\n',
      'src/ui/atoms/Ok/Ok.stories.tsx': "expect(x).toBe('rgb(9, 46, 83)');\n",
      'src/ui/tokens/tokens.css': ':root { --color-accent: #092e53; }\n',
      'src/app/manifest.ts': "export default { theme_color: '#1F1E1D' };\n",
    });
    expect(findVisualLiterals(root)).toEqual([
      'src/ui/atoms/A/A.module.css: color #hex',
      'src/ui/atoms/B/B.module.css: sombra literal',
      'src/ui/atoms/C/C.module.css: tamaño de letra literal',
      'src/ui/atoms/D/D.tsx: color #hex',
      'src/ui/atoms/E/E.tsx: clase con valor arbitrario',
    ]);
  });
});

describe('stylelint: solo tokens en los estilos (HU-UI-02)', () => {
  const lint = (code: string, file: string) =>
    stylelint.lint({ code, codeFilename: resolve(ROOT, file), cwd: ROOT });

  it('CA-3: un .module.css con color: #fff hace fallar stylelint y nombra el archivo', async () => {
    const result = await lint('.a { color: #fff; }\n', 'src/ui/atoms/Foo/Foo.module.css');
    expect(result.errored).toBe(true);
    expect(result.results[0]!.source).toMatch(/Foo\.module\.css$/);
    expect(result.results[0]!.warnings.map((w) => w.rule)).toContain('color-no-hex');
  });

  it.each([
    ['.a { color: red; }', 'color-named'],
    ['.a { background: rgb(0 0 0 / 50%); }', 'function-disallowed-list'],
    ['.a { font-size: 14px; }', 'declaration-property-value-disallowed-list'],
    ['.a { box-shadow: 0 1px 2px var(--color-scrim); }', 'declaration-property-value-disallowed-list'],
  ])('%s → %s', async (code, rule) => {
    const result = await lint(code, 'src/ui/atoms/Foo/Foo.module.css');
    expect(result.results[0]!.warnings.map((w) => w.rule)).toContain(rule);
  });

  it('con tokens no reclama, y tokens.css queda fuera', async () => {
    const ok = await lint(
      '.a { color: var(--color-text); font-size: var(--text-body); box-shadow: var(--shadow-card); }',
      'src/ui/atoms/Foo/Foo.module.css',
    );
    expect(ok.errored).toBe(false);
    const tokens = await lint(':root { --color-accent: #092e53; }', 'src/ui/tokens/tokens.css');
    expect(tokens.errored).toBe(false);
  });
});
