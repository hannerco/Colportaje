// HU-PAN-BASE-01 CA-5: todo código de error que exporta el back tiene su texto en copy/es.ts.
// Los códigos salen de dos fuentes: los objetos exportados `*_ERROR_CODES` / `*_BLOCKERS` del dominio y de las
// features, y los `appError('CÓDIGO'…)` escritos en features y adaptadores.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { copy } from '@/copy/es';

const MODULES = import.meta.glob<Record<string, unknown>>(
  ['/src/domain/**/*.ts', '/src/features/**/*.ts', '!/src/**/*.test.ts', '!/src/**/*.stories.tsx'],
  { eager: true },
);
const SOURCES = import.meta.glob<string>(
  ['/src/features/**/*.{ts,tsx}', '/src/adapters/**/*.ts', '!/src/**/*.test.{ts,tsx}'],
  { query: '?raw', import: 'default', eager: true },
);

const isCodeTable = (name: string) => /_(ERROR_CODES|BLOCKERS)$/.test(name);

/** Los códigos que el back exporta, con dónde se encontró cada uno. */
const exportedCodes = (): Map<string, string> => {
  const codes = new Map<string, string>();
  for (const [file, exports] of Object.entries(MODULES))
    for (const [name, value] of Object.entries(exports))
      if (isCodeTable(name) && typeof value === 'object' && value !== null)
        for (const code of Object.values(value))
          if (typeof code === 'string') codes.set(code, `${file} ${name}`);
  for (const [file, source] of Object.entries(SOURCES))
    for (const match of source.matchAll(/appError\(\s*'([A-Z][A-Z0-9_]+)'/g)) codes.set(match[1]!, file);
  return codes;
};

/** Los códigos sin texto en `copy.errors.codes`. */
const missingMessages = (codes: Iterable<string>, messages: Readonly<Record<string, string>>) =>
  [...codes].filter((code) => !(code in messages)).sort();

describe('textos de los errores (HU-PAN-BASE-01)', () => {
  it('encuentra los códigos del back (comunes, de HU y de adaptadores)', () => {
    const codes = exportedCodes();
    for (const code of [
      'OFFLINE',
      'NETWORK_ERROR',
      'PAYMENT_LOCKED',
      'SOLD_BEFORE_RECEIVED',
      'NO_RECEIPT',
      'STORAGE_FAILED',
    ])
      expect(codes.has(code), code).toBe(true);
  });

  it('CA-5: todo código exportado tiene texto en copy/es.ts', () => {
    const codes = exportedCodes();
    const missing = missingMessages(codes.keys(), copy.errors.codes);
    expect(
      missing.map((code) => `${code} (${codes.get(code)})`),
      'Agrega el texto en copy.errors.codes',
    ).toEqual([]);
  });

  it('CA-5: un código nuevo sin texto se nombra en la falla', () => {
    expect(missingMessages(['PAYMENT_LOCKED', 'BRAND_NEW_CODE'], copy.errors.codes)).toEqual([
      'BRAND_NEW_CODE',
    ]);
  });

  it('ningún texto menciona que el líder asuma una pérdida (BR-COPY-11)', () => {
    const text = readFileSync('src/copy/es.ts', 'utf8');
    expect(text).not.toMatch(/l[íi]der (la |lo )?asum/i);
  });
});
