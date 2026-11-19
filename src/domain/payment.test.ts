import { describe, expect, it } from 'vitest';
import {
  applyPaymentAction,
  canTransitionPayment,
  displayAgreed,
  isOverdue,
  moneyAmount,
  overdueDays,
  PAYMENT_ACTIONS,
  PAYMENT_TRANSITIONS,
  type Payment,
  type PaymentAction,
  type PaymentActionType,
  type PaymentStatus,
} from './payment';
import { localDate } from './time';

const today = localDate('2026-11-08');
const scheduledDue = (dueDate: string) => ({ status: 'scheduled' as const, dueDate: localDate(dueDate) });

const aPayment = (overrides: Partial<Payment> = {}): Payment => ({
  id: 'pay-1',
  customerId: 'customer-1',
  kind: 'scheduled',
  status: 'scheduled',
  originalDueDate: localDate('2026-11-15'),
  dueDate: localDate('2026-11-15'),
  paidAt: null,
  agreedAmount: 60_000,
  paidAmount: null,
  method: null,
  canceledAt: null,
  cancelReason: null,
  createdAt: new Date('2026-11-01T15:00:00Z'),
  ...overrides,
});

const collectedPayment = (overrides: Partial<Payment> = {}) =>
  aPayment({
    status: 'collected',
    paidAmount: 60_000,
    paidAt: localDate('2026-11-08'),
    method: 'transfer',
    ...overrides,
  });

const STATUSES: PaymentStatus[] = ['scheduled', 'collected', 'delivered', 'canceled'];

const paymentIn = (status: PaymentStatus): Payment =>
  status === 'scheduled'
    ? aPayment()
    : status === 'canceled'
      ? aPayment({ status, canceledAt: new Date(), cancelReason: 'manual' })
      : collectedPayment({ status });

const actionOf = (type: PaymentActionType): PaymentAction =>
  type === 'collect'
    ? { type, paidAmount: 60_000, paidAt: today, method: 'cash', today }
    : type === 'cancel'
      ? { type, at: new Date('2026-11-08T16:00:00Z'), reason: 'book_returned' }
      : ({ type } as PaymentAction);

describe('payment: vencido (BR-PAY-08)', () => {
  it('CA-1: programado para el 17/10 y hoy 05/11 → vencido hace 19 días', () => {
    const payment = scheduledDue('2026-10-17');
    expect(isOverdue(payment, localDate('2026-11-05'))).toBe(true);
    expect(overdueDays(payment, localDate('2026-11-05'))).toBe(19);
  });

  it('un abono por cobrar con fecha anterior a hoy está vencido; hoy o después, no', () => {
    expect(isOverdue(scheduledDue('2026-11-07'), today)).toBe(true);
    expect(isOverdue(scheduledDue('2026-11-08'), today)).toBe(false);
    expect(isOverdue(scheduledDue('2026-11-09'), today)).toBe(false);
  });

  it('cobrado, entregado o cancelado nunca está vencido, aunque su fecha haya pasado', () => {
    for (const status of ['collected', 'delivered', 'canceled'] as const) {
      expect(isOverdue({ status, dueDate: localDate('2026-01-01') }, today)).toBe(false);
    }
    expect(isOverdue({ status: 'scheduled', dueDate: null }, today)).toBe(false);
  });

  it('"Vencido · hace N días": días desde la fecha acordada; 0 si no está vencido', () => {
    expect(overdueDays(scheduledDue('2026-11-07'), today)).toBe(1);
    expect(overdueDays(scheduledDue('2026-11-08'), today)).toBe(0);
    expect(overdueDays({ status: 'collected', dueDate: localDate('2026-10-01') }, today)).toBe(0);
  });
});

describe('payment: máquina de estados (BR-PAY-02)', () => {
  it('la tabla única tiene exactamente las transiciones de la HU', () => {
    expect(
      Object.fromEntries(
        PAYMENT_ACTIONS.map((a) => [a, [PAYMENT_TRANSITIONS[a].from, PAYMENT_TRANSITIONS[a].to]]),
      ),
    ).toEqual({
      collect: ['scheduled', 'collected'],
      cancel: ['scheduled', 'canceled'],
      deliver: ['collected', 'delivered'],
      reopen: ['delivered', 'collected'],
      uncollect: ['collected', 'scheduled'],
    });
  });

  describe.each(PAYMENT_ACTIONS)('%s', (action) => {
    it.each(STATUSES)('desde %s', (status) => {
      const allowed = PAYMENT_TRANSITIONS[action].from === status;
      expect(canTransitionPayment(status, action)).toBe(allowed);
      const result = applyPaymentAction(paymentIn(status), actionOf(action));
      if (allowed) expect(result.ok).toBe(true);
      else
        expect(result).toEqual({
          ok: false,
          error: { code: 'INVALID_TRANSITION', retryable: false, details: { from: status, action } },
        });
    });
  });

  it('deshacer un cobro borra lo real y conserva lo acordado; la cuota inicial y el abono extra no se deshacen', () => {
    const done = applyPaymentAction(collectedPayment(), { type: 'uncollect' });
    expect(done.ok && done.value).toMatchObject({
      status: 'scheduled',
      paidAmount: null,
      paidAt: null,
      method: null,
    });
    for (const kind of ['down_payment', 'extra'] as const) {
      const result = applyPaymentAction(collectedPayment({ kind }), { type: 'uncollect' });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('INVALID_TRANSITION');
    }
  });

  it('CA-7: cobrar un abono cancelado da INVALID_TRANSITION', () => {
    const result = applyPaymentAction(paymentIn('canceled'), actionOf('collect'));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVALID_TRANSITION');
  });

  it('cobrar guarda lo real y conserva valor y fecha acordados (para comparar)', () => {
    const result = applyPaymentAction(aPayment(), {
      type: 'collect',
      paidAmount: 50_000,
      paidAt: localDate('2026-11-07'),
      method: 'transfer',
      today,
    });
    expect(result.ok && result.value).toEqual(
      collectedPayment({ paidAmount: 50_000, paidAt: localDate('2026-11-07') }),
    );
  });

  it.each([
    ['paidAmount', { paidAmount: 0 }],
    ['paidAmount', { paidAmount: 12.5 }],
    ['paidAt', { paidAt: localDate('2026-11-09') }],
  ] as const)('R2 / R6: cobrar con %s inválido se rechaza', (field, overrides) => {
    const action = { ...(actionOf('collect') as Extract<PaymentAction, { type: 'collect' }>), ...overrides };
    expect(applyPaymentAction(aPayment(), action)).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION', details: { field } },
    });
  });

  it('R3: cancelar guarda fecha y motivo', () => {
    const at = new Date('2026-11-08T16:00:00Z');
    const result = applyPaymentAction(aPayment(), { type: 'cancel', at, reason: 'overpaid' });
    expect(result.ok && result.value).toEqual(
      aPayment({ status: 'canceled', canceledAt: at, cancelReason: 'overpaid' }),
    );
  });

  it('entregar y reabrir solo cambian el estado', () => {
    const delivered = applyPaymentAction(collectedPayment(), { type: 'deliver' });
    expect(delivered.ok && delivered.value).toEqual(collectedPayment({ status: 'delivered' }));
    const reopened = delivered.ok ? applyPaymentAction(delivered.value, { type: 'reopen' }) : delivered;
    expect(reopened.ok && reopened.value).toEqual(collectedPayment());
  });
});

describe('payment: valores para mostrar (ADR-0046)', () => {
  it('CA-3: cuota inicial de 80.000 pagada el 03/10 → acordado 80.000 el 03/10 y monto 80.000', () => {
    const downPayment = collectedPayment({
      kind: 'down_payment',
      agreedAmount: null,
      paidAmount: 80_000,
      paidAt: localDate('2026-10-03'),
      dueDate: localDate('2026-10-03'),
      originalDueDate: localDate('2026-10-03'),
    });
    expect(displayAgreed(downPayment)).toEqual({ amount: 80_000, date: '2026-10-03' });
    expect(moneyAmount(downPayment)).toBe(80_000);
  });

  it('CA-4: abono extra de 20.000 pagado el 28/10 → acordado 20.000 el 28/10', () => {
    const extra = collectedPayment({
      kind: 'extra',
      agreedAmount: null,
      dueDate: null,
      originalDueDate: null,
      paidAmount: 20_000,
      paidAt: localDate('2026-10-28'),
    });
    expect(displayAgreed(extra)).toEqual({ amount: 20_000, date: '2026-10-28' });
  });

  it('un programado muestra su valor y fecha acordados, aunque ya se haya cobrado otro valor', () => {
    expect(displayAgreed(aPayment())).toEqual({ amount: 60_000, date: '2026-11-15' });
    expect(displayAgreed(collectedPayment({ paidAmount: 50_000 }))).toEqual({
      amount: 60_000,
      date: '2026-11-15',
    });
  });

  it('CA-5: un cancelado suma 0; por cobrar suma el acordado; cobrado o entregado, lo real', () => {
    expect(moneyAmount(paymentIn('canceled'))).toBe(0);
    expect(moneyAmount(aPayment())).toBe(60_000);
    expect(moneyAmount(collectedPayment({ paidAmount: 55_000 }))).toBe(55_000);
    expect(moneyAmount(collectedPayment({ status: 'delivered', paidAmount: 55_000 }))).toBe(55_000);
  });

  it('datos incompletos (que la base no permite) cuentan como 0', () => {
    expect(moneyAmount(aPayment({ agreedAmount: null }))).toBe(0);
    expect(moneyAmount(collectedPayment({ paidAmount: null }))).toBe(0);
    expect(displayAgreed(collectedPayment({ kind: 'extra', paidAmount: null, paidAt: null }))).toEqual({
      amount: 0,
      date: null,
    });
    expect(displayAgreed(aPayment({ agreedAmount: null, dueDate: null }))).toEqual({ amount: 0, date: null });
  });
});
