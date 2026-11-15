import { describe, expect, it, vi } from 'vitest';
import { appError } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import { localDate } from '@/domain/time';
import type { Title } from '@/domain/title';
import {
  fakeCustomerRepository,
  fakeMoneyRepository,
  fakeTitleRepository,
} from '../../../tests/support/fake-repositories';
import { loadMoneySummaryData, moneySummaryFrom, unscheduledCustomersFrom } from './use-cases/money-summary';

const TODAY = localDate('2026-11-08');
const customer = (id: string, name: string, archived = false) => ({
  id,
  name,
  avatarEmoji: null,
  phone: null,
  info: null,
  address: null,
  createdAt: new Date('2026-10-01T15:00:00Z'),
  updatedAt: new Date('2026-10-01T15:00:00Z'),
  archived,
});

const depsWith = () => ({
  money: fakeMoneyRepository({
    listSummaryPayments: vi.fn(async () =>
      ok([
        {
          customerId: 'ana',
          status: 'collected' as const,
          agreedAmount: null,
          paidAmount: 30_000,
          method: 'cash' as const,
        },
        {
          customerId: 'archivada',
          status: 'collected' as const,
          agreedAmount: null,
          paidAmount: 20_000,
          method: 'transfer' as const,
        },
        // De un cliente descartado (no llega en la lista de clientes): no cuenta (R6).
        {
          customerId: 'descartado',
          status: 'collected' as const,
          agreedAmount: null,
          paidAmount: 99_000,
          method: 'cash' as const,
        },
      ]),
    ),
    listSummaryDeposits: vi.fn(async () =>
      ok([{ status: 'confirmed' as const, cashAmount: 10_000, transferAmount: 5_000 }]),
    ),
  }),
  customers: fakeCustomerRepository({
    listForCustomerList: vi.fn(async () =>
      ok({
        customers: [
          customer('ana', 'Ana'),
          customer('archivada', 'Beatriz', true),
          customer('prospecto', 'Carla'),
        ],
        soldCopies: [
          {
            copyId: 'k1',
            customerId: 'ana',
            titleId: 't1',
            agreedPrice: 100_000,
            soldAt: new Date('2026-10-02T15:00:00Z'),
          },
        ],
        payments: [
          {
            customerId: 'ana',
            status: 'collected' as const,
            agreedAmount: null,
            paidAmount: 30_000,
            dueDate: null,
            paidAt: localDate('2026-10-05'),
          },
        ],
      }),
    ),
  }),
  titles: fakeTitleRepository({ getMany: vi.fn(async () => ok([{ id: 't1', name: 'Salud' } as Title])) }),
});

describe('resumen de Dinero (HU-DIN-02)', () => {
  it('R6: cuentan los abonos de clientes archivados; los de descartados no', async () => {
    const data = await loadMoneySummaryData(depsWith());
    if (!data.ok) throw new Error(data.error.code);
    expect(moneySummaryFrom(data.value, TODAY)).toMatchObject({
      toDeliver: { total: 50_000, cash: 30_000, transfer: 20_000 },
      totalDeliveredToLeader: 15_000,
      unscheduledTotal: 70_000,
      unscheduledCustomers: 1,
    });
    expect(unscheduledCustomersFrom(data.value, TODAY)).toEqual([
      { customerId: 'ana', name: 'Ana', avatarEmoji: null, unscheduled: 70_000 },
    ]);
  });

  it('cualquier lectura que falle se devuelve', async () => {
    for (const fail of ['payments', 'deposits', 'customers'] as const) {
      const deps = depsWith();
      if (fail === 'payments')
        vi.mocked(deps.money.listSummaryPayments).mockResolvedValueOnce(err(appError('NETWORK_ERROR')));
      if (fail === 'deposits')
        vi.mocked(deps.money.listSummaryDeposits).mockResolvedValueOnce(err(appError('NETWORK_ERROR')));
      if (fail === 'customers')
        vi.mocked(deps.customers.listForCustomerList).mockResolvedValueOnce(err(appError('NETWORK_ERROR')));
      expect(await loadMoneySummaryData(deps)).toEqual(err(appError('NETWORK_ERROR')));
    }
  });
});
