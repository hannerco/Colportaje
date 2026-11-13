import { describe, expect, it, vi } from 'vitest';
import type { Payment } from '@/domain/payment';
import { appError } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import { fixedClock, localDate } from '@/domain/time';
import type { CustomerAccountData } from '@/repositories';
import { fakeConnectivity } from '../../../tests/support/fake-connectivity';
import { fakeCustomerRepository, fakePaymentRepository } from '../../../tests/support/fake-repositories';
import {
  deletePayment,
  registerCollectedPayment,
  setCreationDownPayment,
  updateCollectedPayment,
} from './use-cases/collected-payments';

const CUSTOMER = 'c-1';
const clock = fixedClock('2026-11-08T15:00:00Z');

const scheduled = (id: string, due: string): Payment => ({
  id,
  customerId: CUSTOMER,
  kind: 'scheduled',
  status: 'scheduled',
  originalDueDate: localDate(due),
  dueDate: localDate(due),
  paidAt: null,
  agreedAmount: 10_000,
  paidAmount: null,
  method: null,
  canceledAt: null,
  cancelReason: null,
  createdAt: new Date('2026-11-01T15:00:00Z'),
});

const extra = (amount: number): Payment => ({
  ...scheduled('x', '2026-11-08'),
  kind: 'extra',
  status: 'collected',
  dueDate: null,
  originalDueDate: null,
  agreedAmount: null,
  paidAmount: amount,
  paidAt: localDate('2026-11-08'),
  method: 'transfer',
});

/** Debe 40.000 con 4 programados de 10.000; `extraPaid` ya cobrado. */
const data = (extraPaid = 0): CustomerAccountData => ({
  customer: { createdAt: new Date('2026-11-01T15:00:00Z') },
  soldCopies: [{ agreedPrice: 40_000, soldAt: new Date('2026-11-01T15:00:00Z') }],
  payments: [
    ...['2026-11-15', '2026-11-30', '2026-12-15', '2026-12-30'].map((d, i) => scheduled(`p${i}`, d)),
    ...(extraPaid ? [extra(extraPaid)] : []),
  ],
});

const depsWith = (accountData = data(), online = true) => ({
  payments: fakePaymentRepository({
    setCreationDownPayment: vi.fn(async () => ok(undefined)),
    registerCollected: vi.fn(async () => ok(undefined)),
    updateCollected: vi.fn(async () => ok({ customerId: CUSTOMER })),
    delete: vi.fn(async () => ok({ customerId: CUSTOMER, previousStatus: 'collected' as const })),
  }),
  customers: fakeCustomerRepository({ getAccountData: vi.fn(async () => ok(accountData)) }),
  connectivity: fakeConnectivity(online),
  clock,
});

describe('setCreationDownPayment', () => {
  it('Transferencia por defecto; vacío = 0 (borrar); sobrante como franja', async () => {
    const deps = depsWith(data(20_000));
    const result = await setCreationDownPayment(deps, {
      paymentId: 'd1',
      customerId: CUSTOMER,
      amount: null,
    });
    expect(deps.payments.setCreationDownPayment).toHaveBeenCalledWith({
      paymentId: 'd1',
      customerId: CUSTOMER,
      amount: 0,
      method: 'transfer',
    });
    expect(result.ok && result.value.excess).toMatchObject({ trigger: 'form_edit', presentation: 'banner' });
  });

  it('un valor inválido no llega a la base', async () => {
    const deps = depsWith();
    expect(
      await setCreationDownPayment(deps, { paymentId: 'd1', customerId: CUSTOMER, amount: 1.5 }),
    ).toMatchObject({
      ok: false,
      error: { details: { field: 'paidAmount' } },
    });
    expect(deps.payments.setCreationDownPayment).not.toHaveBeenCalled();
  });
});

describe('registerCollectedPayment', () => {
  it('CA-4: un extra de 20.000 con 4 × 10.000 programados → modal con sobrante 20.000', async () => {
    const deps = depsWith(data(20_000));
    const result = await registerCollectedPayment(deps, {
      paymentId: 'e1',
      customerId: CUSTOMER,
      kind: 'extra',
      paidAmount: 20_000,
    });
    expect(deps.payments.registerCollected).toHaveBeenCalledWith(
      expect.objectContaining({ paidAt: '2026-11-08', method: 'transfer', kind: 'extra' }),
    );
    expect(result.ok && result.value.excess).toMatchObject({
      trigger: 'extra_payment',
      presentation: 'modal',
      excess: 20_000,
      suggestedOrder: 'nearest',
    });
  });

  it('CA-7: fecha real de mañana → VALIDATION en paidAt sin llamar a la base; sin conexión → OFFLINE', async () => {
    const deps = depsWith();
    const input = { paymentId: 'e1', customerId: CUSTOMER, kind: 'extra' as const, paidAmount: 1 };
    expect(await registerCollectedPayment(deps, { ...input, paidAt: localDate('2026-11-09') })).toMatchObject(
      {
        ok: false,
        error: { code: 'VALIDATION', details: { field: 'paidAt' } },
      },
    );
    expect(await registerCollectedPayment(depsWith(data(), false), input)).toEqual(err(appError('OFFLINE')));
    expect(deps.payments.registerCollected).not.toHaveBeenCalled();
  });
});

describe('updateCollectedPayment y deletePayment', () => {
  it('corregir usa el disparador edit_collected; un dato inválido no llega a la base', async () => {
    const deps = depsWith(data(20_000));
    const result = await updateCollectedPayment(deps, 'e1', { paidAmount: 25_000 });
    expect(result.ok && result.value.excess?.trigger).toBe('edit_collected');
    expect(await updateCollectedPayment(deps, 'e1', { paidAmount: 0 })).toMatchObject({ ok: false });
    expect(deps.payments.updateCollected).toHaveBeenCalledTimes(1);
  });

  it('borrar un cobro usa delete_collected; uno programado, form_edit', async () => {
    const collected = depsWith(data(20_000));
    expect((await deletePayment(collected, 'e1')).ok).toBe(true);
    const scheduledDeps = depsWith(data(20_000));
    vi.mocked(scheduledDeps.payments.delete).mockResolvedValue(
      ok({ customerId: CUSTOMER, previousStatus: 'scheduled' }),
    );
    const result = await deletePayment(scheduledDeps, 'p0');
    expect(result.ok && result.value.excess?.trigger).toBe('form_edit');
    const fromCollected = await deletePayment(collected, 'e1');
    expect(fromCollected.ok && fromCollected.value.excess).toMatchObject({
      trigger: 'delete_collected',
      cancelReason: 'manual',
    });
  });

  it('los errores de la base y de la relectura pasan tal cual', async () => {
    const locked = depsWith();
    vi.mocked(locked.payments.updateCollected).mockResolvedValue(err(appError('PAYMENT_LOCKED')));
    vi.mocked(locked.payments.delete).mockResolvedValue(err(appError('PAYMENT_LOCKED')));
    vi.mocked(locked.payments.registerCollected).mockResolvedValue(err(appError('CUSTOMER_ARCHIVED')));
    vi.mocked(locked.payments.setCreationDownPayment).mockResolvedValue(err(appError('CUSTOMER_ARCHIVED')));
    expect(await updateCollectedPayment(locked, 'e1', {})).toEqual(err(appError('PAYMENT_LOCKED')));
    expect(await deletePayment(locked, 'e1')).toEqual(err(appError('PAYMENT_LOCKED')));
    expect(
      await registerCollectedPayment(locked, {
        paymentId: 'e',
        customerId: CUSTOMER,
        kind: 'extra',
        paidAmount: 1,
      }),
    ).toEqual(err(appError('CUSTOMER_ARCHIVED')));
    expect(await setCreationDownPayment(locked, { paymentId: 'd', customerId: CUSTOMER, amount: 1 })).toEqual(
      err(appError('CUSTOMER_ARCHIVED')),
    );

    const unreadable = depsWith();
    vi.mocked(unreadable.customers.getAccountData).mockResolvedValue(err(appError('NETWORK_ERROR')));
    expect(await deletePayment(unreadable, 'e1')).toEqual(err(appError('NETWORK_ERROR')));
  });
});
