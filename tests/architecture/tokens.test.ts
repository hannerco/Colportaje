// HU-UI-02 · tokens.css coincide uno a uno con las tablas de la HU (que copian tok() / size() del diseño v1.1), y
// cada tema y plataforma define los mismos tokens.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '../..');
const CSS = readFileSync(resolve(ROOT, 'src/ui/tokens/tokens.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const HU = readFileSync(
  resolve(ROOT, 'docs/07-historias-usuario/05-ui/HU-UI-02-tokens-y-fundamentos.md'),
  'utf8',
);

/** Declaraciones `--x: valor` del bloque que empieza con `selector {` (después de `after`, si se da). */
const block = (selector: string, after = ''): Map<string, string> => {
  const from = after ? CSS.indexOf(after) : 0;
  const start = CSS.indexOf(`${selector} {`, from);
  if (start < 0) throw new Error(`No está el bloque ${selector}`);
  const body = CSS.slice(CSS.indexOf('{', start) + 1, CSS.indexOf('}', start));
  return new Map(
    [...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()] as [string, string]),
  );
};

/** Igualdad de valores sin importar mayúsculas, espacios ni ceros finales de los decimales. */
const norm = (value: string) =>
  value
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/(\.\d*?)0+(?=\D|$)/g, '$1')
    .replace(/\.(?=\D|$)/g, '');

const light = block(":root,\n[data-theme='light']");
const dark = block("[data-theme='dark']");
const darkSystem = block(':root:not([data-theme])', '@media (prefers-color-scheme: dark)');
const desktop = block(":root,\n[data-platform='desktop']");
const mobile = block("[data-platform='mobile']");
const mobileViewport = block(':root:not([data-platform])', '@media (max-width: 767px)');
// El bloque :root de lo común (letra, pesos, espacios y radios) es el que empieza con --font-scale.
const common = block(':root', ':root {\n  --font-scale');

describe('tokens.css (HU-UI-02)', () => {
  it('R3: claro, oscuro y oscuro del sistema definen los mismos tokens; el del sistema copia al oscuro', () => {
    expect([...dark.keys()].sort()).toEqual([...light.keys()].sort());
    expect(darkSystem).toEqual(dark);
  });

  it('R4: escritorio, móvil y móvil por ancho definen los mismos tokens; el de ancho copia al móvil', () => {
    expect([...mobile.keys()].sort()).toEqual([...desktop.keys()].sort());
    expect(mobileViewport).toEqual(mobile);
  });

  it('colores y sombras: cada fila de la tabla de la HU, en claro y en oscuro', () => {
    const rows = [...HU.matchAll(/^\| `\w+` \| `(--[\w-]+)` \| `([^`]+)` \| `([^`]+)` \|$/gm)];
    expect(rows.length).toBe(56);
    for (const [, token, lightValue, darkValue] of rows) {
      expect(norm(light.get(token!) ?? ''), `${token} claro`).toBe(norm(lightValue!));
      expect(norm(dark.get(token!) ?? ''), `${token} oscuro`).toBe(norm(darkValue!));
    }
  });

  it('tipografía: la base de cada rol en escritorio y móvil, como la tabla de la HU', () => {
    const rows = [
      ...HU.matchAll(
        /^\| [^|]+ \| `(--text-[\w-]+)` \| ([\d.]+rem) \([\d.]+\) \| (?:([\d.]+rem) \([\d.]+\)|—) \|/gm,
      ),
    ];
    expect(rows.length).toBe(7);
    for (const [, token, desktopValue, mobileValue] of rows) {
      expect(desktop.get(`${token}-base`), `${token} escritorio`).toBe(desktopValue);
      expect(mobile.get(`${token}-base`), `${token} móvil`).toBe(mobileValue ?? desktopValue);
    }
  });

  it('alturas de control: escritorio y móvil en px, como la tabla de la HU', () => {
    const rows = [...HU.matchAll(/^\| [^|]+ \| `(--(?:size|radius|gap)-[\w-]+)` \| (\d+) \| (\d+) \|$/gm)];
    expect(rows.length).toBe(12);
    for (const [, token, desktopValue, mobileValue] of rows) {
      const where = token === '--size-touch' ? [common, common] : [desktop, mobile];
      expect(where[0]!.get(token!), `${token} escritorio`).toBe(`${desktopValue}px`);
      expect(where[1]!.get(token!), `${token} móvil`).toBe(`${mobileValue}px`);
    }
  });

  it('espaciado y radios: cada `token` valor de la tabla de la HU', () => {
    const line = HU.split('\n')
      .filter((l) => /^\| (Espaciado|Radios) /.test(l))
      .join(' ');
    const pairs = [...line.matchAll(/`(--(?:space|radius)-[\w-]+)` (\d+)/g)];
    expect(pairs.length).toBe(16);
    for (const [, token, value] of pairs) expect(common.get(token!), token).toBe(`${value}px`);
  });

  it('R2: cada rol de texto vale su base × --font-scale', () => {
    const roles = block(':root,\n[data-ui-scope]');
    for (const token of desktop.keys()) {
      if (!token.endsWith('-base')) continue;
      const role = token.replace(/-base$/, '');
      expect(roles.get(role)).toBe(`calc(var(${token}) * var(--font-scale, 1))`);
    }
  });
});
