import { describe, expect, it } from 'vitest';
import type { CopyStatus } from './copy';
import { buildInStockSummary, flaggedCopies, inStockCopiesOfTitle, type StockCopy } from './inventory';
import { localDate } from './time';
import type { Title } from './title';

const BEBIDAS = '00000000-0000-4000-8000-000000000001';
const CORAZON = '00000000-0000-4000-8000-000000000002';
const ESPERANZA = '00000000-0000-4000-8000-000000000003';
const VIEJO = '00000000-0000-4000-8000-000000000004';
const ATLAS = '00000000-0000-4000-8000-000000000005';

const title = (id: string, name: string, overrides: Partial<Title> = {}): Title => ({
  id,
  name,
  author: null,
  description: null,
  imageUrl: null,
  publicPrice: 75_000,
  colportorPrice: 37_500,
  category: 'cultural',
  isActive: true,
  ...overrides,
});

const TITLES: Title[] = [
  title(BEBIDAS, 'Bebidas saludables'),
  title(CORAZON, 'Un corazón tranquilo', { publicPrice: 82_000, category: 'religious' }),
  title(ESPERANZA, 'Esperanza para hoy', { publicPrice: null, colportorPrice: 1_500, category: 'minibook' }),
  title(ATLAS, 'Árboles y aves'),
];

let seq = 0;
const copies = (titleId: string, n: number, status: CopyStatus = 'in_stock'): StockCopy[] =>
  Array.from({ length: n }, () => ({
    id: `copy-${String(++seq).padStart(4, '0')}`,
    titleId,
    number: seq,
    status,
    receivedAt: localDate('2026-10-01'),
  }));

describe('inventory: Libros en físico (BR-INV-03)', () => {
  it('CA-1: 4 Bebidas, 3 Corazón (uno con novedad) y 12 minibooks → 4, 2, booksTotal 6, minibook 12, 1 por resolver', () => {
    const summary = buildInStockSummary(
      [
        ...copies(BEBIDAS, 4),
        ...copies(CORAZON, 2),
        ...copies(CORAZON, 1, 'flagged'),
        ...copies(ESPERANZA, 12),
      ],
      TITLES,
    );
    expect(summary).toEqual({
      booksTotal: 6,
      titles: [
        {
          titleId: BEBIDAS,
          name: 'Bebidas saludables',
          imageUrl: null,
          category: 'cultural',
          referencePrice: 75_000,
          inStockCount: 4,
        },
        {
          titleId: CORAZON,
          name: 'Un corazón tranquilo',
          imageUrl: null,
          category: 'religious',
          referencePrice: 82_000,
          inStockCount: 2,
        },
      ],
      minibooks: [
        {
          titleId: ESPERANZA,
          name: 'Esperanza para hoy',
          imageUrl: null,
          category: 'minibook',
          referencePrice: 1_500,
          inStockCount: 12,
        },
      ],
      flaggedCount: 1,
    });
  });

  it('CA-2 / BR-GOAL-06: el precio es el de referencia vigente del título, no el copiado en un ejemplar viejo', () => {
    // El resumen ni siquiera recibe los precios copiados: solo título y estado.
    const summary = buildInStockSummary(copies(BEBIDAS, 1), TITLES);
    expect(summary.titles[0]?.referencePrice).toBe(75_000);
  });

  it('CA-3: un título con 0 en físico no aparece (aunque tenga vendidos, perdidos o devueltos)', () => {
    const summary = buildInStockSummary(
      [
        ...copies(ATLAS, 1, 'sold'),
        ...copies(ATLAS, 1, 'lost'),
        ...copies(ATLAS, 1, 'returned_to_leader'),
        ...copies(BEBIDAS, 1),
      ],
      TITLES,
    );
    expect(summary.titles.map((t) => t.titleId)).toEqual([BEBIDAS]);
    expect(summary.booksTotal).toBe(1);
    expect(summary.flaggedCount).toBe(0);
  });

  it('CA-5: un título desactivado con 2 en físico sí aparece con 2', () => {
    const titles = [...TITLES, title(VIEJO, 'Edición anterior', { isActive: false })];
    const summary = buildInStockSummary(copies(VIEJO, 2), titles);
    expect(summary.titles).toEqual([expect.objectContaining({ titleId: VIEJO, inStockCount: 2 })]);
  });

  it('BR-COPY-10 / R4: un ejemplar con novedad no cuenta en físico, solo en Por resolver', () => {
    const summary = buildInStockSummary(copies(BEBIDAS, 2, 'flagged'), TITLES);
    expect(summary).toEqual({ booksTotal: 0, titles: [], minibooks: [], flaggedCount: 2 });
  });

  it('R2: booksTotal no cuenta minibooks', () => {
    expect(buildInStockSummary(copies(ESPERANZA, 5), TITLES).booksTotal).toBe(0);
  });

  it('sin ejemplares: listas vacías y totales en 0', () => {
    expect(buildInStockSummary([], TITLES)).toEqual({
      booksTotal: 0,
      titles: [],
      minibooks: [],
      flaggedCount: 0,
    });
  });

  it('ordena por nombre en español sin tildes; empate por id', () => {
    // Culturales y religiosos van juntos, por nombre (no por categoría).
    const summary = buildInStockSummary(
      [...copies(CORAZON, 1), ...copies(BEBIDAS, 1), ...copies(ATLAS, 1)],
      TITLES,
    );
    expect(summary.titles.map((t) => t.name)).toEqual([
      'Árboles y aves',
      'Bebidas saludables',
      'Un corazón tranquilo',
    ]);
    const twins = [title(CORAZON, 'Igual'), title(BEBIDAS, 'Igual')];
    const tie = buildInStockSummary([...copies(CORAZON, 1), ...copies(BEBIDAS, 1)], twins);
    expect(tie.titles.map((t) => t.titleId)).toEqual([BEBIDAS, CORAZON]);
  });

  it('un ejemplar cuyo título no llegó se omite', () => {
    expect(buildInStockSummary(copies('desconocido', 3), TITLES).booksTotal).toBe(0);
  });
});

describe('inventory: un título abierto', () => {
  const stock = (
    id: string,
    number: number,
    receivedAt: string,
    status: CopyStatus = 'in_stock',
  ): StockCopy => ({
    id,
    titleId: CORAZON,
    number,
    status,
    receivedAt: localDate(receivedAt),
  });

  it('CA-4: #4 (18/10), #9 (25/10) y #13 (03/11) se listan en ese orden', () => {
    const result = inStockCopiesOfTitle(TITLES[1]!, [
      stock('c13', 13, '2026-11-03'),
      stock('c4', 4, '2026-10-18'),
      stock('c9', 9, '2026-10-25'),
    ]);
    expect(result).toEqual({
      title: { name: 'Un corazón tranquilo', inStockCount: 3, referencePrice: 82_000 },
      copies: [
        { copyId: 'c4', number: 4, receivedAt: '2026-10-18' },
        { copyId: 'c9', number: 9, receivedAt: '2026-10-25' },
        { copyId: 'c13', number: 13, receivedAt: '2026-11-03' },
      ],
    });
  });

  it('misma fecha: por número; solo en físico y solo de ese título', () => {
    const result = inStockCopiesOfTitle(TITLES[1]!, [
      stock('c7', 7, '2026-10-18'),
      stock('c2', 2, '2026-10-18'),
      stock('c3', 3, '2026-10-01', 'flagged'),
      stock('c5', 5, '2026-10-01', 'sold'),
      { ...stock('b1', 1, '2026-10-01'), titleId: BEBIDAS },
    ]);
    expect(result.copies.map((c) => c.copyId)).toEqual(['c2', 'c7']);
    expect(result.title.inStockCount).toBe(2);
  });

  it('desempate final por id (datos que la base no permite: mismo número)', () => {
    const result = inStockCopiesOfTitle(TITLES[1]!, [
      stock('b', 1, '2026-10-18'),
      stock('a', 1, '2026-10-18'),
    ]);
    expect(result.copies.map((c) => c.copyId)).toEqual(['a', 'b']);
  });

  it('un minibook sin precio público usa su precio colportor como referencia', () => {
    expect(inStockCopiesOfTitle(TITLES[2]!, []).title).toEqual({
      name: 'Esperanza para hoy',
      inStockCount: 0,
      referencePrice: 1_500,
    });
  });
});

describe('inventory: Por resolver (BR-COPY-10)', () => {
  const item = (copyId: string, titleId: string, at: string, note: string | null = 'El líder dice 4') => ({
    copyId,
    titleId,
    number: 1,
    note,
    flaggedAt: new Date(at),
  });

  it('del más reciente al más antiguo, con el nombre del título; incluye minibooks', () => {
    const result = flaggedCopies(
      [
        item('a', BEBIDAS, '2026-11-01T10:00:00Z'),
        item('b', ESPERANZA, '2026-11-03T10:00:00Z', null),
        item('c', CORAZON, '2026-11-02T10:00:00Z'),
      ],
      TITLES,
    );
    expect(result.map((r) => [r.copyId, r.titleName, r.note])).toEqual([
      ['b', 'Esperanza para hoy', null],
      ['c', 'Un corazón tranquilo', 'El líder dice 4'],
      ['a', 'Bebidas saludables', 'El líder dice 4'],
    ]);
    expect(result[0]).toEqual({
      copyId: 'b',
      titleName: 'Esperanza para hoy',
      number: 1,
      note: null,
      flaggedAt: new Date('2026-11-03T10:00:00Z'),
    });
  });

  it('empate de fecha: por id; un título que no llegó se omite', () => {
    const at = '2026-11-01T10:00:00Z';
    const result = flaggedCopies(
      [item('z', BEBIDAS, at), item('y', BEBIDAS, at), item('x', 'otro', at)],
      TITLES,
    );
    expect(result.map((r) => r.copyId)).toEqual(['y', 'z']);
  });
});
