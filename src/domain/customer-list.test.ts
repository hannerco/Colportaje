import { describe, expect, it } from 'vitest';
import type { AccountPayment } from './customer';
import {
  buildCustomerListView,
  DEFAULT_CUSTOMER_LIST_PARAMS,
  DEFAULT_SORT_DIR,
  isDefaultCustomerListView,
  type CustomerListAccountData,
  type CustomerListCustomer,
  type CustomerListParams,
} from './customer-list';
import { localDate, type LocalDate } from './time';

const TODAY = localDate('2026-11-08');

const scheduled = (agreedAmount: number, dueDate: string): AccountPayment => ({
  status: 'scheduled',
  agreedAmount,
  paidAmount: null,
  dueDate: localDate(dueDate),
  paidAt: null,
});
const collected = (paidAmount: number, paidAt: string): AccountPayment => ({
  status: 'collected',
  agreedAmount: null,
  paidAmount,
  dueDate: null,
  paidAt: localDate(paidAt),
});

let seq = 0;
type Spec = {
  name?: string;
  archived?: boolean;
  /** Precios de los ejemplares vendidos (sin libros = prospecto). */
  books?: number[];
  titles?: string[];
  payments?: AccountPayment[];
  createdAt?: string;
  updatedAt?: string;
};

/** Construye clientes y sus cuentas a partir de especificaciones cortas. */
const world = (specs: Spec[]) => {
  const customers: CustomerListCustomer[] = [];
  const accounts: CustomerListAccountData[] = [];
  for (const spec of specs) {
    seq += 1;
    const id = `c-${String(seq).padStart(3, '0')}`;
    customers.push({
      id,
      name: spec.name ?? `Cliente ${seq}`,
      avatarEmoji: null,
      phone: null,
      createdAt: new Date(spec.createdAt ?? '2026-10-01T15:00:00Z'),
      updatedAt: new Date(spec.updatedAt ?? '2026-10-01T15:00:00Z'),
      archived: spec.archived ?? false,
    });
    accounts.push({
      customerId: id,
      soldCopies: (spec.books ?? []).map((price, i) => ({
        copyId: `${id}-k${i}`,
        agreedPrice: price,
        soldAt: new Date(Date.UTC(2026, 9, 1 + i, 15)),
        titleName: spec.titles?.[i] ?? 'Esperanza para hoy',
      })),
      payments: spec.payments ?? [],
    });
  }
  return { customers, accounts };
};

const view = (
  w: ReturnType<typeof world>,
  params: Partial<CustomerListParams> = {},
  today: LocalDate = TODAY,
) => buildCustomerListView(w.customers, w.accounts, { ...DEFAULT_CUSTOMER_LIST_PARAMS, ...params }, today);

const current: Spec = { books: [100_000], payments: [scheduled(50_000, '2026-12-01')] };
const overdue: Spec = { books: [100_000], payments: [scheduled(50_000, '2026-11-01')] };
const settled: Spec = { books: [100_000], payments: [collected(100_000, '2026-10-05')] };

/** CA-1: 6 Pagando, 3 Vencido, 1 Saldado, 3 archivados y 2 prospectos. */
const ca1World = () =>
  world([
    ...Array.from({ length: 6 }, () => current),
    ...Array.from({ length: 3 }, () => overdue),
    settled,
    { ...current, archived: true },
    { ...settled, archived: true },
    { archived: true }, // archivado sin venta
    { name: 'Prospecto Uno' },
    { name: 'Prospecto Dos', payments: [collected(20_000, '2026-10-02')] },
  ]);

describe('buildCustomerListView (HU-CLI-04)', () => {
  it('CA-1: conteos por defecto, sin prospectos y vista por defecto', () => {
    const v = view(ca1World());
    expect(v.counts).toEqual({ all: 10, debtors: 9, settled: 1, archived: 3 });
    expect(v.statusCounts).toEqual({ current: 6, overdue: 3, settled: 1 });
    expect(v.rows).toHaveLength(10);
    expect(v.rows.some((r) => r.isProspect)).toBe(false);
    expect(v.isDefaultView).toBe(true);
  });

  it('CA-2: "Incluir prospectos" los muestra solo en Todos y sube el conteo de Todos', () => {
    const w = ca1World();
    const all = view(w, { includeProspects: true });
    expect(all.counts).toEqual({ all: 12, debtors: 9, settled: 1, archived: 3 });
    const prospects = all.rows.filter((r) => r.isProspect);
    expect(prospects.map((p) => [p.name, p.books, p.standing])).toEqual(
      expect.arrayContaining([
        ['Prospecto Uno', null, null],
        ['Prospecto Dos', null, null],
      ]),
    );
    expect(all.isDefaultView).toBe(false);
    const debtors = view(w, { tab: 'debtors', includeProspects: true });
    expect(debtors.rows).toHaveLength(9);
    expect(debtors.rows.some((r) => r.isProspect)).toBe(false);
  });

  it('R1: Archivados trae todos los archivados (con o sin venta); Saldados y Deudores no los traen', () => {
    const w = ca1World();
    expect(view(w, { tab: 'archived' }).rows.map((r) => r.archived)).toEqual([true, true, true]);
    expect(view(w, { tab: 'settled' }).rows).toHaveLength(1);
    expect(view(w, { tab: 'settled' }).rows.every((r) => !r.archived && r.standing === 'settled')).toBe(true);
  });

  it('CA-3: Libro(s) = título del vendido más reciente y +N de los demás', () => {
    const w = world([
      {
        name: 'María Camila Henao',
        books: [95_000, 85_000, 120_000],
        titles: ['El Deseado de todas las gentes', 'Esperanza para hoy', 'Las bellas historias de la Biblia'],
      },
    ]);
    expect(view(w).rows[0]!.books).toEqual({ title: 'Las bellas historias de la Biblia', extraCount: 2 });
  });

  it('R5: con la misma fecha de venta el desempate es determinista (id)', () => {
    const w = world([{ books: [1, 1], titles: ['A', 'B'] }]);
    const same = new Date('2026-10-01T15:00:00Z');
    const copies = w.accounts[0]!.soldCopies.map((c) => ({ ...c, soldAt: same }));
    const v = buildCustomerListView(
      w.customers,
      [{ ...w.accounts[0]!, soldCopies: [...copies].reverse() }],
      DEFAULT_CUSTOMER_LIST_PARAMS,
      TODAY,
    );
    expect(v.rows[0]!.books).toEqual({ title: 'B', extraCount: 1 });
  });

  it('CA-4: "Mayor deuda" por saldo pendiente; prospectos (sin saldo) al final en ambos sentidos', () => {
    const w = world([
      { name: 'Doscientos sesenta', books: [260_000] },
      { name: 'Cero', books: [100_000], payments: [collected(100_000, '2026-10-05')] },
      { name: 'Trescientos ochenta', books: [380_000] },
      { name: 'Prospecto' },
    ]);
    const desc = view(w, { includeProspects: true, sort: { key: 'balance', dir: 'desc' } });
    expect(desc.rows.map((r) => r.name)).toEqual([
      'Trescientos ochenta',
      'Doscientos sesenta',
      'Cero',
      'Prospecto',
    ]);
    const asc = view(w, { includeProspects: true, sort: { key: 'balance', dir: 'asc' } });
    expect(asc.rows.map((r) => r.name)).toEqual([
      'Cero',
      'Doscientos sesenta',
      'Trescientos ochenta',
      'Prospecto',
    ]);
  });

  it('CA-5: "Próximo abono" incluye vencidos y deja al final a quien no tiene abonos por cobrar', () => {
    const w = world([
      { name: 'Sin abonos', books: [100_000] },
      { name: 'Diciembre', ...current },
      { name: 'Vencido', ...overdue },
    ]);
    expect(view(w, { sort: { key: 'next_due', dir: 'asc' } }).rows.map((r) => r.name)).toEqual([
      'Vencido',
      'Diciembre',
      'Sin abonos',
    ]);
    expect(view(w, { sort: { key: 'next_due', dir: 'desc' } }).rows.map((r) => r.name)).toEqual([
      'Diciembre',
      'Vencido',
      'Sin abonos',
    ]);
  });

  it('BR-GEN-14: varios vacíos van al final ordenados por nombre, en ambos sentidos', () => {
    const w = world([
      { name: 'Zoila', books: [1] },
      { name: 'Ana', books: [1] },
      { name: 'Con abono', ...current },
    ]);
    for (const dir of ['asc', 'desc'] as const)
      expect(view(w, { sort: { key: 'next_due', dir } }).rows.map((r) => r.name)).toEqual([
        'Con abono',
        'Ana',
        'Zoila',
      ]);
  });

  it('CA-6: el filtro {Vencido, Saldado} se combina con la pestaña y no cambia los conteos', () => {
    const w = ca1World();
    const v = view(w, { statusFilter: ['overdue', 'settled'], includeProspects: true });
    expect(v.rows).toHaveLength(4);
    expect(v.rows.every((r) => r.standing === 'overdue' || r.standing === 'settled')).toBe(true);
    expect(v.counts).toEqual({ all: 12, debtors: 9, settled: 1, archived: 3 });
    expect(v.statusCounts).toEqual({ current: 6, overdue: 3, settled: 1 });
    // En Archivados el filtro también aplica (al estado de cada archivado).
    expect(view(w, { tab: 'archived', statusFilter: ['settled'] }).rows).toHaveLength(1);
  });

  it('CA-7: último abono = el cobrado más reciente', () => {
    const w = world([
      { books: [180_000], payments: [collected(40_000, '2026-10-01'), collected(30_000, '2026-10-22')] },
    ]);
    expect(view(w).rows[0]!.lastPaymentAt).toBe('2026-10-22');
  });

  it('R4: Más recientes, Última modificación y Nombre (español, sin tildes); desempate por nombre', () => {
    const w = world([
      { name: 'Óscar', books: [1], createdAt: '2026-10-02T15:00:00Z', updatedAt: '2026-11-01T15:00:00Z' },
      { name: 'ana', books: [1], createdAt: '2026-10-03T15:00:00Z', updatedAt: '2026-10-05T15:00:00Z' },
      { name: 'Bernardo', books: [1], createdAt: '2026-10-01T15:00:00Z', updatedAt: '2026-10-20T15:00:00Z' },
      { name: 'Álvaro', books: [1], createdAt: '2026-10-03T15:00:00Z', updatedAt: '2026-10-05T15:00:00Z' },
    ]);
    expect(view(w).rows.map((r) => r.name)).toEqual(['Álvaro', 'ana', 'Óscar', 'Bernardo']);
    expect(view(w, { sort: { key: 'modified', dir: 'desc' } }).rows.map((r) => r.name)).toEqual([
      'Óscar',
      'Bernardo',
      'Álvaro',
      'ana',
    ]);
    expect(view(w, { sort: { key: 'name', dir: 'asc' } }).rows.map((r) => r.name)).toEqual([
      'Álvaro',
      'ana',
      'Bernardo',
      'Óscar',
    ]);
    expect(view(w, { sort: { key: 'name', dir: 'desc' } }).rows.map((r) => r.name)).toEqual([
      'Óscar',
      'Bernardo',
      'ana',
      'Álvaro',
    ]);
    expect(view(w, { sort: { key: 'recent', dir: 'asc' } }).rows.map((r) => r.name)).toEqual([
      'Bernardo',
      'Óscar',
      'Álvaro',
      'ana',
    ]);
  });

  it('R4: mismo nombre → desempate por id', () => {
    const w = world([
      { name: 'Natalia', books: [1] },
      { name: 'Natalia', books: [1] },
    ]);
    const ids = w.customers.map((c) => c.id);
    expect(view(w, { sort: { key: 'name', dir: 'asc' } }).rows.map((r) => r.id)).toEqual(ids);
    expect(view(w, { sort: { key: 'name', dir: 'desc' } }).rows.map((r) => r.id)).toEqual(ids);
  });

  it('R4: sentidos por defecto', () => {
    expect(DEFAULT_SORT_DIR).toEqual({
      recent: 'desc',
      modified: 'desc',
      name: 'asc',
      balance: 'desc',
      next_due: 'asc',
    });
  });

  it('R6: isDefaultView es falso si cambia el orden, su sentido, el filtro o el interruptor (no la pestaña)', () => {
    const d = DEFAULT_CUSTOMER_LIST_PARAMS;
    expect(isDefaultCustomerListView({ ...d, tab: 'archived' })).toBe(true);
    expect(isDefaultCustomerListView({ ...d, sort: { key: 'name', dir: 'desc' } })).toBe(false);
    expect(isDefaultCustomerListView({ ...d, sort: { key: 'recent', dir: 'asc' } })).toBe(false);
    expect(isDefaultCustomerListView({ ...d, statusFilter: ['current'] })).toBe(false);
    expect(isDefaultCustomerListView({ ...d, includeProspects: true })).toBe(false);
  });

  it('saldo a favor: balance negativo, credit > 0 y Saldado', () => {
    const w = world([{ books: [100_000], payments: [collected(120_000, '2026-10-05')] }]);
    expect(view(w).rows[0]).toMatchObject({ balance: -20_000, credit: 20_000, standing: 'settled' });
  });

  it('un cliente sin datos de cuenta es un prospecto; lista vacía → filas vacías y conteos en 0', () => {
    const w = world([{ name: 'Solo nombre' }]);
    const v = buildCustomerListView(
      w.customers,
      [],
      { ...DEFAULT_CUSTOMER_LIST_PARAMS, includeProspects: true },
      TODAY,
    );
    expect(v.rows[0]).toMatchObject({ isProspect: true, books: null, standing: null, balance: 0 });
    expect(view(world([]))).toEqual({
      counts: { all: 0, debtors: 0, settled: 0, archived: 0 },
      statusCounts: { current: 0, overdue: 0, settled: 0 },
      isDefaultView: true,
      rows: [],
    });
  });

  it('el vencimiento depende de today: el mismo abono pasa de Pagando a Vencido', () => {
    const w = world([current]);
    expect(view(w, {}, localDate('2026-12-01')).rows[0]!.standing).toBe('current');
    expect(view(w, {}, localDate('2026-12-02')).rows[0]!.standing).toBe('overdue');
  });
});
