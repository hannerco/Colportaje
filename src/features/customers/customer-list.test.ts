import { describe, expect, it, vi } from 'vitest';
import { appError } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import { localDate } from '@/domain/time';
import type { Title } from '@/domain/title';
import { fakeCustomerRepository, fakeTitleRepository } from '../../../tests/support/fake-repositories';
import { loadCustomerListData } from './use-cases/customer-list';

const soldAt = new Date('2026-10-03T15:00:00Z');
const customer = (id: string) => ({
  id,
  name: id,
  avatarEmoji: null,
  phone: null,
  createdAt: soldAt,
  updatedAt: soldAt,
  archived: false,
});

const depsWith = () => ({
  customers: fakeCustomerRepository({
    listForCustomerList: vi.fn(async () =>
      ok({
        customers: [customer('c1'), customer('c2')],
        soldCopies: [{ copyId: 'k1', customerId: 'c1', titleId: 't1', agreedPrice: 95_000, soldAt }],
        payments: [
          {
            customerId: 'c2',
            status: 'collected' as const,
            agreedAmount: null,
            paidAmount: 20_000,
            dueDate: null,
            paidAt: localDate('2026-10-02'),
          },
        ],
      }),
    ),
  }),
  titles: fakeTitleRepository({
    getMany: vi.fn(async () => ok([{ id: 't1', name: 'Esperanza para hoy' } as Title])),
  }),
});

describe('loadCustomerListData (HU-CLI-04)', () => {
  it('agrupa ejemplares (con su título) y abonos por cliente', async () => {
    const deps = depsWith();
    expect(await loadCustomerListData(deps)).toEqual(
      ok({
        customers: [customer('c1'), customer('c2')],
        accounts: [
          {
            customerId: 'c1',
            soldCopies: [{ copyId: 'k1', agreedPrice: 95_000, soldAt, titleName: 'Esperanza para hoy' }],
            payments: [],
          },
          {
            customerId: 'c2',
            soldCopies: [],
            payments: [
              {
                status: 'collected',
                agreedAmount: null,
                paidAmount: 20_000,
                dueDate: null,
                paidAt: '2026-10-02',
              },
            ],
          },
        ],
      }),
    );
    expect(deps.titles.getMany).toHaveBeenCalledWith(['t1']);
  });

  it('un título que no llega deja el nombre vacío; los errores de lectura se devuelven', async () => {
    const deps = depsWith();
    vi.mocked(deps.titles.getMany).mockResolvedValueOnce(ok([]));
    const loaded = await loadCustomerListData(deps);
    expect(loaded.ok && loaded.value.accounts[0]!.soldCopies[0]!.titleName).toBe('');
    vi.mocked(deps.titles.getMany).mockResolvedValueOnce(err(appError('NETWORK_ERROR')));
    expect(await loadCustomerListData(deps)).toEqual(err(appError('NETWORK_ERROR')));
    vi.mocked(deps.customers.listForCustomerList).mockResolvedValueOnce(err(appError('NETWORK_ERROR')));
    expect(await loadCustomerListData(deps)).toEqual(err(appError('NETWORK_ERROR')));
  });
});
