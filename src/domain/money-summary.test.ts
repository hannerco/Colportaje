import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { computeCustomerAccount } from './customer';
import {
  computeMoneySummary,
  percentagesSummingTo100,
  unscheduledCustomersList,
  type SummaryDeposit,
  type SummaryPayment,
} from './money-summary';
import { localDate } from './time';

const delivered = (amount: number): SummaryPayment => ({
  status: 'delivered',
  agreedAmount: null,
  paidAmount: amount,
  method: 'cash',
});
const collected = (amount: number, method: 'cash' | 'transfer'): SummaryPayment => ({
  status: 'collected',
  agreedAmount: null,
  paidAmount: amount,
  method,
});
const scheduled = (amount: number): SummaryPayment => ({
  status: 'scheduled',
  agreedAmount: amount,
  paidAmount: null,
  method: null,
});
const deposit = (status: 'draft' | 'confirmed', cashAmount: number, transferAmount = 0): SummaryDeposit => ({
  status,
  cashAmount,
  transferAmount,
});

describe('percentagesSummingTo100 (R2)', () => {
  it('CA-1: 1.420.000 / 385.000 / 935.000 → 52 / 14 / 34', () => {
    expect(percentagesSummingTo100([1_420_000, 385_000, 935_000])).toEqual([52, 14, 34]);
  });

  it('todo en 0 → todos 0; a igual resto gana el que va antes', () => {
    expect(percentagesSummingTo100([0, 0, 0])).toEqual([0, 0, 0]);
    expect(percentagesSummingTo100([1, 1, 1])).toEqual([34, 33, 33]);
  });

  it('propiedad: enteros ≥ 0 que suman 100 (o todos 0), y cada uno a menos de 1 de su valor exacto', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 10_000_000 }), { minLength: 1, maxLength: 6 }),
        (amounts) => {
          const pcts = percentagesSummingTo100(amounts);
          const total = amounts.reduce((s, a) => s + a, 0);
          // Sin devolver la aserción: fast-check toma su valor de retorno como resultado de la propiedad.
          if (total === 0) {
            expect(pcts.every((p) => p === 0)).toBe(true);
            return;
          }
          expect(pcts.reduce((s, p) => s + p, 0)).toBe(100);
          pcts.forEach((p, i) => {
            expect(Number.isInteger(p) && p >= 0).toBe(true);
            expect(Math.abs(p - (amounts[i]! * 100) / total)).toBeLessThan(1);
          });
        },
      ),
    );
  });
});

describe('computeMoneySummary (HU-DIN-02)', () => {
  it('CA-1: total 2.740.000, 52 / 14 / 34, por entregar 385.000 (280.000 efectivo + 105.000 transferencia)', () => {
    const s = computeMoneySummary(
      [
        delivered(1_000_000),
        delivered(420_000),
        collected(280_000, 'cash'),
        collected(105_000, 'transfer'),
        scheduled(500_000),
        scheduled(435_000),
      ],
      [],
      [],
    );
    expect(s).toMatchObject({
      toDeliver: { total: 385_000, cash: 280_000, transfer: 105_000 },
      delivered: { amount: 1_420_000, pct: 52 },
      collected: { amount: 385_000, pct: 14 },
      toCollect: { amount: 935_000, pct: 34 },
      moneyTotal: 2_740_000,
      deliveredPct: 52,
      scheduledTotal: 935_000,
    });
  });

  it('CA-2: cobrado en un borrador cuenta por entregar; al confirmarse pasa a entregado', () => {
    // El abono en el borrador sigue "collected" (BR-DEP-08); al confirmar pasa a "delivered".
    expect(computeMoneySummary([collected(50_000, 'cash')], [], []).toDeliver.total).toBe(50_000);
    const confirmed = computeMoneySummary([delivered(50_000)], [], []);
    expect(confirmed.toDeliver.total).toBe(0);
    expect(confirmed.delivered.amount).toBe(50_000);
  });

  it('CA-3: un cancelado no cuenta en ningún valor', () => {
    const s = computeMoneySummary(
      [{ status: 'canceled', agreedAmount: 50_000, paidAmount: null, method: null }],
      [],
      [],
    );
    expect(s).toMatchObject({
      toDeliver: { total: 0, cash: 0, transfer: 0 },
      delivered: { amount: 0, pct: 0 },
      collected: { amount: 0, pct: 0 },
      toCollect: { amount: 0, pct: 0 },
      moneyTotal: 0,
    });
  });

  it('CA-4: sin programar 120.000 + 90.000 + 80.000 + 50.000 → 340.000 en 4 clientes (los 0 no cuentan)', () => {
    const s = computeMoneySummary([], [120_000, 0, 90_000, 80_000, 50_000], []);
    expect(s.unscheduledTotal).toBe(340_000);
    expect(s.unscheduledCustomers).toBe(4);
  });

  it('CA-5: debe 20.000 con programados por 40.000 → aporta 40.000 a por cobrar y 0 a sin programar', () => {
    const account = computeCustomerAccount(
      {
        customer: { createdAt: new Date('2026-10-01T15:00:00Z') },
        soldCopies: [{ agreedPrice: 20_000, soldAt: new Date('2026-10-01T15:00:00Z') }],
        payments: [
          {
            status: 'scheduled',
            agreedAmount: 40_000,
            paidAmount: null,
            dueDate: localDate('2026-12-01'),
            paidAt: null,
          },
        ],
      },
      localDate('2026-11-08'),
    );
    const s = computeMoneySummary([scheduled(40_000)], [account.unscheduled], []);
    expect(s.toCollect.amount).toBe(40_000);
    expect(s.unscheduledTotal).toBe(0);
    expect(s.unscheduledCustomers).toBe(0);
  });

  it('CA-6: Abibonos confirmados 380.000 + 420.000 + 310.000 + 20.000 + 310.000 y un borrador → 1.440.000', () => {
    const s = computeMoneySummary(
      [],
      [],
      [
        deposit('confirmed', 300_000, 80_000),
        deposit('confirmed', 420_000),
        deposit('confirmed', 0, 310_000),
        deposit('confirmed', 20_000),
        deposit('confirmed', 310_000),
        deposit('draft', 50_000),
      ],
    );
    expect(s.totalDeliveredToLeader).toBe(1_440_000);
  });

  it('sin abonos ni Abibonos: todo en 0', () => {
    expect(computeMoneySummary([], [], [])).toEqual({
      toDeliver: { total: 0, cash: 0, transfer: 0 },
      delivered: { amount: 0, pct: 0 },
      collected: { amount: 0, pct: 0 },
      toCollect: { amount: 0, pct: 0 },
      moneyTotal: 0,
      deliveredPct: 0,
      scheduledTotal: 0,
      unscheduledTotal: 0,
      unscheduledCustomers: 0,
      totalDeliveredToLeader: 0,
    });
  });
});

describe('unscheduledCustomersList (CA-4)', () => {
  it('solo los que tienen sin programar, por monto descendente; a igual monto, por nombre e id', () => {
    const c = (customerId: string, name: string, unscheduled: number) => ({
      customerId,
      name,
      avatarEmoji: null,
      unscheduled,
    });
    expect(
      unscheduledCustomersList([
        c('c4', 'Dora', 50_000),
        c('c1', 'Ana', 120_000),
        c('c0', 'Saldado', 0),
        c('c3', 'Carla', 80_000),
        c('c2', 'Beto', 90_000),
        c('c6', 'Eva', 80_000),
        c('c5', 'Eva', 80_000),
      ]).map((x) => x.customerId),
    ).toEqual(['c1', 'c2', 'c3', 'c5', 'c6', 'c4']);
  });
});
