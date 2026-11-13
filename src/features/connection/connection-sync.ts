import { onlineManager, type QueryCache, type QueryClient } from '@tanstack/react-query';
import type { Connectivity } from '@/repositories';

/**
 * Momento de la última lectura exitosa desde el servidor (ms), o `null`.
 * Sale de la propia caché: las lecturas restauradas conservan su `dataUpdatedAt`,
 * así que el dato persiste entre sesiones sin guardarlo aparte (HU-BASE-06, CA-3).
 */
export const lastSyncedAtOf = (queryCache: QueryCache): number | null => {
  let latest = 0;
  for (const query of queryCache.getAll()) {
    if (query.state.status === 'success' && query.state.dataUpdatedAt > latest)
      latest = query.state.dataUpdatedAt;
  }
  return latest > 0 ? latest : null;
};

/**
 * Conecta TanStack Query con el estado real de la conexión:
 * - sin conexión las lecturas no fallan: se quedan con lo guardado (R2);
 * - al volver la conexión se revalidan todas las lecturas (R3, CA-4).
 * Devuelve la función para desconectar.
 */
export function startConnectionSync(queryClient: QueryClient, connectivity: Connectivity): () => void {
  onlineManager.setEventListener((setOnline) => connectivity.subscribe(setOnline));
  onlineManager.setOnline(connectivity.isOnline());
  const unsubscribe = connectivity.subscribe((online) => {
    if (online) void queryClient.invalidateQueries();
  });
  return () => {
    unsubscribe();
    onlineManager.setEventListener(() => undefined);
  };
}
