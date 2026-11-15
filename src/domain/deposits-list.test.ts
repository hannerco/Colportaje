import { describe, expect, it } from 'vitest';
import {
  buildDepositsListView,
  DEFAULT_DEPOSITS_LIST_PARAMS,
  type DepositsListParams,
  type MoneyDeposit,
} from './deposits-list';
import { localDate } from './time';

let seq = 0;
const confirmed = (
  number: number,
  date: string,
  cash: number,
  transfer: number,
  over: Partial<MoneyDeposit> = {},
): MoneyDeposit => {
  seq += 1;
  return {
    id: `d-${String(seq).padStart(3, '0')}`,
    title: null,
    status: 'confirmed',
    cashAmount: cash,
    transferAmount: transfer,
    depositNumber: number,
    depositDate: localDate(date),
    hasReceipt: true,
    ...over,
  };
};
const draft = (date: string, cash: number, over: Partial<MoneyDeposit> = {}) =>
  confirmed(0, date, cash, 0, { status: 'draft', depositNumber: null, hasReceipt: false, ...over });

const view = (deposits: MoneyDeposit[], params: Partial<DepositsListParams> = {}) =>
  buildDepositsListView(deposits, { ...DEFAULT_DEPOSITS_LIST_PARAMS, ...params });

// CA-1: cinco confirmados que suman 1.440.000 y un borrador de 50.000 sin recibo.
const campaign = () => [
  confirmed(1, '2026-09-20', 200_000, 80_000),
  confirmed(2, '2026-10-01', 150_000, 100_000, { title: 'Donación campaña' }),
  confirmed(3, '2026-10-10', 300_000, 120_000),
  confirmed(4, '2026-10-25', 180_000, 0),
  confirmed(5, '2026-11-01', 210_000, 100_000),
  draft('2026-11-05', 50_000),
];

describe('buildDepositsListView (HU-DIN-06)', () => {
  it('CA-1 / R1 / R2 / R3: count 6, total abonado 1.440.000 (solo confirmados), borrador sin recibo', () => {
    const v = view(campaign());
    expect(v.count).toBe(6);
    expect(v.totalDeliveredToLeader).toBe(1_440_000);
    const pending = v.rows.find((r) => r.status === 'draft')!;
    expect(pending).toMatchObject({
      title: 'Abibono (6)',
      total: 50_000,
      cash: 50_000,
      transfer: 0,
      hasReceipt: false,
    });
    // Por defecto: fecha, más reciente primero.
    expect(v.rows.map((r) => r.depositDate)).toEqual([
      '2026-11-05',
      '2026-11-01',
      '2026-10-25',
      '2026-10-10',
      '2026-10-01',
      '2026-09-20',
    ]);
  });

  it('CA-2 / R4: "donacion" encuentra "Donación campaña"; la búsqueda no cambia el conteo ni el total', () => {
    const v = view(campaign(), { search: '  DONACION ' });
    expect(v.rows.map((r) => r.title)).toEqual(['Donación campaña']);
    expect([v.count, v.totalDeliveredToLeader]).toEqual([6, 1_440_000]);
    // También busca en el nombre automático.
    expect(view(campaign(), { search: 'abibono (3)' }).rows.map((r) => r.total)).toEqual([420_000]);
  });

  it('CA-3: por total descendente, el de 420.000 va primero; ascendente, el de 50.000', () => {
    expect(view(campaign(), { sort: { key: 'total', dir: 'desc' } }).rows[0]!.total).toBe(420_000);
    expect(view(campaign(), { sort: { key: 'total', dir: 'asc' } }).rows[0]!.total).toBe(50_000);
  });

  it('CA-4 / R5: por nombre, los números como números: (1), (2), (10); descendente al revés', () => {
    const deposits = [
      confirmed(2, '2026-10-01', 1, 0),
      confirmed(10, '2026-10-02', 1, 0),
      confirmed(1, '2026-10-03', 1, 0),
    ];
    expect(view(deposits, { sort: { key: 'name', dir: 'asc' } }).rows.map((r) => r.title)).toEqual([
      'Abibono (1)',
      'Abibono (2)',
      'Abibono (10)',
    ]);
    expect(view(deposits, { sort: { key: 'name', dir: 'desc' } }).rows.map((r) => r.title)).toEqual([
      'Abibono (10)',
      'Abibono (2)',
      'Abibono (1)',
    ]);
  });

  it('R4: la misma fecha desempata por nombre (ascendente en ambos sentidos) y luego por id', () => {
    const deposits = [
      confirmed(2, '2026-10-01', 1, 0, { title: 'Beta' }),
      confirmed(1, '2026-10-01', 1, 0, { title: 'Alfa' }),
      confirmed(3, '2026-09-01', 1, 0),
    ];
    expect(view(deposits).rows.map((r) => r.title)).toEqual(['Alfa', 'Beta', 'Abibono (3)']);
    expect(view(deposits, { sort: { key: 'date', dir: 'asc' } }).rows.map((r) => r.title)).toEqual([
      'Abibono (3)',
      'Alfa',
      'Beta',
    ]);
    // Dos borradores sin título muestran el mismo nombre sugerido: desempate por id.
    const twins = [draft('2026-11-05', 1, { id: 'z' }), draft('2026-11-05', 1, { id: 'a' })];
    expect(view(twins).rows.map((r) => [r.depositId, r.title])).toEqual([
      ['a', 'Abibono (1)'],
      ['z', 'Abibono (1)'],
    ]);
  });

  it('sin Abibonos: count 0, total 0', () => {
    expect(view([])).toEqual({ count: 0, totalDeliveredToLeader: 0, rows: [] });
  });
});
