import { describe, expect, it, vi } from 'vitest';
import type { Payment } from '@/domain/payment';
import { appError, validationError } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import { fixedClock, localDate } from '@/domain/time';
import type { CustomerAccountData } from '@/repositories';
import { fakeConnectivity } from '../../../tests/support/fake-connectivity';
import { fakeCustomerRepository, fakePaymentRepository } from '../../../tests/support/fake-repositories';
import { collectPayment, undoCollectPayment } from './use-cases/collect-payment';

const CUSTOMER = 'c-1';
const clock = fixedClock('2026-11-05T15:00:00Z');

const scheduled = (id: string, due: string, agreed = 10_000): Payment => ({
  id,
  customerId: CUSTOMER,
  kind: 'scheduled',
  status: 'scheduled',
  originalDueDate: localDate(due),
  dueDate: localDate(due),
  paidAt: null,
  agreedAmount: agreed,
  paidAmount: null,
  method: null,
  canceledAt: null,
  cancelReason: null,
  createdAt: new Date('2026-11-01T15:00:00Z'),
});

const collected = (p: Payment, paid: number): Payment => ({
  ...p,
  status: 'collected',
  paidAmount: paid,
  paidAt: localDate('2026-11-05'),
  method: 'transfer',
});

/** Debe 40.000 con 4 × 10.000; el primero (p0) ya cobrado por `paid`. */
const afterCollecting = (paid: number): CustomerAccountData => {
  const [first, ...rest] = ['2026-11-05', '2026-11-20', '2026-12-05', '2026-12-20'].map((d, i) =>
    scheduled(`p${i}`, d),
  );
  return {
    customer: { createdAt: new Date('2026-11-01T15:00:00Z') },
    soldCopies: [{ agreedPrice: 40_000, soldAt: new Date('2026-11-01T15:00:00Z') }],
    payments: [collected(first!, paid), ...rest],
  };
};

const depsWith = (agreed: number, paid: number, online = true) => ({
  payments: fakePaymentRepository({
    collect: vi.fn(async () => ok({ customerId: CUSTOMER, agreedAmount: agreed, paidAmount: paid })),
  }),
  customers: fakeCustomerRepository({ getAccountData: vi.fn(async () => ok(afterCollecting(paid))) }),
  connectivity: fakeConnectivity(online),
  clock,
});

describe('collectPayment (HU-ABO-06)', () => {
  it('CA-1: por defecto, lo acordado (lo pone la base), hoy y Transferencia; sin faltante ni sobrante', async () => {
    const deps = depsWith(10_000, 10_000);
    const result = await collectPayment(deps, 'p0');
    expect(deps.payments.collect).toHaveBeenCalledWith('p0', {
      paidAmount: null,
      paidAt: '2026-11-05',
      method: 'transfer',
    });
    expect(result).toMatchObject({ ok: true, value: { shortfall: null, excess: null } });
    expect(result.ok && result.value.account.balance).toBe(30_000);
  });

  it('CA-2: paga 30.000 de 40.000 → faltante 10.000; no se crea nada más', async () => {
    const deps = depsWith(40_000, 30_000);
    const result = await collectPayment(deps, 'p0', { paidAmount: 30_000, method: 'cash' });
    expect(deps.payments.collect).toHaveBeenCalledWith(
      'p0',
      expect.objectContaining({ paidAmount: 30_000, method: 'cash' }),
    );
    expect(result).toMatchObject({ ok: true, value: { shortfall: 10_000, excess: null } });
    expect(deps.payments.scheduleSingle).not.toHaveBeenCalled();
  });

  it('CA-3: acordó 10.000 y paga 15.000 → sobrante 5.000, modal, desde el más próximo', async () => {
    const result = await collectPayment(depsWith(10_000, 15_000), 'p0', { paidAmount: 15_000 });
    expect(result.ok && result.value.shortfall).toBeNull();
    expect(result.ok && result.value.excess).toMatchObject({
      trigger: 'overpayment',
      excess: 5_000,
      presentation: 'modal',
      suggestedOrder: 'nearest',
    });
  });

  it('R3: si paga lo acordado no evalúa sobrante aunque ya hubiera uno', async () => {
    // Con lo acordado (10.000) y la cuenta de un sobrepago, la evaluación existe pero no se devuelve.
    const result = await collectPayment(depsWith(15_000, 15_000), 'p0', { paidAmount: 15_000 });
    expect(result).toMatchObject({ ok: true, value: { excess: null, shortfall: null } });
  });

  it('CA-4: fecha de ayer se envía; de mañana → VALIDATION sin ir a la red; sin conexión → OFFLINE', async () => {
    const deps = depsWith(10_000, 10_000);
    await collectPayment(deps, 'p0', { paidAt: localDate('2026-11-04') });
    expect(deps.payments.collect).toHaveBeenCalledWith(
      'p0',
      expect.objectContaining({ paidAt: '2026-11-04' }),
    );
    const other = depsWith(10_000, 10_000);
    expect(await collectPayment(other, 'p0', { paidAt: localDate('2026-11-06') })).toEqual(
      err(validationError('paidAt')),
    );
    expect(await collectPayment(other, 'p0', { paidAmount: 0 })).toEqual(err(validationError('paidAmount')));
    expect(await collectPayment(depsWith(10_000, 10_000, false), 'p0')).toEqual(err(appError('OFFLINE')));
    expect(other.payments.collect).not.toHaveBeenCalled();
  });

  it('CA-5: los errores de la base pasan tal cual; si falla la relectura, también', async () => {
    const deps = depsWith(10_000, 10_000);
    vi.mocked(deps.payments.collect).mockResolvedValueOnce(err(appError('PAYMENT_NOT_SCHEDULED')));
    expect(await collectPayment(deps, 'p0')).toEqual(err(appError('PAYMENT_NOT_SCHEDULED')));
    vi.mocked(deps.customers.getAccountData).mockResolvedValueOnce(err(appError('NETWORK_ERROR')));
    expect(await collectPayment(deps, 'p0')).toMatchObject({ ok: false, error: { code: 'NETWORK_ERROR' } });
  });
});

describe('undoCollectPayment (HU-ABO-10)', () => {
  it('le pide a la base volver el abono a por cobrar y devuelve el cliente', async () => {
    const deps = depsWith(10_000, 10_000);
    deps.payments.uncollect = vi.fn(async () => ok({ customerId: CUSTOMER }));
    expect(await undoCollectPayment(deps, 'p0')).toEqual(ok({ customerId: CUSTOMER }));
    expect(deps.payments.uncollect).toHaveBeenCalledWith('p0');
  });

  it('sin conexión no lo intenta (OFFLINE)', async () => {
    const deps = depsWith(10_000, 10_000, false);
    deps.payments.uncollect = vi.fn();
    const result = await undoCollectPayment(deps, 'p0');
    expect(result.ok).toBe(false);
    expect(deps.payments.uncollect).not.toHaveBeenCalled();
  });

  it('un cobro que ya está en un Abibono se rechaza (PAYMENT_LOCKED)', async () => {
    const deps = depsWith(10_000, 10_000);
    deps.payments.uncollect = vi.fn(async () => err(appError('PAYMENT_LOCKED')));
    const result = await undoCollectPayment(deps, 'p0');
    expect(!result.ok && result.error.code).toBe('PAYMENT_LOCKED');
  });
});
