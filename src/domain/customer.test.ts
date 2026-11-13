import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { computeCustomerAccount, type AccountPayment, type CustomerAccountInput } from './customer';
import { localDate, type LocalDate } from './time';

const TODAY = localDate('2026-11-08');
const YESTERDAY = localDate('2026-11-07');

const scheduled = (agreedAmount: number, dueDate: LocalDate): AccountPayment => ({
  status: 'scheduled',
  agreedAmount,
  paidAmount: null,
  dueDate,
  paidAt: null,
});

const collected = (paidAmount: number, paidAt: LocalDate): AccountPayment => ({
  status: 'collected',
  agreedAmount: paidAmount,
  paidAmount,
  dueDate: null,
  paidAt,
});

const sold = (agreedPrice: number, soldAt = '2026-10-03T15:00:00Z') => ({
  agreedPrice,
  soldAt: new Date(soldAt),
});

const input = (overrides: Partial<CustomerAccountInput> = {}): CustomerAccountInput => ({
  customer: { createdAt: new Date('2026-09-24T14:00:00Z') },
  soldCopies: [],
  payments: [],
  ...overrides,
});

describe('computeCustomerAccount (HU-CLI-01, BR-CUS-04)', () => {
  it('CA-1: libro de 180.000 y cuota inicial cobrada de 40.000', () => {
    const account = computeCustomerAccount(
      input({ soldCopies: [sold(180_000)], payments: [collected(40_000, localDate('2026-10-03'))] }),
      TODAY,
    );
    expect(account).toMatchObject({
      debt: 180_000,
      paidTotal: 40_000,
      balance: 140_000,
      paidPct: 22,
      standing: 'current',
      isProspect: false,
    });
  });

  it('CA-2: con 4 abonos programados de 35.000, scheduledTotal 140.000, unscheduled 0, excess 0', () => {
    const account = computeCustomerAccount(
      input({
        soldCopies: [sold(180_000)],
        payments: [
          collected(40_000, localDate('2026-10-03')),
          scheduled(35_000, localDate('2026-11-15')),
          scheduled(35_000, localDate('2026-11-30')),
          scheduled(35_000, localDate('2026-12-15')),
          scheduled(35_000, localDate('2026-12-31')),
        ],
      }),
      TODAY,
    );
    expect(account).toMatchObject({
      scheduledTotal: 140_000,
      unscheduled: 0,
      excess: 0,
      notices: { excess: false },
    });
  });

  it('CA-3 / AF-02: libro de 50.000 devuelto y 30.000 cobrados → saldo a favor 30.000, prospecto sin estado', () => {
    // El libro devuelto ya no está vendido: no llega en soldCopies.
    const account = computeCustomerAccount(
      input({ payments: [collected(30_000, localDate('2026-10-03'))] }),
      TODAY,
    );
    expect(account).toMatchObject({
      debt: 0,
      balance: -30_000,
      credit: 30_000,
      remaining: 0,
      isProspect: true,
      standing: null,
      paidPct: 0,
    });
  });

  it('CA-4 / BR-PAY-13: saldo 20.000 y programados 40.000 → excess 20.000 y aviso', () => {
    const account = computeCustomerAccount(
      input({
        soldCopies: [sold(60_000)],
        payments: [
          collected(40_000, localDate('2026-10-03')),
          scheduled(20_000, localDate('2026-11-15')),
          scheduled(20_000, localDate('2026-11-30')),
        ],
      }),
      TODAY,
    );
    expect(account).toMatchObject({
      remaining: 20_000,
      scheduledTotal: 40_000,
      excess: 20_000,
      unscheduled: 0,
    });
    expect(account.notices.excess).toBe(true);
  });

  it('CA-5 / R3 / BR-CUS-13: con saldo 0 y un abono vencido, Saldado gana a Vencido', () => {
    const account = computeCustomerAccount(
      input({
        soldCopies: [sold(50_000)],
        payments: [collected(50_000, localDate('2026-10-03')), scheduled(10_000, YESTERDAY)],
      }),
      TODAY,
    );
    expect(account.balance).toBe(0);
    expect(account.standing).toBe('settled');
    expect(account.hasOverdue).toBe(true);
  });

  it('CA-6 / BR-PAY-08: saldo 60.000 y un abono por cobrar de ayer → Vencido', () => {
    const account = computeCustomerAccount(
      input({
        soldCopies: [sold(60_000)],
        payments: [scheduled(30_000, YESTERDAY), scheduled(30_000, TODAY)],
      }),
      TODAY,
    );
    expect(account).toMatchObject({ standing: 'overdue', hasOverdue: true, nextDueDate: YESTERDAY });
  });

  it('BR-PAY-08: un abono con fecha de hoy aún no está vencido', () => {
    const account = computeCustomerAccount(
      input({ soldCopies: [sold(60_000)], payments: [scheduled(60_000, TODAY)] }),
      TODAY,
    );
    expect(account).toMatchObject({ standing: 'current', hasOverdue: false });
  });

  it('CA-7 / BR-PAY-14: cliente sin libros con un abono programado → aviso "Aún no tiene libro"', () => {
    const account = computeCustomerAccount(
      input({ payments: [scheduled(20_000, localDate('2026-11-15'))] }),
      TODAY,
    );
    expect(account.notices.noBook).toBe(true);
    expect(account.isProspect).toBe(true);
  });

  it('BR-PAY-14: sin abonos o con libro, no hay aviso "Aún no tiene libro"', () => {
    expect(computeCustomerAccount(input(), TODAY).notices.noBook).toBe(false);
    expect(
      computeCustomerAccount(
        input({ soldCopies: [sold(10_000)], payments: [scheduled(10_000, localDate('2026-11-15'))] }),
        TODAY,
      ).notices.noBook,
    ).toBe(false);
  });

  it('CA-8: prospecto creado el 24/09 que compra el 03/10 → cliente desde el 03/10; sin compras, desde el 24/09', () => {
    expect(computeCustomerAccount(input({ soldCopies: [sold(10_000)] }), TODAY).customerSince).toBe(
      '2026-10-03',
    );
    expect(computeCustomerAccount(input(), TODAY).customerSince).toBe('2026-09-24');
  });

  it('CA-8 (borde): la venta se convierte a fecha de Bogotá (23:30 del 02/10 en Bogotá es 02/10)', () => {
    const account = computeCustomerAccount(
      input({ soldCopies: [sold(10_000, '2026-10-03T04:30:00Z')] }),
      TODAY,
    );
    expect(account.customerSince).toBe('2026-10-02');
  });

  it('CA-9: abonos cobrados el 01/10 y el 22/10 → último abono el 22/10 (incluye entregados)', () => {
    const delivered: AccountPayment = { ...collected(20_000, localDate('2026-10-22')), status: 'delivered' };
    const account = computeCustomerAccount(
      input({
        soldCopies: [sold(100_000)],
        payments: [collected(40_000, localDate('2026-10-01')), delivered],
      }),
      TODAY,
    );
    expect(account.lastPaymentAt).toBe('2026-10-22');
    expect(account.paidTotal).toBe(60_000);
  });

  it('fechas de venta: primera y última; sin abonos, último abono y próximo abono vacíos', () => {
    const account = computeCustomerAccount(
      input({ soldCopies: [sold(10_000, '2026-10-20T15:00:00Z'), sold(20_000, '2026-10-03T15:00:00Z')] }),
      TODAY,
    );
    expect(account.firstSaleAt?.toISOString()).toBe('2026-10-03T15:00:00.000Z');
    expect(account.lastSaleAt?.toISOString()).toBe('2026-10-20T15:00:00.000Z');
    expect(account.lastPaymentAt).toBeNull();
    expect(account.nextDueDate).toBeNull();
    expect(account.unscheduled).toBe(30_000);
  });

  it('R2: los abonos cancelados y los borrados no cuentan en nada', () => {
    const canceled: AccountPayment = { ...scheduled(50_000, YESTERDAY), status: 'canceled' };
    const deletedScheduled: AccountPayment = { ...scheduled(50_000, YESTERDAY), deletedAt: new Date() };
    const deletedCollected: AccountPayment = { ...collected(50_000, YESTERDAY), deletedAt: new Date() };
    const account = computeCustomerAccount(
      input({ soldCopies: [sold(100_000)], payments: [canceled, deletedScheduled, deletedCollected] }),
      TODAY,
    );
    expect(account).toMatchObject({
      paidTotal: 0,
      scheduledTotal: 0,
      hasOverdue: false,
      standing: 'current',
      lastPaymentAt: null,
      nextDueDate: null,
      unscheduled: 100_000,
    });
    // Un cliente sin libros con solo abonos cancelados no muestra el aviso.
    expect(computeCustomerAccount(input({ payments: [canceled] }), TODAY).notices.noBook).toBe(false);
  });

  it('BR-CUS-04 / ADR-0033: el canje de saldo a favor consume el saldo (signo +)', () => {
    const account = computeCustomerAccount(
      input({ payments: [collected(30_000, YESTERDAY)], creditEntries: [{ amount: 1500 }] }),
      TODAY,
    );
    expect(account).toMatchObject({ creditApplied: 1500, balance: -28_500, credit: 28_500 });
  });

  it('BR-CUS-10: el porcentaje abonado se redondea hacia abajo y tiene tope 100', () => {
    const pct = (paid: number) =>
      computeCustomerAccount(
        input({ soldCopies: [sold(30_000)], payments: [collected(paid, YESTERDAY)] }),
        TODAY,
      ).paidPct;
    expect(pct(29_999)).toBe(99);
    expect(pct(30_000)).toBe(100);
    expect(pct(45_000)).toBe(100);
  });

  it('cliente archivado sin libros: prospecto, sin estado', () => {
    const account = computeCustomerAccount(
      input({ customer: { createdAt: new Date('2026-09-24T14:00:00Z') } }),
      TODAY,
    );
    expect(account).toMatchObject({ isProspect: true, standing: null });
  });
});

describe('computeCustomerAccount: datos incompletos', () => {
  it('un abono sin monto o sin fecha (la base no lo permite) cuenta como 0 y no rompe el cálculo', () => {
    const account = computeCustomerAccount(
      input({
        soldCopies: [sold(10_000)],
        payments: [
          { status: 'collected', agreedAmount: null, paidAmount: null, dueDate: null, paidAt: null },
          { status: 'scheduled', agreedAmount: null, paidAmount: null, dueDate: null, paidAt: null },
        ],
      }),
      TODAY,
    );
    expect(account).toMatchObject({
      paidTotal: 0,
      scheduledTotal: 0,
      lastPaymentAt: null,
      nextDueDate: null,
      hasOverdue: false,
    });
  });
});

describe('computeCustomerAccount: propiedades', () => {
  const day = fc.integer({ min: 0, max: 120 }).map((offset) => {
    const date = new Date(Date.UTC(2026, 8, 1 + offset));
    return localDate(date.toISOString().slice(0, 10));
  });
  const payment: fc.Arbitrary<AccountPayment> = fc.oneof(
    fc
      .record({ amount: fc.integer({ min: 1, max: 500_000 }), date: day })
      .map(({ amount, date }) => scheduled(amount, date)),
    fc
      .record({ amount: fc.integer({ min: 1, max: 500_000 }), date: day })
      .map(({ amount, date }) => collected(amount, date)),
    fc
      .record({ amount: fc.integer({ min: 1, max: 500_000 }), date: day })
      .map(({ amount, date }) => ({ ...collected(amount, date), status: 'delivered' as const })),
    fc
      .record({ amount: fc.integer({ min: 1, max: 500_000 }), date: day })
      .map(({ amount, date }) => ({ ...scheduled(amount, date), status: 'canceled' as const })),
  );
  const copies = fc.array(
    fc.integer({ min: 0, max: 900_000 }).map((price) => sold(price)),
    { maxLength: 4 },
  );
  const credits = fc.array(
    fc.integer({ min: 0, max: 50_000 }).map((amount) => ({ amount })),
    { maxLength: 3 },
  );

  it('balance = debt − paidTotal + creditApplied; credit y remaining nunca negativos; reordenar abonos no cambia nada', () => {
    fc.assert(
      fc.property(
        copies,
        fc.array(payment, { maxLength: 8 }),
        credits,
        (soldCopies, payments, creditEntries) => {
          const account = computeCustomerAccount(input({ soldCopies, payments, creditEntries }), TODAY);
          expect(account.balance).toBe(account.debt - account.paidTotal + account.creditApplied);
          expect(account.credit).toBeGreaterThanOrEqual(0);
          expect(account.remaining).toBeGreaterThanOrEqual(0);
          expect(account.credit === 0 || account.remaining === 0).toBe(true);
          expect(account.unscheduled === 0 || account.excess === 0).toBe(true);
          expect(account.paidPct).toBeGreaterThanOrEqual(0);
          expect(account.paidPct).toBeLessThanOrEqual(100);

          const reversed = computeCustomerAccount(
            input({
              soldCopies: [...soldCopies].reverse(),
              payments: [...payments].reverse(),
              creditEntries,
            }),
            TODAY,
          );
          expect(reversed).toEqual(account);
        },
      ),
    );
  });
});
