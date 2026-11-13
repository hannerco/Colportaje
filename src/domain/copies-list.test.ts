import { describe, expect, it } from 'vitest';
import {
  buildCopiesListView,
  DEFAULT_COPIES_LIST_PARAMS,
  type CopiesListCopy,
  type CopiesListParams,
  type CustomerRef,
} from './copies-list';
import type { CopyStatus } from './copy';
import { localDate } from './time';
import type { Title } from './title';

const PSICO = 't-psico';
const BEBIDAS = 't-bebidas';
const CORAZON = 't-corazon';
const MINI = 't-mini';

const TITLES: Pick<Title, 'id' | 'name' | 'category'>[] = [
  { id: PSICO, name: 'Psiconutrición', category: 'cultural' },
  { id: BEBIDAS, name: 'Bebidas saludables', category: 'cultural' },
  { id: CORAZON, name: 'Un corazón tranquilo', category: 'religious' },
  { id: MINI, name: 'Minibook Paz interior', category: 'minibook' },
];

const MARIA: CustomerRef = { id: 'c-maria', name: 'María Camila Henao', avatarEmoji: '🌻' };
const GLORIA: CustomerRef = { id: 'c-gloria', name: 'Gloria Inés Patiño', avatarEmoji: null };
const CUSTOMERS = [MARIA, GLORIA];

const copy = (
  overrides: Partial<CopiesListCopy> & Pick<CopiesListCopy, 'id' | 'titleId' | 'number'>,
): CopiesListCopy => ({
  status: 'in_stock',
  customerId: null,
  agreedPrice: null,
  publicPriceSnapshot: 98_000,
  receivedAt: localDate('2026-10-01'),
  soldAt: null,
  deletedAt: null,
  ...overrides,
});

const sold = (
  overrides: Partial<CopiesListCopy> & Pick<CopiesListCopy, 'id' | 'titleId' | 'number'>,
  customer = MARIA,
  agreedPrice = 98_000,
  soldAt = '2026-11-02T15:00:00Z',
): CopiesListCopy =>
  copy({ status: 'sold', customerId: customer.id, agreedPrice, soldAt: new Date(soldAt), ...overrides });

/** CA-1: Psiconutrición #6, recibido 20/10, vendido 02/11 a María Camila Henao por 93.000 (público 98.000). */
const PSICO_6 = sold(
  { id: 'psico-6', titleId: PSICO, number: 6, receivedAt: localDate('2026-10-20') },
  MARIA,
  93_000,
);
/** CA-2: Bebidas saludables #9 en físico, recibido 30/10. */
const BEBIDAS_9 = copy({ id: 'bebidas-9', titleId: BEBIDAS, number: 9, receivedAt: localDate('2026-10-30') });

const params = (overrides: Partial<CopiesListParams> = {}): CopiesListParams => ({
  ...DEFAULT_COPIES_LIST_PARAMS,
  ...overrides,
});

const view = (copies: CopiesListCopy[], overrides: Partial<CopiesListParams> = {}) =>
  buildCopiesListView(copies, TITLES, CUSTOMERS, params(overrides));

describe('copies-list: fila (BR-COPY-12, BR-PRC-01/02)', () => {
  it('CA-1: Psiconutrición #6 en Todos por Recibido → fecha 20/10/2026, precio 93.000, diferencia −5.000', () => {
    expect(view([PSICO_6]).rows).toEqual([
      {
        copyId: 'psico-6',
        titleName: 'Psiconutrición',
        number: 6,
        status: 'sold',
        customer: MARIA,
        rowDate: '2026-10-20',
        receivedAt: '2026-10-20',
        soldAt: new Date('2026-11-02T15:00:00Z'),
        price: 93_000,
        priceDelta: -5_000,
        priceDiffers: true,
      },
    ]);
  });

  it('R1 / R2: en físico muestra el público copiado como referencia, sin diferencia ni cliente', () => {
    expect(view([BEBIDAS_9]).rows[0]).toMatchObject({
      price: 98_000,
      priceDelta: null,
      priceDiffers: false,
      customer: null,
    });
  });

  it('vendido al mismo precio público: sin diferencia', () => {
    expect(view([sold({ id: 's', titleId: PSICO, number: 1 })]).rows[0]).toMatchObject({
      price: 98_000,
      priceDelta: null,
      priceDiffers: false,
    });
  });

  it.each(['flagged', 'lost', 'returned_to_leader'] as const)(
    '%s aparece en Todos con su precio público y sin cliente',
    (status) => {
      expect(view([copy({ id: 'x', titleId: BEBIDAS, number: 1, status })]).rows[0]).toMatchObject({
        status,
        price: 98_000,
        customer: null,
      });
    },
  );

  it('un cliente que no llegó no rompe la fila', () => {
    const orphan = sold(
      { id: 'o', titleId: PSICO, number: 1 },
      { id: 'c-otro', name: 'X', avatarEmoji: null },
    );
    expect(view([orphan]).rows[0]?.customer).toBeNull();
  });
});

describe('copies-list: fecha y orden (R3, R4, BR-GEN-14)', () => {
  it('CA-2: por Vendido (cualquier sentido) Psiconutrición va antes y Bebidas al final, sin fecha', () => {
    for (const dir of ['asc', 'desc'] as const) {
      const rows = view([BEBIDAS_9, PSICO_6], { sort: { key: 'sold', dir } }).rows;
      expect(rows.map((r) => [r.copyId, r.rowDate])).toEqual([
        ['psico-6', '2026-11-02'],
        ['bebidas-9', null],
      ]);
    }
  });

  it('la fecha de venta se muestra en Bogotá (vendido de noche cuenta como ese día)', () => {
    const late = sold({ id: 'n', titleId: PSICO, number: 2 }, MARIA, 98_000, '2026-11-03T03:30:00Z');
    expect(view([late], { sort: { key: 'sold', dir: 'desc' } }).rows[0]?.rowDate).toBe('2026-11-02');
  });

  it('Recibido: mayor primero por defecto; menor primero al invertir', () => {
    const rows = (dir: 'asc' | 'desc') =>
      view([PSICO_6, BEBIDAS_9], { sort: { key: 'received', dir } }).rows.map((r) => r.copyId);
    expect(rows('desc')).toEqual(['bebidas-9', 'psico-6']);
    expect(rows('asc')).toEqual(['psico-6', 'bebidas-9']);
  });

  it('Título: en español sin tildes; misma fecha y título → por número', () => {
    const copies = [
      copy({ id: 'c3', titleId: CORAZON, number: 3 }),
      copy({ id: 'c1', titleId: CORAZON, number: 1 }),
      BEBIDAS_9,
    ];
    expect(view(copies, { sort: { key: 'title', dir: 'asc' } }).rows.map((r) => r.copyId)).toEqual([
      'bebidas-9',
      'c1',
      'c3',
    ]);
    expect(view(copies, { sort: { key: 'title', dir: 'desc' } }).rows.map((r) => r.copyId)).toEqual([
      'c1',
      'c3',
      'bebidas-9',
    ]);
    // Con el mismo criterio, desempate por título y número (ascendentes en ambos sentidos).
    expect(view(copies, { sort: { key: 'received', dir: 'desc' } }).rows.map((r) => r.copyId)).toEqual([
      'bebidas-9',
      'c1',
      'c3',
    ]);
  });

  it('Precio acordado: los no vendidos (sin precio acordado) al final en ambos sentidos', () => {
    const copies = [BEBIDAS_9, PSICO_6, sold({ id: 'caro', titleId: CORAZON, number: 1 }, GLORIA, 120_000)];
    expect(view(copies, { sort: { key: 'agreed_price', dir: 'desc' } }).rows.map((r) => r.copyId)).toEqual([
      'caro',
      'psico-6',
      'bebidas-9',
    ]);
    expect(view(copies, { sort: { key: 'agreed_price', dir: 'asc' } }).rows.map((r) => r.copyId)).toEqual([
      'psico-6',
      'caro',
      'bebidas-9',
    ]);
  });

  it('CA-7: Diferencia "Menor primero" → descuentos más grandes, luego aumentos, al final sin diferencia', () => {
    const copies = [
      BEBIDAS_9,
      sold({ id: 'aumento', titleId: CORAZON, number: 1 }, GLORIA, 105_000),
      sold({ id: 'igual', titleId: CORAZON, number: 2 }, GLORIA, 98_000),
      sold({ id: 'descuento-grande', titleId: PSICO, number: 1 }, MARIA, 80_000),
      PSICO_6,
    ];
    expect(view(copies, { sort: { key: 'price_delta', dir: 'asc' } }).rows.map((r) => r.copyId)).toEqual([
      'descuento-grande',
      'psico-6',
      'aumento',
      'bebidas-9',
      'igual',
    ]);
    expect(
      view(copies, { sort: { key: 'price_delta', dir: 'desc' } })
        .rows.map((r) => r.copyId)
        .slice(0, 3),
    ).toEqual(['aumento', 'psico-6', 'descuento-grande']);
  });

  it('misma diferencia: desempata por título y número', () => {
    const copies = [
      sold({ id: 'p2', titleId: PSICO, number: 2 }, MARIA, 93_000),
      sold({ id: 'b1', titleId: BEBIDAS, number: 1 }, MARIA, 93_000),
      sold({ id: 'p1', titleId: PSICO, number: 1 }, MARIA, 93_000),
    ];
    for (const dir of ['asc', 'desc'] as const) {
      expect(view(copies, { sort: { key: 'price_delta', dir } }).rows.map((r) => r.copyId)).toEqual([
        'b1',
        'p1',
        'p2',
      ]);
    }
  });

  it('empate total de título y número (datos que la base no permite): por id', () => {
    const copies = [
      copy({ id: 'b', titleId: BEBIDAS, number: 1 }),
      copy({ id: 'a', titleId: BEBIDAS, number: 1 }),
    ];
    expect(view(copies).rows.map((r) => r.copyId)).toEqual(['a', 'b']);
  });
});

describe('copies-list: vistas, conteos, filtro y búsqueda', () => {
  /** CA-3: 46 ejemplares (21 en físico, 19 vendidos —4 con precio distinto—, 6 en otros estados) y 15 minibooks. */
  const CA3: CopiesListCopy[] = [
    ...Array.from({ length: 21 }, (_, i) => copy({ id: `fis-${i}`, titleId: BEBIDAS, number: i + 1 })),
    ...Array.from({ length: 19 }, (_, i) =>
      sold(
        { id: `ven-${i}`, titleId: PSICO, number: i + 1 },
        i % 2 ? MARIA : GLORIA,
        i < 4 ? 90_000 : 98_000,
      ),
    ),
    ...(
      ['flagged', 'flagged', 'lost', 'lost', 'returned_to_leader', 'returned_to_leader'] as CopyStatus[]
    ).map((status, i) => copy({ id: `otro-${i}`, titleId: CORAZON, number: i + 1, status })),
    ...Array.from({ length: 15 }, (_, i) =>
      copy({ id: `mini-${i}`, titleId: MINI, number: i + 1, publicPriceSnapshot: null }),
    ),
    copy({ id: 'borrado', titleId: BEBIDAS, number: 99, deletedAt: new Date() }),
  ];

  it('CA-3: conteos 46, 21, 19 y 4 (sin minibooks ni eliminados)', () => {
    const result = view(CA3);
    expect(result.counts).toEqual({ all: 46, inStock: 21, sold: 19, priceChanged: 4 });
    expect(result.rows).toHaveLength(46);
  });

  it('cada vista muestra lo suyo', () => {
    expect(view(CA3, { view: 'in_stock' }).rows.every((r) => r.status === 'in_stock')).toBe(true);
    expect(view(CA3, { view: 'sold' }).rows).toHaveLength(19);
  });

  it('CA-4: "Con descuentos y aumentos" solo trae vendidos con precio distinto', () => {
    const rows = view(CA3, { view: 'price_changed' }).rows;
    expect(rows).toHaveLength(4);
    expect(rows.every((r) => r.status === 'sold' && r.priceDiffers)).toBe(true);
  });

  it('CA-6: filtro {Con novedad, Perdido} en Todos → solo esos estados; los conteos no cambian (R5)', () => {
    const result = view(CA3, { statusFilter: ['flagged', 'lost'] });
    expect(result.rows.map((r) => r.status).sort()).toEqual(['flagged', 'flagged', 'lost', 'lost']);
    expect(result.counts).toEqual({ all: 46, inStock: 21, sold: 19, priceChanged: 4 });
  });

  it('CA-5: "corazon" trae los "Un corazón tranquilo"; "#13" solo el número 13; "gloria" los vendidos a Gloria', () => {
    expect(new Set(view(CA3, { search: 'corazon' }).rows.map((r) => r.titleName))).toEqual(
      new Set(['Un corazón tranquilo']),
    );
    expect(view(CA3, { search: '#13' }).rows.map((r) => r.number)).toEqual([13, 13]);
    expect(view(CA3, { search: '13' }).rows.every((r) => r.number === 13)).toBe(true);
    const gloria = view(CA3, { search: 'gloria' }).rows;
    expect(gloria.length).toBeGreaterThan(0);
    expect(gloria.every((r) => r.status === 'sold' && r.customer?.name === 'Gloria Inés Patiño')).toBe(true);
  });

  it('la búsqueda tampoco cambia los conteos; una búsqueda vacía no filtra', () => {
    expect(view(CA3, { search: 'gloria' }).counts.all).toBe(46);
    expect(view(CA3, { search: '   ' }).rows).toHaveLength(46);
  });

  it('vista + filtro + búsqueda se combinan', () => {
    const rows = view(CA3, { view: 'sold', statusFilter: ['sold'], search: 'maria' }).rows;
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.customer?.id === 'c-maria')).toBe(true);
    expect(view(CA3, { view: 'in_stock', statusFilter: ['sold'] }).rows).toEqual([]);
  });

  it('sin ejemplares: conteos en 0 y lista vacía', () => {
    expect(view([])).toEqual({ counts: { all: 0, inStock: 0, sold: 0, priceChanged: 0 }, rows: [] });
  });
});
