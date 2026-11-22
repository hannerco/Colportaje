import { describe, expect, it } from 'vitest';
import {
  CATEGORY_ORDER,
  compareTitles,
  referencePrice,
  titleCoverPath,
  validateTitleFields,
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

describe('title: datos del formulario de Admin (BR-TIT-02, BR-TIT-04)', () => {
  const draft = {
    name: '  Psiconutrición  ',
    author: '  ',
    description: ' Salud y emociones ',
    publicPrice: 156_000,
    colportorPrice: 78_000,
    category: 'cultural' as const,
    isActive: true,
  };

  it('BR-TIT-02: limpia los textos; autor o descripción vacíos quedan sin valor', () => {
    expect(validateTitleFields(draft)).toEqual({
      ok: true,
      value: { ...draft, name: 'Psiconutrición', author: null, description: 'Salud y emociones' },
    });
  });

  it('BR-TIT-02: el nombre es obligatorio', () => {
    const result = validateTitleFields({ ...draft, name: '   ' });
    expect(!result.ok && result.error.details?.field).toBe('name');
  });

  it('BR-TIT-04: el precio colportor es obligatorio, entero y no negativo', () => {
    for (const colportorPrice of [null, -1, 1.5]) {
      const result = validateTitleFields({ ...draft, colportorPrice });
      expect(!result.ok && result.error.details?.field).toBe('colportorPrice');
    }
    expect(
      validateTitleFields({ ...draft, category: 'minibook', publicPrice: null, colportorPrice: 0 }).ok,
    ).toBe(true);
  });

  it('BR-TIT-04: sin precio público solo un minibook; si lo trae, mayor que 0', () => {
    const cultural = validateTitleFields({ ...draft, publicPrice: null });
    expect(!cultural.ok && cultural.error.details).toMatchObject({
      field: 'publicPrice',
      reason: 'required_unless_minibook',
    });
    const zero = validateTitleFields({ ...draft, publicPrice: 0 });
    expect(!zero.ok && zero.error.details?.field).toBe('publicPrice');
  });

  it('DT-10: cada portada tiene su propia ruta dentro de la carpeta del título', () => {
    expect(titleCoverPath('t-1', 'c-2')).toBe('t-1/c-2.webp');
  });
});
