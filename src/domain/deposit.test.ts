import { describe, expect, it } from 'vitest';
import {
  autoAmounts,
  confirmBlockers,
  depositContributions,
  depositDisplayTitle,
  depositSummary,
  nextDepositNumber,
  type DepositContribution,
  type LeaderDeposit,
} from './deposit';
import type { PayMethod } from './payment';
import { localDate } from './time';

const contribution = (id: string, amount: number, method: PayMethod): DepositContribution => ({
  source: 'payment',
  id,
  amount,
  method,
});

const deposit = (overrides: Partial<LeaderDeposit> = {}): LeaderDeposit => ({
  id: 'd1',
  title: null,
  depositNumber: null,
  depositDate: localDate('2026-11-08'),
  cashAmount: 0,
  transferAmount: 0,
  note: null,
  status: 'draft',
  confirmedAt: null,
  ...overrides,
});

/** CA-1: 40.000 (efectivo), 60.000 (transferencia), 85.000 y 105.000 (efectivo), 45.000 (transferencia). */
const CA1 = depositContributions([
  { id: 'a', paidAmount: 40_000, method: 'cash' },
  { id: 'b', paidAmount: 60_000, method: 'transfer' },
  { id: 'c', paidAmount: 85_000, method: 'cash' },
  { id: 'd', paidAmount: 105_000, method: 'cash' },
  { id: 'e', paidAmount: 45_000, method: 'transfer' },
]);

describe('deposit: cuadre (BR-DEP-04/05)', () => {
  it('depositContributions: un aporte por abono vinculado, con lo realmente cobrado', () => {
    expect(CA1[0]).toEqual({ source: 'payment', id: 'a', amount: 40_000, method: 'cash' });
    expect(depositContributions([{ id: 'x', paidAmount: null, method: null }])).toEqual([
      { source: 'payment', id: 'x', amount: 0, method: 'cash' },
    ]);
  });

  it('CA-1: autoAmounts = efectivo 230.000 y transferencia 105.000; esperado 335.000', () => {
    const auto = autoAmounts(CA1);
    expect(auto).toEqual({ cash: 230_000, transfer: 105_000 });
    expect(depositSummary(deposit({ cashAmount: auto.cash, transferAmount: auto.transfer }), CA1)).toEqual({
      total: 335_000,
      expected: 335_000,
      difference: 0,
    });
  });

  it('CA-2: esperado 341.000 y entregado 236.000 + 100.000 → total 336.000, diferencia −5.000; sin nota pide nota', () => {
    const contributions = [contribution('a', 341_000, 'cash')];
    const d = deposit({ cashAmount: 236_000, transferAmount: 100_000 });
    expect(depositSummary(d, contributions)).toEqual({
      total: 336_000,
      expected: 341_000,
      difference: -5_000,
    });
    expect(confirmBlockers(d, contributions, 1)).toEqual(['NOTE_REQUIRED']);
    expect(confirmBlockers({ ...d, note: '  ' }, contributions, 1)).toEqual(['NOTE_REQUIRED']);
    expect(confirmBlockers({ ...d, note: 'Me faltaron $5.000' }, contributions, 1)).toEqual([]);
  });

  it('diferencia positiva (sobrante) también pide nota', () => {
    const d = deposit({ cashAmount: 50_000 });
    expect(depositSummary(d, [contribution('a', 40_000, 'cash')]).difference).toBe(10_000);
    expect(confirmBlockers(d, [contribution('a', 40_000, 'cash')], 1)).toEqual(['NOTE_REQUIRED']);
  });

  it('BR-DEP-07: sin abonos (donación) el esperado es 0 y se exige nota', () => {
    const d = deposit({ cashAmount: 20_000 });
    expect(depositSummary(d, [])).toEqual({ total: 20_000, expected: 0, difference: 20_000 });
    expect(confirmBlockers(d, [], 1)).toEqual(['NOTE_REQUIRED']);
    expect(confirmBlockers({ ...d, note: 'Donación' }, [], 1)).toEqual([]);
  });
});

describe('deposit: confirmBlockers (BR-DEP-09, BR-PHO-03)', () => {
  it('NO_RECEIPT sin foto de recibo; TOTAL_ZERO con total 0; pueden juntarse', () => {
    expect(confirmBlockers(deposit(), [], 0)).toEqual(['NO_RECEIPT', 'TOTAL_ZERO']);
    const ok = deposit({ cashAmount: 40_000 });
    expect(confirmBlockers(ok, [contribution('a', 40_000, 'cash')], 0)).toEqual(['NO_RECEIPT']);
    expect(confirmBlockers(ok, [contribution('a', 40_000, 'cash')], 2)).toEqual([]);
  });

  it('total 0 con abonos vinculados: total en 0 y diferencia sin nota', () => {
    expect(confirmBlockers(deposit(), [contribution('a', 40_000, 'cash')], 1)).toEqual([
      'TOTAL_ZERO',
      'NOTE_REQUIRED',
    ]);
  });
});

describe('deposit: número y nombre (BR-DEP-02, R7)', () => {
  it('CA-3: con confirmados 1 y 2, dos borradores sin título muestran ambos «Abibono (3)»', () => {
    const confirmed = [
      deposit({ depositNumber: 1, status: 'confirmed' }),
      deposit({ depositNumber: 2, status: 'confirmed' }),
    ];
    const drafts = [deposit({ id: 'b1' }), deposit({ id: 'b2' })];
    const next = nextDepositNumber([...confirmed, ...drafts].map((d) => d.depositNumber));
    expect(next).toBe(3);
    expect(drafts.map((d) => depositDisplayTitle(d, next))).toEqual(['Abibono (3)', 'Abibono (3)']);
    expect(confirmed.map((d) => depositDisplayTitle(d, next))).toEqual(['Abibono (1)', 'Abibono (2)']);
  });

  it('CA-3b: con 1, 2 y 3 y el 2 renombrado, el siguiente es 4 y el 2 conserva su número', () => {
    const renamed = deposit({ depositNumber: 2, title: 'Entrega de octubre', status: 'confirmed' });
    expect(nextDepositNumber([1, renamed.depositNumber, 3])).toBe(4);
    expect(depositDisplayTitle(renamed, 4)).toBe('Entrega de octubre');
    expect(renamed.depositNumber).toBe(2);
  });

  it('sin ningún número asignado el primero es 1; el orden de la lista no importa', () => {
    expect(nextDepositNumber([])).toBe(1);
    expect(nextDepositNumber([null, null])).toBe(1);
    expect(nextDepositNumber([5, 2, null, 9, 3])).toBe(10);
  });

  it('un reabierto (borrador con número) conserva su número; un título en blanco cuenta como automático', () => {
    expect(depositDisplayTitle(deposit({ depositNumber: 7 }), 10)).toBe('Abibono (7)');
    expect(depositDisplayTitle(deposit({ title: '   ' }), 10)).toBe('Abibono (10)');
    expect(depositDisplayTitle(deposit({ title: ' Entrega ' }), 10)).toBe('Entrega');
  });
});
