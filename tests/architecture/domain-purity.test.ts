import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '../..');
const DOMAIN = join(ROOT, 'src', 'domain');

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });

/** Librerías de cálculo puro permitidas en el dominio (sin red, DOM ni estado): lista cerrada, ADR-0048. */
const PURE_PACKAGES: readonly string[] = ['fuse.js'];

const IMPORT = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

/** APIs que no caben en TypeScript puro: red, DOM, almacenamiento y el reloj real (BR-GEN-05). */
const FORBIDDEN_APIS: ReadonlyArray<[RegExp, string]> = [
  [/\bfetch\s*\(/, 'fetch'],
  [
    /\b(window|document|navigator|localStorage|sessionStorage|indexedDB)\b/,
    'DOM o almacenamiento del navegador',
  ],
  [/\bDate\.now\s*\(/, 'Date.now() (el reloj se inyecta)'],
  [/\bnew Date\(\s*\)/, 'new Date() sin argumentos (el reloj se inyecta)'],
  [/\bprocess\./, 'process'],
];

describe('arquitectura: dominio puro (HU-BASE-01 R1, R3)', () => {
  const files = sourceFiles(DOMAIN);

  it('encuentra los archivos del dominio', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files.map((f) => [relative(ROOT, f), f]))('%s solo importa el propio dominio', (_name, file) => {
    const code = readFileSync(file, 'utf8');
    for (const match of code.matchAll(IMPORT)) {
      const specifier = match[1] ?? match[2] ?? '';
      if (specifier.startsWith('@/')) {
        expect(specifier, `${file}: importa ${specifier}`).toMatch(/^@\/domain(\/|$)/);
      } else if (!PURE_PACKAGES.includes(specifier)) {
        expect(specifier, `${file}: importa el paquete ${specifier}`).toMatch(/^\.{1,2}\//);
        const target = resolve(dirname(file), specifier);
        expect(
          target === DOMAIN || target.startsWith(DOMAIN + sep),
          `${file}: sale del dominio con ${specifier}`,
        ).toBe(true);
      }
    }
  });

  it.each(files.map((f) => [relative(ROOT, f), f]))('%s no usa red, DOM ni el reloj real', (_name, file) => {
    const code = readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    for (const [pattern, what] of FORBIDDEN_APIS) {
      expect(pattern.test(code), `${relative(ROOT, file)} usa ${what}`).toBe(false);
    }
  });
});
