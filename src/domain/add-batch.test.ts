import { describe, expect, it } from 'vitest';
import {
  addCatalogGroups,
  batchLines,
  createAddBatch,
  receivedDateOptions,
  validateAddCopiesInput,
  type AddCopiesInput,
} from './add-batch';
import { localDate } from './time';
import type { Title } from './title';

const title = (id: string, name: string, category: Title['category'], isActive = true): Title => ({
  id,
  name,
  author: null,
  description: null,
  imageUrl: `https://img/${id}.webp`,
  publicPrice: category === 'minibook' ? null : 75_000,
  colportorPrice: 37_500,
  category,
  isActive,
});

const CORAZON = '00000000-0000-4000-8000-000000000001';
const BEBIDAS = '00000000-0000-4000-8000-000000000002';
const ATLAS = '00000000-0000-4000-8000-000000000003';
const ESPERANZA = '00000000-0000-4000-8000-000000000004';
const MINI = '00000000-0000-4000-8000-000000000005';
const VIEJO = '00000000-0000-4000-8000-000000000006';

const CATALOG: Title[] = [
  title(MINI, 'Minibook Paz interior', 'minibook'),
  title(ESPERANZA, 'Esperanza para hoy', 'religious'),
  title(CORAZON, 'Un corazón tranquilo', 'cultural'),
  title(BEBIDAS, 'Bebidas saludables', 'cultural'),
  title(ATLAS, 'Árboles y aves', 'cultural'),
  title(VIEJO, 'Edición anterior', 'cultural', false),
];

const empty = () => createAddBatch(CATALOG);

describe('add-batch: lote local (BR-COPY-02, R1)', () => {
  it('CA-1: 2 toques en "Un corazón tranquilo" y 1 en "Bebidas saludables" → total 3, culturales 3', () => {
    const batch = empty().increment(CORAZON).increment(CORAZON).increment(BEBIDAS);
    expect(batch.summary()).toEqual({
      total: 3,
      byCategory: { cultural: 3, religious: 0, minibook: 0 },
      lines: [
        { titleId: BEBIDAS, name: 'Bebidas saludables', category: 'cultural', quantity: 1 },
        { titleId: CORAZON, name: 'Un corazón tranquilo', category: 'cultural', quantity: 2 },
      ],
    });
  });

  it('CA-3: 3 culturales y 15 minibooks → culturales 3, religiosos 0, minibooks 15, total 18', () => {
    const batch = empty().setQuantity(ATLAS, 3).setQuantity(MINI, 15);
    expect(batch.summary()).toMatchObject({
      total: 18,
      byCategory: { cultural: 3, religious: 0, minibook: 15 },
    });
  });

  it('las operaciones no modifican el lote anterior (inmutable)', () => {
    const before = empty().increment(CORAZON);
    const after = before.increment(CORAZON);
    expect(before.quantityOf(CORAZON)).toBe(1);
    expect(after.quantityOf(CORAZON)).toBe(2);
  });

  it('"−" resta uno y no baja de 0; en 0 la línea desaparece', () => {
    const batch = empty().increment(CORAZON).decrement(CORAZON);
    expect(batch.quantityOf(CORAZON)).toBe(0);
    expect(batch.summary().lines).toEqual([]);
    expect(batch.decrement(CORAZON).quantityOf(CORAZON)).toBe(0);
  });

  it('setQuantity(titleId, 0) quita la línea del resumen', () => {
    const batch = empty().setQuantity(CORAZON, 4).setQuantity(BEBIDAS, 1).setQuantity(CORAZON, 0);
    expect(batch.summary().lines.map((l) => l.titleId)).toEqual([BEBIDAS]);
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'setQuantity solo acepta enteros ≥ 0 (%s deja el lote igual)',
    (n) => {
      const batch = empty().setQuantity(CORAZON, 2);
      expect(batch.setQuantity(CORAZON, n).quantityOf(CORAZON)).toBe(2);
    },
  );

  it('una cantidad enorme por error (500) se permite: el Resumen sirve para revisarla', () => {
    expect(empty().setQuantity(MINI, 500).total()).toBe(500);
  });

  it('un título que no está en el catálogo del lote se ignora', () => {
    const batch = empty().increment('otro').setQuantity('otro', 3);
    expect(batch.total()).toBe(0);
  });

  it('clear() (Descartar) vacía el lote', () => {
    expect(empty().setQuantity(CORAZON, 3).increment(MINI).clear().summary()).toEqual({
      total: 0,
      byCategory: { cultural: 0, religious: 0, minibook: 0 },
      lines: [],
    });
  });

  it('BR-MBK-01: las líneas van por categoría (Culturales, Religiosos, Minibooks) y nombre sin tildes', () => {
    const batch = empty().increment(MINI).increment(ESPERANZA).increment(CORAZON).increment(ATLAS);
    expect(batch.summary().lines.map((l) => l.name)).toEqual([
      'Árboles y aves',
      'Un corazón tranquilo',
      'Esperanza para hoy',
      'Minibook Paz interior',
    ]);
  });

  it('empate de nombre: desempata por id (BR-GEN-14)', () => {
    const twins = [title(BEBIDAS, 'Igual', 'cultural'), title(CORAZON, 'Igual', 'cultural')];
    const batch = createAddBatch(twins).increment(BEBIDAS).increment(CORAZON);
    expect(batch.summary().lines.map((l) => l.titleId)).toEqual([CORAZON, BEBIDAS]);
    const reversed = createAddBatch(twins).increment(CORAZON).increment(BEBIDAS);
    expect(reversed.summary().lines.map((l) => l.titleId)).toEqual([CORAZON, BEBIDAS]);
  });

  it('batchLines: un id por ejemplar, en el orden del resumen', () => {
    let n = 0;
    const lines = batchLines(empty().setQuantity(CORAZON, 2).increment(BEBIDAS), () => `id-${++n}`);
    expect(lines).toEqual([
      { titleId: BEBIDAS, copyIds: ['id-1'] },
      { titleId: CORAZON, copyIds: ['id-2', 'id-3'] },
    ]);
  });
});

describe('add-batch: chip de fecha (AF-50)', () => {
  it('CA-7: con hoy 04/11/2026 → Ayer = 03/11/2026 y Anteayer = 02/11/2026', () => {
    expect(receivedDateOptions(localDate('2026-11-04'))).toEqual([
      { key: 'today', date: '2026-11-04' },
      { key: 'yesterday', date: '2026-11-03' },
      { key: 'day_before', date: '2026-11-02' },
    ]);
  });

  it('cruza el cambio de mes y de año', () => {
    expect(receivedDateOptions(localDate('2027-01-01')).map((o) => o.date)).toEqual([
      '2027-01-01',
      '2026-12-31',
      '2026-12-30',
    ]);
  });
});

describe('add-batch: catálogo para agregar (BR-COPY-02)', () => {
  it('solo activos, en Culturales, Religiosos, Minibooks y por nombre sin tildes', () => {
    expect(addCatalogGroups(CATALOG)).toEqual([
      {
        category: 'cultural',
        titles: [
          { id: ATLAS, name: 'Árboles y aves', imageUrl: `https://img/${ATLAS}.webp` },
          { id: BEBIDAS, name: 'Bebidas saludables', imageUrl: `https://img/${BEBIDAS}.webp` },
          { id: CORAZON, name: 'Un corazón tranquilo', imageUrl: `https://img/${CORAZON}.webp` },
        ],
      },
      {
        category: 'religious',
        titles: [{ id: ESPERANZA, name: 'Esperanza para hoy', imageUrl: `https://img/${ESPERANZA}.webp` }],
      },
      {
        category: 'minibook',
        titles: [{ id: MINI, name: 'Minibook Paz interior', imageUrl: `https://img/${MINI}.webp` }],
      },
    ]);
  });

  it('la búsqueda filtra por nombre normalizado (contiene) y los grupos vacíos no aparecen', () => {
    expect(addCatalogGroups(CATALOG, '  CORAZON ')).toEqual([
      {
        category: 'cultural',
        titles: [{ id: CORAZON, name: 'Un corazón tranquilo', imageUrl: `https://img/${CORAZON}.webp` }],
      },
    ]);
    expect(addCatalogGroups(CATALOG, 'arbol').map((g) => g.titles.map((t) => t.id))).toEqual([[ATLAS]]);
    expect(addCatalogGroups(CATALOG, 'edición anterior')).toEqual([]);
  });

  it('empate de nombre: desempata por id', () => {
    const twins = [title(BEBIDAS, 'Igual', 'cultural'), title(CORAZON, 'Igual', 'cultural')];
    expect(addCatalogGroups(twins)[0]?.titles.map((t) => t.id)).toEqual([CORAZON, BEBIDAS]);
    expect(addCatalogGroups([...twins].reverse())[0]?.titles.map((t) => t.id)).toEqual([CORAZON, BEBIDAS]);
  });
});

describe('add-batch: validar antes de confirmar (R4)', () => {
  const today = localDate('2026-11-04');
  const input = (overrides: Partial<AddCopiesInput> = {}): AddCopiesInput => ({
    batchId: '10000000-0000-4000-8000-000000000001',
    receivedAt: today,
    lines: [{ titleId: CORAZON, copyIds: ['20000000-0000-4000-8000-000000000001'] }],
    ...overrides,
  });

  it('un lote válido pasa (hoy o una fecha pasada)', () => {
    expect(validateAddCopiesInput(input(), today)).toEqual({ ok: true, value: input() });
    expect(validateAddCopiesInput(input({ receivedAt: localDate('2026-10-01') }), today).ok).toBe(true);
  });

  it('BATCH_EMPTY: sin líneas o sin ejemplares', () => {
    for (const lines of [[], [{ titleId: CORAZON, copyIds: [] }]]) {
      expect(validateAddCopiesInput(input({ lines }), today)).toEqual({
        ok: false,
        error: { code: 'BATCH_EMPTY', retryable: false },
      });
    }
  });

  it('CA-5 / BR-COPY-04: fecha 05/11/2026 con hoy 04/11/2026 → DATE_IN_FUTURE', () => {
    expect(validateAddCopiesInput(input({ receivedAt: localDate('2026-11-05') }), today)).toEqual({
      ok: false,
      error: { code: 'DATE_IN_FUTURE', retryable: false },
    });
  });

  it.each([
    ['batchId', input({ batchId: 'lote' })],
    ['titleId', input({ lines: [{ titleId: 'x', copyIds: ['20000000-0000-4000-8000-000000000001'] }] })],
    ['copyIds', input({ lines: [{ titleId: CORAZON, copyIds: ['no-uuid'] }] })],
    [
      'copyIds',
      input({
        lines: [
          { titleId: CORAZON, copyIds: ['20000000-0000-4000-8000-000000000001'] },
          { titleId: BEBIDAS, copyIds: ['20000000-0000-4000-8000-000000000001'] },
        ],
      }),
    ],
  ] as const)('VALIDATION en %s', (field, bad) => {
    expect(validateAddCopiesInput(bad, today)).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION', details: { field } },
    });
  });
});
