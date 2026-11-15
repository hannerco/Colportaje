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
import { DEFAULT_PAYMENTS_LIST_PARAMS } from '@/domain/payments-list';
import { loadMoneySummaryData, moneySummaryFrom, unscheduledCustomersFrom } from './use-cases/money-summary';
import { paymentsListFrom } from './use-cases/payments-list';

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

/** Un cobrado de `customerId`, con todos los campos de un abono. */
const cashPayment = (id: string, customerId: string, paidAmount: number, method: 'cash' | 'transfer') => ({
  id,
  customerId,
  kind: 'extra' as const,
  status: 'collected' as const,
  originalDueDate: null,
  dueDate: null,
  paidAt: localDate('2026-10-05'),
  agreedAmount: null,
  paidAmount,
  method,
  canceledAt: null,
  cancelReason: null,
  createdAt: new Date('2026-10-05T15:00:00Z'),
  depositId: null,
});

const depsWith = () => ({
  money: fakeMoneyRepository({
    listPayments: vi.fn(async () =>
      ok([
        cashPayment('p1', 'ana', 30_000, 'cash'),
        cashPayment('p2', 'archivada', 20_000, 'transfer'),
        // De un cliente descartado (no llega en la lista de clientes): no cuenta (R6).
        cashPayment('p3', 'descartado', 99_000, 'cash'),
      ]),
    ),
    listSummaryDeposits: vi.fn(async () =>
      ok([{ status: 'confirmed' as const, cashAmount: 10_000, transferAmount: 5_000, depositNumber: 1 }]),
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

  it('HU-DIN-03: la lista sale de la misma lectura, con el cliente archivado marcado y sin descartados', async () => {
    const data = await loadMoneySummaryData(depsWith());
    if (!data.ok) throw new Error(data.error.code);
    const list = paymentsListFrom(data.value, { ...DEFAULT_PAYMENTS_LIST_PARAMS, view: 'to_deliver' }, TODAY);
    expect(list.counts.toDeliver).toBe(2);
    expect(list.rows.map((r) => [r.customer.name, r.customer.archived])).toEqual([
      ['Ana', false],
      ['Beatriz', true],
    ]);
  });

  it('cualquier lectura que falle se devuelve', async () => {
    for (const fail of ['payments', 'deposits', 'customers'] as const) {
      const deps = depsWith();
      if (fail === 'payments')
        vi.mocked(deps.money.listPayments).mockResolvedValueOnce(err(appError('NETWORK_ERROR')));
      if (fail === 'deposits')
        vi.mocked(deps.money.listSummaryDeposits).mockResolvedValueOnce(err(appError('NETWORK_ERROR')));
      if (fail === 'customers')
        vi.mocked(deps.customers.listForCustomerList).mockResolvedValueOnce(err(appError('NETWORK_ERROR')));
      expect(await loadMoneySummaryData(deps)).toEqual(err(appError('NETWORK_ERROR')));
    }
  });
});
