import { describe, expect, it, vi } from 'vitest';
import { appError } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import { fixedClock, localDate } from '@/domain/time';
import type { CustomerAccountData } from '@/repositories';
import { fakeConnectivity } from '../../../tests/support/fake-connectivity';
import { fakeCustomerRepository, fakePaymentRepository } from '../../../tests/support/fake-repositories';
import { applyPaymentPlan } from './use-cases/payment-plan';

const data: CustomerAccountData = {
  customer: { createdAt: new Date('2026-11-01T15:00:00Z') },
  soldCopies: [{ agreedPrice: 60_000, soldAt: new Date('2026-11-01T15:00:00Z') }],
  payments: [],
};
const items = [{ paymentId: 'p1', dueDate: localDate('2026-11-15'), amount: 60_000 }];

const depsWith = (online = true) => ({
  payments: fakePaymentRepository({ applyPlan: vi.fn(async () => ok(undefined)) }),
  customers: fakeCustomerRepository({ getAccountData: vi.fn(async () => ok(data)) }),
  connectivity: fakeConnectivity(online),
  clock: fixedClock('2026-11-07T15:00:00Z'),
});

describe('applyPaymentPlan (HU-ABO-03)', () => {
  it('aplica el plan y devuelve la cuenta recalculada', async () => {
    const deps = depsWith();
    const result = await applyPaymentPlan(deps, { customerId: 'c1', mode: 'replace_all', items });
    expect(deps.payments.applyPlan).toHaveBeenCalledWith('c1', 'replace_all', items);
    expect(result.ok && result.value.account.debt).toBe(60_000);
  });

  it('sin conexión → OFFLINE; los errores de la base y de la relectura pasan tal cual', async () => {
    const offline = depsWith(false);
    expect(await applyPaymentPlan(offline, { customerId: 'c1', mode: 'replace_all', items })).toEqual(
      err(appError('OFFLINE')),
    );
    expect(offline.payments.applyPlan).not.toHaveBeenCalled();

    const mismatch = depsWith();
    vi.mocked(mismatch.payments.applyPlan).mockResolvedValue(err(appError('PLAN_TOTAL_MISMATCH')));
    expect(await applyPaymentPlan(mismatch, { customerId: 'c1', mode: 'replace_all', items })).toEqual(
      err(appError('PLAN_TOTAL_MISMATCH')),
    );

    const unreadable = depsWith();
    vi.mocked(unreadable.customers.getAccountData).mockResolvedValue(err(appError('NETWORK_ERROR')));
    expect(await applyPaymentPlan(unreadable, { customerId: 'c1', mode: 'replace_all', items })).toEqual(
      err(appError('NETWORK_ERROR')),
    );
  });
});
