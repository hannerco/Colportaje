import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { del, get, set } from 'idb-keyval';
import type { OfflineCache } from '@/repositories';

/** Clave de la caché guardada. Cambiar `CACHE_BUSTER` descarta cachés con un formato viejo. */
export const CACHE_KEY = 'colportor-query-cache';
/** v2: las fechas se guardan marcadas (SG-11); una caché v1 las tenía como texto y se descarta. */
export const CACHE_BUSTER = 'v2';

/** Marca con la que se guarda un `Date` (JSON no tiene fechas). */
const DATE_TAG = '$colportorDate';

/**
 * JSON que conserva las fechas (SG-11): cada `Date` se guarda como `{ "$colportorDate": "<ISO>" }` (o `null`
 * si la fecha es inválida) y se vuelve a convertir en `Date` al leer. Sin esto, al reabrir la app sin
 * conexión las fechas llegaban como texto y los cálculos de las listas fallaban.
 */
export const serializeCache = (client: PersistedClient): string =>
  JSON.stringify(client, function (this: Record<string, unknown>, key: string, value: unknown) {
    // `value` ya pasó por Date#toJSON; el original está en el objeto que lo contiene.
    const raw = this[key];
    if (raw instanceof Date) return { [DATE_TAG]: Number.isNaN(raw.getTime()) ? null : raw.toISOString() };
    return value;
  });

export const deserializeCache = (text: string): PersistedClient =>
  JSON.parse(text, (_key, value: unknown) => {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const keys = Object.keys(value);
      const tagged = (value as Record<string, unknown>)[DATE_TAG];
      if (keys.length === 1 && keys[0] === DATE_TAG && (tagged === null || typeof tagged === 'string'))
        return new Date(tagged ?? Number.NaN);
    }
    return value;
  }) as PersistedClient;

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
    serialize: serializeCache,
    deserialize: deserializeCache,
  });
}

/** `OfflineCache` sobre el mismo persister que usa la app: borrar no espera al guardado limitado. */
export const offlineCacheFrom = (persister: Persister): OfflineCache => ({
  clear: async () => {
    await persister.removeClient();
  },
});
