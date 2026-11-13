import { describe, expect, it } from 'vitest';
import {
  CATEGORY_ORDER,
  compareTitles,
  referencePrice,
  validateTitleRecord,
  type Title,
  type TitleRecord,
} from './title';

const record = (overrides: Partial<TitleRecord> = {}): TitleRecord => ({
  id: '11111111-1111-4111-8111-111111111111',
  name: 'El conflicto de los siglos',
  author: 'Elena G. de White',
  description: null,
  imagePath: null,
  publicPrice: 75_000,
  colportorPrice: 37_500,
  category: 'cultural',
  isActive: true,
  ...overrides,
});

const aTitle = (overrides: Partial<Title> = {}): Title => ({
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Libro',
  author: null,
  description: null,
  imageUrl: null,
  publicPrice: 50_000,
  colportorPrice: 25_000,
  category: 'cultural',
  isActive: true,
  ...overrides,
});

describe('title: precio de referencia', () => {
  it('CA-3 / BR-INV-03: minibook sin precio público → su precio colportor (1.500)', () => {
    expect(referencePrice({ publicPrice: null, colportorPrice: 1500 })).toBe(1500);
  });

  it('CA-3 / BR-INV-03: cultural con precio público 75.000 → 75.000', () => {
    expect(referencePrice({ publicPrice: 75_000, colportorPrice: 37_500 })).toBe(75_000);
  });

  it('BR-INV-03: un minibook con precio público usa el público', () => {
    expect(referencePrice({ publicPrice: 3000, colportorPrice: 1500 })).toBe(3000);
  });
});

describe('title: validación de un registro del catálogo (BR-TIT-04)', () => {
  it('acepta un cultural válido y recorta el nombre', () => {
    expect(validateTitleRecord(record({ name: '  Libro  ' }))).toEqual({
      ok: true,
      value: record({ name: 'Libro' }),
    });
  });

  it('BR-TIT-04 (R2): cultural o religioso sin precio público → error en publicPrice', () => {
    for (const category of ['cultural', 'religious'] as const) {
      const result = validateTitleRecord(record({ category, publicPrice: null }));
      expect(result).toEqual({
        ok: false,
        error: {
          code: 'VALIDATION',
          retryable: false,
          details: { reason: 'required_unless_minibook', field: 'publicPrice' },
        },
      });
    }
  });

  it('BR-TIT-04: minibook sin precio público y con precio colportor 0 (gratis) es válido', () => {
    expect(
      validateTitleRecord(record({ category: 'minibook', publicPrice: null, colportorPrice: 0 })).ok,
    ).toBe(true);
  });

  it.each([
    ['publicPrice', { publicPrice: 0 }],
    ['publicPrice', { publicPrice: 12.5 }],
    ['publicPrice', { publicPrice: -1 }],
    ['colportorPrice', { colportorPrice: -1 }],
    ['colportorPrice', { colportorPrice: 1.5 }],
    ['name', { name: '   ' }],
    ['id', { id: 'no-es-uuid' }],
  ] as const)('rechaza %s inválido (%j)', (field, overrides) => {
    const result = validateTitleRecord(record(overrides));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.details?.field).toBe(field);
  });
});

describe('title: orden', () => {
  it('CATEGORY_ORDER: cultural, religioso, minibook', () => {
    expect(CATEGORY_ORDER).toEqual(['cultural', 'religious', 'minibook']);
  });

  it('ordena por categoría, luego por nombre en español y desempata por id', () => {
    const titles = [
      aTitle({ id: 'c', name: 'Mini', category: 'minibook' }),
      aTitle({ id: 'b', name: 'Biblia', category: 'religious' }),
      aTitle({ id: 'd', name: 'Ñandú', category: 'cultural' }),
      aTitle({ id: 'a', name: 'álgebra', category: 'cultural' }),
      aTitle({ id: 'f', name: 'Nubes', category: 'cultural' }),
      aTitle({ id: 'e', name: 'Nubes', category: 'cultural' }),
    ];
    expect([...titles].sort(compareTitles).map((t) => t.id)).toEqual(['a', 'e', 'f', 'd', 'b', 'c']);
  });

  it('BR-GEN-14: el desempate por id es determinista en ambos sentidos', () => {
    const a = aTitle({ id: 'a', name: 'Igual' });
    const b = aTitle({ id: 'b', name: 'Igual' });
    expect(compareTitles(a, b)).toBeLessThan(0);
    expect(compareTitles(b, a)).toBeGreaterThan(0);
    expect(compareTitles(a, a)).toBe(0);
  });
});
