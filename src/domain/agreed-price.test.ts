import { describe, expect, it } from 'vitest';
import { evaluatePriceChange, validateAgreedPrice } from './agreed-price';
import { computeCustomerAccount, type AccountPayment } from './customer';
import { localDate } from './time';

const TODAY = localDate('2026-11-08');
const sold = (agreedPrice: number) => ({ agreedPrice, soldAt: new Date('2026-10-03T15:00:00Z') });
const scheduled = (id: string, amount: number, due: string): AccountPayment & { id: string } => ({
  id,
  status: 'scheduled',
  agreedAmount: amount,
  paidAmount: null,
  dueDate: localDate(due),
  paidAt: null,
});
const collected = (amount: number): AccountPayment => ({
  status: 'collected',
  agreedAmount: null,
  paidAmount: amount,
  dueDate: null,
  paidAt: localDate('2026-10-05'),
});
const accountWith = (price: number, payments: AccountPayment[] = []) =>
  computeCustomerAccount(
    { customer: { createdAt: new Date('2026-10-01T15:00:00Z') }, soldCopies: [sold(price)], payments },
    TODAY,
  );
const excessPayments = (payments: (AccountPayment & { id: string })[]) =>
  payments.map((p) => ({
    paymentId: p.id,
    agreedAmount: p.agreedAmount!,
    dueDate: p.dueDate!,
    createdAt: new Date('2026-10-01T15:00:00Z'),
  }));

describe('validateAgreedPrice (HU-INV-06 R2)', () => {
  it('entero ≥ 0, también mayor que el público o 0', () => {
    for (const price of [0, 45_000, 120_000])
      expect(validateAgreedPrice(price)).toEqual({ ok: true, value: price });
  });

  it('negativo, decimal o no finito → VALIDATION price', () => {
    for (const price of [-1, 45_000.5, Number.NaN, Number.POSITIVE_INFINITY])
      expect(validateAgreedPrice(price)).toMatchObject({
        ok: false,
        error: { code: 'VALIDATION', details: { field: 'price' } },
      });
  });
});

describe('evaluatePriceChange (HU-INV-06 R4)', () => {
  it('CA-1: baja a 45.000 sin programados → deuda 45.000 y sin sobrante', () => {
    const account = accountWith(45_000);
    expect(account.debt).toBe(45_000);
    expect(evaluatePriceChange(account, [], 50_000, 45_000)).toBeNull();
  });

  it('CA-2: 2 programados de 25.000 y baja a 30.000 → sobrante 20.000, modal, desde el más lejano', () => {
    const payments = [scheduled('p1', 25_000, '2026-11-30'), scheduled('p2', 25_000, '2026-12-15')];
    expect(
      evaluatePriceChange(accountWith(30_000, payments), excessPayments(payments), 50_000, 30_000),
    ).toMatchObject({
      trigger: 'price_decrease',
      presentation: 'modal',
      suggestedOrder: 'farthest',
      excess: 20_000,
      suggestedPlan: [{ paymentId: 'p2', action: 'reduce', newAmount: 5_000 }],
    });
  });

  it('CA-4 (AF-29): pagó 50.000 y baja a 40.000 → saldo −10.000 (a favor 10.000)', () => {
    const account = accountWith(40_000, [collected(50_000)]);
    expect(account).toMatchObject({ balance: -10_000, credit: 10_000 });
    expect(evaluatePriceChange(account, [], 50_000, 40_000)).toBeNull();
  });

  it('subir el precio nunca genera sobrante, aunque lo programado ya excediera (AF-30)', () => {
    const payments = [scheduled('p1', 80_000, '2026-11-30')];
    expect(
      evaluatePriceChange(accountWith(60_000, payments), excessPayments(payments), 50_000, 60_000),
    ).toBeNull();
    expect(
      evaluatePriceChange(accountWith(50_000, payments), excessPayments(payments), 50_000, 50_000),
    ).toBeNull();
  });
});
