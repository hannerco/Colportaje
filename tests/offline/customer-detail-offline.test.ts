// HU-CLI-12 CA-6: sin conexión, una ficha ya consultada se lee de la caché guardada en el teléfono (con sus
// fechas como fechas, SG-11).
import 'fake-indexeddb/auto';
import { onlineManager, QueryObserver } from '@tanstack/react-query';
import { persistQueryClientRestore, persistQueryClientSave } from '@tanstack/react-query-persist-client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CACHE_BUSTER, createIndexedDbPersister } from '@/adapters/browser/query-persister';
import { buildCustomerDetail } from '@/domain/customer-detail';
import { localDate } from '@/domain/time';
import { customerQueryKeys } from '@/features/customers';
import { createAppQueryClient, OFFLINE_CACHE_MAX_AGE_MS } from '@/features/shared/query-client';

afterEach(() => onlineManager.setOnline(true));

const detail = {
  ...buildCustomerDetail(
    {
      customer: {
        id: 'c1',
        name: 'María Camila Henao',
        avatarEmoji: null,
        phone: '301 557 9032',
        info: null,
        address: null,
        mapsUrl: null,
        latitude: null,
        longitude: null,
        accuracyMeters: null,
        archived: false,
        createdAt: new Date('2026-10-03T14:00:00Z'),
      },
      soldCopies: [
        {
          copyId: 'k1',
          titleName: 'Esperanza para hoy',
          category: 'religious',
          number: 1,
          agreedPrice: 120_000,
          publicPriceSnapshot: 130_000,
          soldAt: new Date('2026-10-03T15:00:00Z'),
        },
      ],
      payments: [],
    },
    localDate('2026-11-05'),
  ),
  infoPhotos: [],
  invoices: [],
};

describe('ficha sin conexión (HU-CLI-12 CA-6)', () => {
  it('una ficha ya consultada se muestra desde la caché, sin red y con sus fechas', async () => {
    const options = {
      persister: createIndexedDbPersister('cache-ficha'),
      maxAge: OFFLINE_CACHE_MAX_AGE_MS,
      buster: CACHE_BUSTER,
    };
    const before = createAppQueryClient();
    before.setQueryData(customerQueryKeys.detail('c1'), detail);
    await persistQueryClientSave({ queryClient: before, ...options });

    onlineManager.setOnline(false);
    const after = createAppQueryClient();
    await persistQueryClientRestore({ queryClient: after, ...options });
    const queryFn = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    const observer = new QueryObserver<typeof detail>(after, {
      queryKey: customerQueryKeys.detail('c1'),
      queryFn,
      staleTime: 0,
    });
    const unsubscribe = observer.subscribe(() => {});
    const result = observer.getCurrentResult();
    expect(result.data).toEqual(detail);
    expect(result.data!.books[0]!.soldAt).toBeInstanceOf(Date);
    expect(queryFn).not.toHaveBeenCalled();
    unsubscribe();
  });
});
