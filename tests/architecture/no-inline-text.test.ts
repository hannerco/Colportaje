// HU-PAN-BASE-01 R3 (00-REGLAS-COMUNES-FRONT §7): ningún texto en español escrito en `app/` ni en las pantallas de
// presentación (`features/*/screens`); todo sale de `copy/es.ts`. Las stories quedan fuera (llevan ejemplos).
import { globSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const FILES = [...globSync('src/app/**/*.{ts,tsx}'), ...globSync('src/features/*/screens/**/*.tsx')].filter(
  (file) => !/\.(stories|test)\.tsx?$/.test(file) && !file.endsWith('manifest.ts'),
);

const withoutComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

/** Texto visible escrito a mano: un nodo de texto JSX con letras o un literal con letras del español. */
const inlineTexts = (source: string): string[] => {
  const code = withoutComments(source);
  // Texto entre una etiqueta que cierra y otra que abre; no `=> Promise<…>` ni comparaciones (`a >= 0 && b <`).
  const jsxText = [...code.matchAll(/(?<![=-])>([^<>{}\n]*\p{L}{2,}[^<>{}\n]*)</gu)]
    .map((m) => m[1]!.trim())
    .filter((text) => !/[=&|();]/.test(text));
  const spanish = [...code.matchAll(/(['"`])((?:(?!\1).)*[áéíóúñÁÉÍÓÚÑ¿¡](?:(?!\1).)*)\1/gu)].map(
    (m) => m[2]!,
  );
  return [...jsxText, ...spanish];
};

describe('sin texto escrito en app/ ni en pantallas (HU-PAN-BASE-01 R3)', () => {
  it('detecta un texto escrito a mano', () => {
    expect(inlineTexts('const a = <p>Sin clientes</p>;')).toEqual(['Sin clientes']);
    expect(inlineTexts("const b = { label: 'Guardar cambios ahora' , t: 'Información' };")).toEqual([
      'Información',
    ]);
    expect(inlineTexts('// Comentario con tilde: información\nconst c = <p>{copy.x}</p>;')).toEqual([]);
    expect(inlineTexts('type P = { a: () => Promise<void> };\nconst ok = i >= 0 && i < n;')).toEqual([]);
  });

  it('R3: los archivos de app/ y de las pantallas no tienen texto escrito', () => {
    expect(FILES.length).toBeGreaterThan(0);
    const offenders = FILES.flatMap((file) =>
      inlineTexts(readFileSync(file, 'utf8')).map((text) => `${file}: ${text}`),
    );
    expect(offenders).toEqual([]);
  });
});
