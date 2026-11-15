import { describe, expect, it } from 'vitest';
import type { Payment } from './payment';
import {
  buildPaymentsListView,
  DEFAULT_PAYMENTS_LIST_PARAMS,
  defaultPaymentsSort,
  type ListPayment,
  type PaymentsListCustomer,
  type PaymentsListParams,
} from './payments-list';
import { localDate } from './time';

const TODAY = localDate('2026-11-05');
let seq = 0;

const customers: PaymentsListCustomer[] = [
  { id: 'ana', name: 'Ana', avatarEmoji: null, archived: false },
  { id: 'beto', name: 'Beto', avatarEmoji: '🌻', archived: false },
  { id: 'archivada', name: 'Óscar', avatarEmoji: null, archived: true },
];

const base = (over: Partial<ListPayment>): ListPayment => {
  seq += 1;
  return {
    id: `p-${String(seq).padStart(3, '0')}`,
    customerId: 'ana',
    kind: 'scheduled',
    status: 'scheduled',
    originalDueDate: null,
    dueDate: null,
    paidAt: null,
    agreedAmount: null,
    paidAmount: null,
    method: null,
    canceledAt: null,
    cancelReason: null,
    createdAt: new Date('2026-10-01T15:00:00Z'),
    depositId: null,
    ...over,
  };
};
const scheduled = (due: string, over: Partial<ListPayment> = {}) =>
  base({ dueDate: localDate(due), originalDueDate: localDate(due), agreedAmount: 60_000, ...over });
const collected = (paidAt: string, method: Payment['method'], over: Partial<ListPayment> = {}) =>
  base({
    kind: 'extra',
    status: 'collected',
    paidAt: localDate(paidAt),
    paidAmount: 30_000,
    method,
    ...over,
  });
const delivered = (paidAt: string, method: Payment['method'], over: Partial<ListPayment> = {}) =>
  collected(paidAt, method, { status: 'delivered', depositId: 'd-conf', ...over });

const view = (payments: ListPayment[], params: Partial<PaymentsListParams> = {}) =>
  buildPaymentsListView(payments, customers, { ...DEFAULT_PAYMENTS_LIST_PARAMS, ...params }, TODAY);

describe('buildPaymentsListView (HU-DIN-03)', () => {
  it('CA-1 / R1: 23 por cobrar, 6 cobrados, 34 entregados y 1 cancelado → 63 / 23 / 6 / 34 / 1', () => {
    const payments = [
      ...Array.from({ length: 23 }, () => scheduled('2026-11-20')),
      ...Array.from({ length: 6 }, () => collected('2026-10-10', 'cash')),
      ...Array.from({ length: 34 }, () => delivered('2026-10-01', 'transfer')),
      scheduled('2026-11-30', { status: 'canceled', canceledAt: new Date(), cancelReason: 'manual' }),
      // De un cliente descartado (no está en la lista de clientes): no cuenta.
      collected('2026-10-10', 'cash', { customerId: 'descartado' }),
    ];
    const v = view(payments);
    expect(v.counts).toEqual({ all: 63, toCollect: 23, toDeliver: 6, delivered: 34, canceled: 1 });
    expect(v.rows).toHaveLength(63);
    expect(view(payments, { view: 'canceled' }).rows).toHaveLength(1);
  });

  it('CA-2: Por cobrar de la más antigua a la más nueva, vencidos con sus días; el chip deja solo los vencidos', () => {
    const payments = [
      scheduled('2026-11-07'),
      scheduled('2026-10-30'),
      scheduled('2026-11-02'),
      scheduled('2026-10-24'),
    ];
    const v = view(payments, { view: 'to_collect', sort: defaultPaymentsSort('to_collect') });
    expect(v.rows.map((r) => [r.agreedDate, r.isOverdue, r.overdueDays, r.canCollect])).toEqual([
      ['2026-10-24', true, 12, true],
      ['2026-10-30', true, 6, true],
      ['2026-11-02', true, 3, true],
      ['2026-11-07', false, 0, true],
    ]);
    const overdue = view(payments, {
      view: 'to_collect',
      overdueOnly: true,
      sort: defaultPaymentsSort('to_collect'),
    });
    expect(overdue.rows.map((r) => r.agreedDate)).toEqual(['2026-10-24', '2026-10-30', '2026-11-02']);
    expect(overdue.counts.toCollect).toBe(4);
    // El chip no aplica fuera de Por cobrar.
    expect(view(payments, { overdueOnly: true }).rows).toHaveLength(4);
  });

  it('CA-3 / R4: la cuota inicial muestra como acordado su valor y fecha reales', () => {
    const down = base({
      kind: 'down_payment',
      status: 'collected',
      dueDate: localDate('2026-10-03'),
      originalDueDate: localDate('2026-10-03'),
      paidAt: localDate('2026-10-03'),
      paidAmount: 80_000,
      method: 'transfer',
    });
    expect(view([down]).rows[0]).toMatchObject({
      agreedAmount: 80_000,
      agreedDate: '2026-10-03',
      paidAmount: 80_000,
      paidAt: '2026-10-03',
      canCollect: false,
    });
  });

  it('CA-4 / R2 / R3: Todos con Efectivo deja solo cobrados y entregados en efectivo; los conteos no cambian', () => {
    const payments = [
      scheduled('2026-11-20'),
      collected('2026-10-10', 'cash'),
      collected('2026-10-11', 'transfer'),
      delivered('2026-10-01', 'cash'),
      delivered('2026-10-02', 'transfer'),
    ];
    const v = view(payments, { method: 'cash' });
    expect(v.rows.map((r) => [r.status, r.method])).toEqual([
      ['collected', 'cash'],
      ['delivered', 'cash'],
    ]);
    expect(v.counts).toEqual(view(payments).counts);
    // En Por cobrar el método se ignora.
    expect(view(payments, { view: 'to_collect', method: 'cash' }).rows).toHaveLength(1);
  });

  it('CA-5: un cobrado de un cliente archivado aparece en Por entregar marcado; un borrador se marca', () => {
    const payments = [
      collected('2026-10-10', 'cash', { customerId: 'archivada' }),
      collected('2026-10-11', 'cash', { depositId: 'd-borrador' }),
      scheduled('2026-11-20', { customerId: 'archivada' }),
    ];
    const v = view(payments, { view: 'to_deliver' });
    expect(v.rows.map((r) => [r.customer.archived, r.inDraftDeposit])).toEqual([
      [false, true],
      [true, false],
    ]);
    // Un por cobrar de un archivado no tiene "Cobrar" (sus funciones lo rechazan).
    expect(view(payments, { view: 'to_collect' }).rows[0]!.canCollect).toBe(false);
  });

  it('CA-6 / R5: por fecha real ascendente, los por cobrar (sin fecha real) quedan al final; también descendente', () => {
    const payments = [
      scheduled('2026-11-20', { customerId: 'beto' }),
      scheduled('2026-11-21'),
      collected('2026-10-12', 'cash'),
      collected('2026-10-10', 'cash'),
    ];
    const asc = view(payments, { sort: { key: 'paid_date', dir: 'asc' } });
    expect(asc.rows.map((r) => r.paidAt)).toEqual(['2026-10-10', '2026-10-12', null, null]);
    // Los vacíos entre sí: por nombre del cliente (Ana antes que Beto).
    expect(asc.rows.slice(2).map((r) => r.customer.name)).toEqual(['Ana', 'Beto']);
    const desc = view(payments, { sort: { key: 'paid_date', dir: 'desc' } });
    expect(desc.rows.map((r) => r.paidAt)).toEqual(['2026-10-12', '2026-10-10', null, null]);
  });

  it('órdenes por valores y por cliente; desempate por nombre del cliente y luego id', () => {
    const payments = [
      collected('2026-10-10', 'cash', { customerId: 'beto', paidAmount: 10_000 }),
      scheduled('2026-11-20', { customerId: 'ana', agreedAmount: 90_000 }),
      collected('2026-10-10', 'cash', { customerId: 'ana', paidAmount: 50_000 }),
    ];
    expect(
      view(payments, { sort: { key: 'agreed_amount', dir: 'desc' } }).rows.map((r) => r.agreedAmount),
    ).toEqual([90_000, 50_000, 10_000]);
    expect(
      view(payments, { sort: { key: 'paid_amount', dir: 'asc' } }).rows.map((r) => r.paidAmount),
    ).toEqual([10_000, 50_000, null]);
    expect(
      view(payments, { sort: { key: 'customer', dir: 'desc' } }).rows.map((r) => r.customer.name),
    ).toEqual(['Beto', 'Ana', 'Ana']);
    // Misma fecha real: por nombre (Ana antes que Beto).
    const same = view(payments, { sort: { key: 'paid_date', dir: 'asc' } });
    expect(same.rows.map((r) => r.customer.name)).toEqual(['Ana', 'Beto', 'Ana']);
    // Mismo cliente y fecha: por id.
    const twins = [
      collected('2026-10-10', 'cash', { id: 'z' }),
      collected('2026-10-10', 'cash', { id: 'a' }),
    ];
    expect(view(twins, { sort: { key: 'paid_date', dir: 'asc' } }).rows.map((r) => r.paymentId)).toEqual([
      'a',
      'z',
    ]);
  });

  it('R7: la búsqueda encuentra por nombre del cliente sin tildes ni mayúsculas, y no cambia los conteos', () => {
    const payments = [
      collected('2026-10-10', 'cash', { customerId: 'archivada' }),
      collected('2026-10-10', 'cash'),
    ];
    const v = view(payments, { search: 'OSCAR' });
    expect(v.rows.map((r) => r.customer.name)).toEqual(['Óscar']);
    expect(v.counts.all).toBe(2);
  });

  it('lista vacía: conteos en 0; orden por defecto de cada vista', () => {
    expect(view([])).toEqual({
      counts: { all: 0, toCollect: 0, toDeliver: 0, delivered: 0, canceled: 0 },
      rows: [],
    });
    expect(defaultPaymentsSort('all')).toEqual({ key: 'agreed_date', dir: 'desc' });
    expect(defaultPaymentsSort('to_collect')).toEqual({ key: 'agreed_date', dir: 'asc' });
  });
});
