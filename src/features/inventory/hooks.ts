'use client';

import { useQuery } from '@tanstack/react-query';
import { unwrap } from '../shared/app-failure';
import { useRepositories } from '../shared/repositories-provider';

export const inventoryQueryKeys = {
  all: ['inventory'] as const,
  copyHistory: (copyId: string) => ['inventory', 'copy-history', copyId] as const,
};

/** Historial de un ejemplar, del más reciente al más antiguo (HU-INV-01). */
export function useCopyHistory(copyId: string | null | undefined) {
  const { copies } = useRepositories();
  return useQuery({
    queryKey: inventoryQueryKeys.copyHistory(copyId ?? ''),
    queryFn: async () => unwrap(await copies.getHistory(copyId!)),
    enabled: Boolean(copyId),
  });
}
