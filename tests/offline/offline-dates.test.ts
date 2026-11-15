// SG-11 (hallado en HU-CLI-04): las fechas de las lecturas sobreviven a la caché guardada en IndexedDB, así
// que al reabrir la app sin conexión las listas se calculan igual que antes de cerrarla.
import 'fake-indexeddb/auto';
import { persistQueryClientRestore, persistQueryClientSave } from '@tanstack/react-query-persist-client';
import { describe, expect, it } from 'vitest';
import { CACHE_BUSTER, createIndexedDbPersister } from '@/adapters/browser/query-persister';
import { buildCustomerListView, DEFAULT_CUSTOMER_LIST_PARAMS } from '@/domain/customer-list';
import { localDate } from '@/domain/time';
import { customerQueryKeys } from '@/features/customers';
import type { CustomerListLoaded } from '@/features/customers';
import { createAppQueryClient, OFFLINE_CACHE_MAX_AGE_MS } from '@/features/shared/query-client';

let keyCounter = 0;
const options = (persister: ReturnType<typeof createIndexedDbPersister>) => ({
  persister,
  maxAge: OFFLINE_CACHE_MAX_AGE_MS,
  buster: CACHE_BUSTER,
});

/** Guarda `data` bajo `key`, "cierra" la app y la restaura en un cliente nuevo, como al reabrir sin red. */
const roundTrip = async <T>(key: readonly unknown[], data: T): Promise<T> => {
  const persister = createIndexedDbPersister(`cache-fechas-${++keyCounter}`);
  const before = createAppQueryClient();
  before.setQueryData(key, data);
  await persistQueryClientSave({ queryClient: before, ...options(persister) });
  const after = createAppQueryClient();
  await persistQueryClientRestore({ queryClient: after, ...options(persister) });
  return after.getQueryData<T>(key)!;
};

const loaded: CustomerListLoaded = {
  customers: [
    {
      id: 'c1',
      name: 'María Camila Henao',
      avatarEmoji: null,
      phone: '301 557 9032',
      info: null,
      address: null,
      createdAt: new Date('2026-10-01T15:00:00Z'),
      updatedAt: new Date('2026-11-02T20:30:00Z'),
      archived: false,
    },
  ],
  accounts: [
    {
      customerId: 'c1',
      soldCopies: [
        {
          copyId: 'k1',
          titleName: 'Las bellas historias de la Biblia',
          agreedPrice: 380_000,
          soldAt: new Date('2026-10-03T15:00:00Z'),
        },
      ],
      payments: [],
    },
  ],
};

describe('fechas en la caché sin conexión (SG-11)', () => {
  it('la lista de clientes restaurada se calcula igual que antes de cerrar la app', async () => {
    const restored = await roundTrip(customerQueryKeys.list, loaded);
    expect(restored.customers[0]!.createdAt).toBeInstanceOf(Date);
    expect(restored.accounts[0]!.soldCopies[0]!.soldAt).toBeInstanceOf(Date);
    const params = { ...DEFAULT_CUSTOMER_LIST_PARAMS, sort: { key: 'modified', dir: 'desc' } as const };
    const today = localDate('2026-11-08');
    expect(buildCustomerListView(restored.customers, restored.accounts, params, today)).toEqual(
      buildCustomerListView(loaded.customers, loaded.accounts, params, today),
    );
  });

  it('conserva fechas anidadas, nulas e inválidas, y no confunde un texto con forma de fecha', async () => {
    const data = {
      at: new Date('2026-11-08T02:40:00Z'),
      nested: [{ when: new Date(0) }, { when: null }],
      invalid: new Date(Number.NaN),
      text: '2026-11-08T02:40:00.000Z',
      tagLike: { $date: 'no es una fecha marcada' },
    };
    const restored = await roundTrip(['fechas'], data);
    expect(restored.at).toEqual(data.at);
    expect(restored.nested[0]!.when).toEqual(new Date(0));
    expect(restored.nested[1]!.when).toBeNull();
    expect(restored.invalid).toBeInstanceOf(Date);
    expect(Number.isNaN(restored.invalid.getTime())).toBe(true);
    expect(restored.text).toBe('2026-11-08T02:40:00.000Z');
    expect(restored.tagLike).toEqual({ $date: 'no es una fecha marcada' });
  });

  it('una caché guardada con el formato anterior (v1, fechas como texto) se descarta', async () => {
    expect(CACHE_BUSTER).toBe('v2');
    const persister = createIndexedDbPersister(`cache-fechas-${++keyCounter}`);
    const old = createAppQueryClient();
    old.setQueryData(customerQueryKeys.list, loaded);
    await persistQueryClientSave({ queryClient: old, ...options(persister), buster: 'v1' });
    const after = createAppQueryClient();
    await persistQueryClientRestore({ queryClient: after, ...options(persister) });
    expect(after.getQueryData(customerQueryKeys.list)).toBeUndefined();
  });
});
