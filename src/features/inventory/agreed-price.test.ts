import { describe, expect, it, vi } from 'vitest';
import type { Payment } from '@/domain/payment';
import { appError } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import { fixedClock, localDate } from '@/domain/time';
import type { CustomerAccountData } from '@/repositories';
import { fakeConnectivity } from '../../../tests/support/fake-connectivity';
import { fakeCopyRepository, fakeCustomerRepository } from '../../../tests/support/fake-repositories';
import { restorePublicPrice, updateAgreedPrice } from './use-cases/agreed-price';

const scheduled = (id: string, amount: number, due: string): Payment => ({
  id,
  customerId: 'c1',
  kind: 'scheduled',
  status: 'scheduled',
  originalDueDate: localDate(due),
  dueDate: localDate(due),
  paidAt: null,
  agreedAmount: amount,
  paidAmount: null,
  method: null,
  canceledAt: null,
  cancelReason: null,
  createdAt: new Date('2026-11-01T15:00:00Z'),
});

const accountData = (price: number, payments: Payment[] = []): CustomerAccountData => ({
  customer: { createdAt: new Date('2026-11-01T15:00:00Z') },
  soldCopies: [{ agreedPrice: price, soldAt: new Date('2026-11-01T15:00:00Z') }],
  payments,
});

const depsWith = (previous: number, next: number, data: CustomerAccountData, online = true) => ({
  copies: fakeCopyRepository({
    updateAgreedPrice: vi.fn(async () =>
      ok({ customerId: 'c1', previousPrice: previous, agreedPrice: next }),
    ),
  }),
  customers: fakeCustomerRepository({ getAccountData: vi.fn(async () => ok(data)) }),
  connectivity: fakeConnectivity(online),
  clock: fixedClock('2026-11-08T15:00:00Z'),
});

describe('precio acordado (HU-INV-06)', () => {
  it('CA-1: baja a 45.000 sin programados → deuda 45.000 y sin sobrante', async () => {
    const deps = depsWith(50_000, 45_000, accountData(45_000));
    expect(await updateAgreedPrice(deps, 'k1', 45_000)).toEqual(
      ok({ account: expect.objectContaining({ debt: 45_000 }), excess: null }),
    );
    expect(deps.copies.updateAgreedPrice).toHaveBeenCalledWith('k1', 45_000);
  });

  it('CA-2 / R4: con 2 programados de 25.000 y baja a 30.000 → sobrante 20.000 en modal', async () => {
    const deps = depsWith(
      50_000,
      30_000,
      accountData(30_000, [scheduled('p1', 25_000, '2026-11-30'), scheduled('p2', 25_000, '2026-12-15')]),
    );
    const result = await updateAgreedPrice(deps, 'k1', 30_000);
    expect(result.ok && result.value.excess).toMatchObject({
      trigger: 'price_decrease',
      presentation: 'modal',
      suggestedOrder: 'farthest',
      excess: 20_000,
    });
  });

  it('CA-3: restaurar pide el precio público (null) y trae la cuenta', async () => {
    const deps = depsWith(93_000, 98_000, accountData(98_000));
    expect(await restorePublicPrice(deps, 'k1')).toEqual(
      ok({ account: expect.objectContaining({ debt: 98_000 }), excess: null }),
    );
    expect(deps.copies.updateAgreedPrice).toHaveBeenCalledWith('k1', null);
  });

  it('VALIDATION sin ir a la red; errores de la base y de la cuenta pasan; sin conexión → OFFLINE', async () => {
    const deps = depsWith(50_000, 45_000, accountData(45_000));
    expect(await updateAgreedPrice(deps, 'k1', -5)).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION', details: { field: 'price' } },
    });
    expect(deps.copies.updateAgreedPrice).not.toHaveBeenCalled();
    vi.mocked(deps.copies.updateAgreedPrice).mockResolvedValueOnce(err(appError('COPY_NOT_SOLD')));
    expect(await updateAgreedPrice(deps, 'k1', 1)).toEqual(err(appError('COPY_NOT_SOLD')));
    vi.mocked(deps.customers.getAccountData).mockResolvedValueOnce(err(appError('NETWORK_ERROR')));
    expect(await restorePublicPrice(deps, 'k1')).toEqual(err(appError('NETWORK_ERROR')));
    const offline = depsWith(1, 1, accountData(1), false);
    expect(await updateAgreedPrice(offline, 'k1', 1)).toEqual(err(appError('OFFLINE')));
    expect(await restorePublicPrice(offline, 'k1')).toEqual(err(appError('OFFLINE')));
  });
});
