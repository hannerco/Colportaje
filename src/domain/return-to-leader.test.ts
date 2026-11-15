import { describe, expect, it } from 'vitest';
import type { StockCopy } from './inventory';
import {
  buildReturnCandidates,
  requiredNote,
  returnSelectionSummary,
  validateReturnSelection,
} from './return-to-leader';
import { localDate } from './time';

const titles = [
  { id: 't-corazon', name: 'Un corazón tranquilo', category: 'cultural' as const },
  { id: 't-camino', name: 'El camino a Cristo', category: 'religious' as const },
  { id: 't-esperanza', name: 'La gran esperanza', category: 'religious' as const },
  { id: 't-paz', name: 'Paz para el corazón', category: 'minibook' as const },
  { id: 't-salud', name: 'Salud', category: 'minibook' as const },
];

const copy = (
  id: string,
  titleId: string,
  number: number,
  receivedAt: string,
  status: StockCopy['status'] = 'in_stock',
): StockCopy => ({
  id,
  titleId,
  number,
  status,
  receivedAt: localDate(receivedAt),
});

const stock = [
  copy('c4', 't-corazon', 4, '2026-10-20'),
  copy('k3', 't-camino', 3, '2026-09-01'),
  copy('k2', 't-camino', 2, '2026-09-01'),
  copy('e12', 't-esperanza', 12, '2026-10-01'),
  copy('flag', 't-corazon', 5, '2026-08-01', 'flagged'), // con novedad: no es candidato
  copy('m1', 't-paz', 1, '2026-10-01'),
  copy('m2', 't-paz', 2, '2026-10-02'),
  copy('s1', 't-salud', 1, '2026-10-01'),
  copy('huérfano', 't-otro', 1, '2026-10-01'),
];

describe('buildReturnCandidates (HU-INV-09)', () => {
  it('libros en físico por recibido más antiguo, título y número; minibooks por nombre con su cantidad', () => {
    expect(buildReturnCandidates(stock, titles)).toEqual({
      books: [
        {
          copyId: 'k2',
          titleId: 't-camino',
          titleName: 'El camino a Cristo',
          number: 2,
          category: 'religious',
          receivedAt: '2026-09-01',
        },
        {
          copyId: 'k3',
          titleId: 't-camino',
          titleName: 'El camino a Cristo',
          number: 3,
          category: 'religious',
          receivedAt: '2026-09-01',
        },
        {
          copyId: 'e12',
          titleId: 't-esperanza',
          titleName: 'La gran esperanza',
          number: 12,
          category: 'religious',
          receivedAt: '2026-10-01',
        },
        {
          copyId: 'c4',
          titleId: 't-corazon',
          titleName: 'Un corazón tranquilo',
          number: 4,
          category: 'cultural',
          receivedAt: '2026-10-20',
        },
      ],
      minibooks: [
        { titleId: 't-paz', name: 'Paz para el corazón', inStockCount: 2 },
        { titleId: 't-salud', name: 'Salud', inStockCount: 1 },
      ],
    });
  });

  it('a igual recibido ordena por título; la búsqueda filtra por título sin tildes', () => {
    const same = [copy('b', 't-esperanza', 1, '2026-10-01'), copy('a', 't-camino', 9, '2026-10-01')];
    expect(buildReturnCandidates(same, titles).books.map((b) => b.copyId)).toEqual(['a', 'b']);
    const v = buildReturnCandidates(stock, titles, 'CORAZON');
    expect(v.books.map((b) => b.copyId)).toEqual(['c4']);
    expect(v.minibooks.map((m) => m.titleId)).toEqual(['t-paz']);
  });

  it('desempates finales: mismo título y número por id; mismo nombre de minibook por id', () => {
    const twins = [copy('z', 't-camino', 1, '2026-10-01'), copy('y', 't-camino', 1, '2026-10-01')];
    expect(buildReturnCandidates(twins, titles).books.map((b) => b.copyId)).toEqual(['y', 'z']);
    const sameName = [
      { id: 'm-b', name: 'Paz', category: 'minibook' as const },
      { id: 'm-a', name: 'Paz', category: 'minibook' as const },
    ];
    const minis = [copy('1', 'm-b', 1, '2026-10-01'), copy('2', 'm-a', 1, '2026-10-01')];
    expect(buildReturnCandidates(minis, sameName).minibooks.map((m) => m.titleId)).toEqual(['m-a', 'm-b']);
  });
});

describe('returnSelectionSummary (CA-1)', () => {
  const candidates = buildReturnCandidates(stock, titles);

  it('1 cultural y 2 religiosos → total 3, por categoría y por título', () => {
    expect(returnSelectionSummary({ copyIds: ['c4', 'k3', 'e12'], minibookLines: [] }, candidates)).toEqual({
      total: 3,
      byCategory: { cultural: 1, religious: 2, minibook: 0 },
      lines: [
        { titleId: 't-corazon', name: 'Un corazón tranquilo', category: 'cultural', count: 1 },
        { titleId: 't-camino', name: 'El camino a Cristo', category: 'religious', count: 1 },
        { titleId: 't-esperanza', name: 'La gran esperanza', category: 'religious', count: 1 },
      ],
    });
  });

  it('agrupa por título, suma minibooks por cantidad e ignora lo que no es candidato o repetido', () => {
    const summary = returnSelectionSummary(
      {
        copyIds: ['k2', 'k3', 'k3', 'flag', 'nada'],
        minibookLines: [
          { titleId: 't-paz', quantity: 2 },
          { titleId: 't-salud', quantity: 0 },
          { titleId: 't-inexistente', quantity: 1 },
        ],
      },
      candidates,
    );
    expect(summary).toEqual({
      total: 4,
      byCategory: { cultural: 0, religious: 2, minibook: 2 },
      lines: [
        { titleId: 't-camino', name: 'El camino a Cristo', category: 'religious', count: 2 },
        { titleId: 't-paz', name: 'Paz para el corazón', category: 'minibook', count: 2 },
      ],
    });
  });

  it('dos líneas del mismo minibook se suman', () => {
    expect(
      returnSelectionSummary(
        {
          copyIds: [],
          minibookLines: [
            { titleId: 't-paz', quantity: 1 },
            { titleId: 't-paz', quantity: 1 },
          ],
        },
        candidates,
      ).lines,
    ).toEqual([{ titleId: 't-paz', name: 'Paz para el corazón', category: 'minibook', count: 2 }]);
  });
});

describe('validación (R1)', () => {
  it('CA-3: sin nota → NOTE_REQUIRED; la nota se guarda sin espacios sobrantes', () => {
    expect(requiredNote('  ')).toEqual({ ok: false, error: { code: 'NOTE_REQUIRED', retryable: false } });
    expect(requiredNote(undefined)).toMatchObject({ ok: false, error: { code: 'NOTE_REQUIRED' } });
    expect(requiredNote(' Me equivoqué de libro ')).toEqual({ ok: true, value: 'Me equivoqué de libro' });
  });

  it('selección vacía → SELECTION_EMPTY; cantidades no enteras o < 1 → VALIDATION; quita repetidos', () => {
    expect(validateReturnSelection({ copyIds: [], minibookLines: [], note: 'x' })).toMatchObject({
      ok: false,
      error: { code: 'SELECTION_EMPTY' },
    });
    for (const quantity of [0, 1.5])
      expect(
        validateReturnSelection({ copyIds: [], minibookLines: [{ titleId: 't', quantity }], note: 'x' }),
      ).toMatchObject({ ok: false, error: { code: 'VALIDATION', details: { field: 'minibookLines' } } });
    expect(validateReturnSelection({ copyIds: ['a', 'a', 'b'], minibookLines: [], note: ' Fin ' })).toEqual({
      ok: true,
      value: { copyIds: ['a', 'b'], minibookLines: [], note: 'Fin' },
    });
    expect(validateReturnSelection({ copyIds: ['a'], minibookLines: [], note: '' })).toMatchObject({
      ok: false,
      error: { code: 'NOTE_REQUIRED' },
    });
  });
});
