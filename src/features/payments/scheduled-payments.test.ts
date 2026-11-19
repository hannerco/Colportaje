import { describe, expect, it, vi } from 'vitest';
import { appError } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import { fixedClock, localDate } from '@/domain/time';
import type { CustomerAccountData } from '@/repositories';
import { fakeConnectivity } from '../../../tests/support/fake-connectivity';
import { fakeCustomerRepository, fakePaymentRepository } from '../../../tests/support/fake-repositories';
import {
  cancelScheduledPayments,
  correctScheduledDate,
  scheduleSinglePayment,
  updateScheduledAmount,
} from './use-cases/scheduled-payments';

const CUSTOMER = 'c-1';
const clock = fixedClock('2026-11-08T15:00:00Z');

/** Prospecto sin libros con un programado de 50.000. */
const prospect: CustomerAccountData = {
  customer: { createdAt: new Date('2026-11-01T15:00:00Z') },
  soldCopies: [],
  payments: [
    {
      id: 'p1',
      customerId: CUSTOMER,
      kind: 'scheduled',
      status: 'scheduled',
      originalDueDate: localDate('2026-11-15'),
      dueDate: localDate('2026-11-15'),
      paidAt: null,
      agreedAmount: 50_000,
      paidAmount: null,
      method: null,
      canceledAt: null,
      cancelReason: null,
      createdAt: new Date('2026-11-01T15:00:00Z'),
    },
  ],
};

const depsWith = (online = true) => ({
  payments: fakePaymentRepository({
    scheduleSingle: vi.fn(async () => ok(undefined)),
    updateScheduledAmount: vi.fn(async () => ok({ customerId: CUSTOMER })),
    correctScheduledDate: vi.fn(async () => ok({ customerId: CUSTOMER })),
    cancelScheduled: vi.fn(async () => ok({ customerId: CUSTOMER })),
  }),
  customers: fakeCustomerRepository({ getAccountData: vi.fn(async () => ok(prospect)) }),
  connectivity: fakeConnectivity(online),
  clock,
});

describe('abonos programados (HU-ABO-04)', () => {
  it('CA-1: un prospecto con un abono de 50.000 → "Aún no tiene libro" y sobrante de 50.000 en franja', async () => {
    const deps = depsWith();
    const result = await scheduleSinglePayment(deps, {
      paymentId: 'p1',
      customerId: CUSTOMER,
      agreedAmount: 50_000,
      dueDate: localDate('2026-11-15'),
    });
    expect(result.ok && result.value.account.notices.noBook).toBe(true);
    expect(result.ok && result.value.excess).toMatchObject({
      excess: 50_000,
      presentation: 'banner',
      trigger: 'form_edit',
    });
  });

  it('HU-ABO-08 CA-1 / CA-2: con fecha de ayer sí llega a la base (programar y corregir)', async () => {
    const deps = depsWith();
    const yesterday = localDate('2026-11-07');
    await scheduleSinglePayment(deps, {
      paymentId: 'p',
      customerId: CUSTOMER,
      agreedAmount: 30_000,
      dueDate: yesterday,
    });
    await correctScheduledDate(deps, 'p', yesterday);
    expect(deps.payments.scheduleSingle).toHaveBeenCalledWith(
      expect.objectContaining({ dueDate: yesterday }),
    );
    expect(deps.payments.correctScheduledDate).toHaveBeenCalledWith('p', yesterday);
  });

  it('valor 0 no llega a la base; sin conexión → OFFLINE', async () => {
    const deps = depsWith();
    expect(await updateScheduledAmount(deps, 'p', 0)).toMatchObject({
      ok: false,
      error: { details: { field: 'agreedAmount' } },
    });
    expect(deps.payments.updateScheduledAmount).not.toHaveBeenCalled();
    expect(await cancelScheduledPayments(depsWith(false), ['p'])).toEqual(err(appError('OFFLINE')));
  });

  it('editar, corregir y cancelar devuelven lo que corresponde', async () => {
    const deps = depsWith();
    const edited = await updateScheduledAmount(deps, 'p1', 35_500);
    expect(edited.ok && edited.value.excess?.trigger).toBe('form_edit');
    expect(await correctScheduledDate(deps, 'p1', localDate('2026-12-05'))).toEqual(ok(undefined));
    const canceled = await cancelScheduledPayments(deps, ['p1']);
    expect(canceled.ok && canceled.value.account).toBeDefined();
  });

  it('los errores de la base y de la relectura pasan tal cual', async () => {
    const deps = depsWith();
    const notScheduled = err(appError('PAYMENT_NOT_SCHEDULED'));
    vi.mocked(deps.payments.scheduleSingle).mockResolvedValue(err(appError('CUSTOMER_ARCHIVED')));
    vi.mocked(deps.payments.updateScheduledAmount).mockResolvedValue(notScheduled);
    vi.mocked(deps.payments.correctScheduledDate).mockResolvedValue(notScheduled);
    vi.mocked(deps.payments.cancelScheduled).mockResolvedValue(notScheduled);
    expect(
      await scheduleSinglePayment(deps, {
        paymentId: 'p',
        customerId: CUSTOMER,
        agreedAmount: 1,
        dueDate: localDate('2026-11-09'),
      }),
    ).toEqual(err(appError('CUSTOMER_ARCHIVED')));
    expect(await updateScheduledAmount(deps, 'p', 1)).toEqual(notScheduled);
    expect(await correctScheduledDate(deps, 'p', localDate('2026-11-09'))).toEqual(notScheduled);
    expect(await cancelScheduledPayments(deps, ['p'])).toEqual(notScheduled);

    const unreadable = depsWith();
    vi.mocked(unreadable.customers.getAccountData).mockResolvedValue(err(appError('NETWORK_ERROR')));
    expect(await cancelScheduledPayments(unreadable, ['p'])).toEqual(err(appError('NETWORK_ERROR')));
  });
});
