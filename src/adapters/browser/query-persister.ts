import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { Persister } from '@tanstack/react-query-persist-client';
import { del, get, set } from 'idb-keyval';
import type { OfflineCache } from '@/repositories';

/** Clave de la caché guardada. Cambiar `CACHE_BUSTER` descarta cachés con un formato viejo. */
export const CACHE_KEY = 'colportor-query-cache';
export const CACHE_BUSTER = 'v1';

/** Guarda las lecturas en IndexedDB para consultarlas sin conexión (ADR-0003, HU-BASE-06). */
export function createIndexedDbPersister(key = CACHE_KEY): Persister {
  return createAsyncStoragePersister({
    key,
    storage: {
      getItem: async (k) => (await get<string>(k)) ?? null,
      setItem: (k, value: string) => set(k, value),
      removeItem: (k) => del(k),
    },
    throttleTime: 1000,
  });
}

/** `OfflineCache` sobre el mismo persister que usa la app: borrar no espera al guardado limitado. */
export const offlineCacheFrom = (persister: Persister): OfflineCache => ({
  clear: async () => {
    await persister.removeClient();
  },
});
