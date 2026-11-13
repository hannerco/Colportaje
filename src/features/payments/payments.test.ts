import { describe, expect, it, vi } from 'vitest';
import { appError } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import { fixedClock, localDate } from '@/domain/time';
import type { CustomerAccountData, CustomerRepository, PaymentRepository } from '@/repositories';
import { fakeConnectivity } from '../../../tests/support/fake-connectivity';
import { resolveScheduleExcess } from './use-cases/resolve-schedule-excess';

const CUSTOMER = '30000000-0000-4000-8000-000000000001';
const clock = fixedClock('2026-11-08T15:00:00Z');

const data: CustomerAccountData = {
  customer: { createdAt: new Date('2026-10-01T15:00:00Z') },
  soldCopies: [{ agreedPrice: 20_000, soldAt: new Date('2026-10-01T15:00:00Z') }],
  payments: [
    {
      id: 'p1',
      customerId: CUSTOMER,
      kind: 'scheduled',
      status: 'scheduled',
      originalDueDate: localDate('2026-11-15'),
      dueDate: localDate('2026-11-15'),
      paidAt: null,
      agreedAmount: 40_000,
      paidAmount: null,
      method: null,
      canceledAt: null,
      cancelReason: null,
      createdAt: new Date('2026-10-01T15:00:00Z'),
    },
  ],
};

const depsWith = (resolve: PaymentRepository['resolveScheduleExcess'], online = true) => {
  const payments: PaymentRepository = { resolveScheduleExcess: vi.fn(resolve) };
  const customers: CustomerRepository = {
    getAccountData: vi.fn(async () => ok(data)),
    create: vi.fn(),
    update: vi.fn(),
    listDuplicateCandidates: vi.fn(),
    listRefs: vi.fn(),
  };
  return { payments, customers, connectivity: fakeConnectivity(online), clock };
};

describe('resolveScheduleExcess (HU-ABO-07)', () => {
  it('CA-6: "Dejar como está" devuelve la cuenta, que sigue con el aviso de sobrante', async () => {
    const deps = depsWith(async () => ok(undefined));
    const result = await resolveScheduleExcess(deps, CUSTOMER, { action: 'leave' }, 'review');
    expect(deps.payments.resolveScheduleExcess).toHaveBeenCalledWith(CUSTOMER, { action: 'leave' }, 'review');
    expect(result.ok && result.value.account).toMatchObject({
      balance: 20_000,
      excess: 20_000,
      notices: { excess: true },
    });
  });

  it('sin conexión → OFFLINE sin llamar a la base', async () => {
    const deps = depsWith(async () => ok(undefined), false);
    expect(await resolveScheduleExcess(deps, CUSTOMER, { action: 'leave' }, 'review')).toEqual(
      err(appError('OFFLINE')),
    );
    expect(deps.payments.resolveScheduleExcess).not.toHaveBeenCalled();
  });

  it('los errores de la base pasan tal cual y no se relee la cuenta', async () => {
    const deps = depsWith(async () => err(appError('CONFLICT')));
    expect(
      await resolveScheduleExcess(deps, CUSTOMER, { action: 'auto_trim', order: 'nearest' }, 'review'),
    ).toEqual(err(appError('CONFLICT')));
    expect(deps.customers.getAccountData).not.toHaveBeenCalled();
  });

  it('si releer la cuenta falla, devuelve ese error', async () => {
    const deps = depsWith(async () => ok(undefined));
    vi.mocked(deps.customers.getAccountData).mockResolvedValue(err(appError('NETWORK_ERROR')));
    expect(await resolveScheduleExcess(deps, CUSTOMER, { action: 'leave' }, 'review')).toEqual(
      err(appError('NETWORK_ERROR')),
    );
  });
});
