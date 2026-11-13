'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { Instant } from '@/domain/time';
import { useRepositories } from '../shared/repositories-provider';
import { lastSyncedAtOf } from './connection-sync';

/**
 * `{ online, lastSyncedAt }` (HU-BASE-06). `lastSyncedAt` es la última lectura exitosa desde el servidor;
 * el front lo muestra con `formatTime` ("estás viendo los datos de las 9:40 p. m.").
 */
export function useConnection(): { online: boolean; lastSyncedAt: Instant | null } {
  const { connectivity } = useRepositories();
  const queryCache = useQueryClient().getQueryCache();

  const subscribeOnline = useCallback((notify: () => void) => connectivity.subscribe(notify), [connectivity]);
  const online = useSyncExternalStore(subscribeOnline, connectivity.isOnline, () => true);

  const subscribeCache = useCallback((notify: () => void) => queryCache.subscribe(notify), [queryCache]);
  const lastSyncedMs = useSyncExternalStore(
    subscribeCache,
    () => lastSyncedAtOf(queryCache),
    () => null,
  );

  const lastSyncedAt = useMemo(() => (lastSyncedMs === null ? null : new Date(lastSyncedMs)), [lastSyncedMs]);
  return { online, lastSyncedAt };
}
