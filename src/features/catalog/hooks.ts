'use client';

import { useQuery } from '@tanstack/react-query';
import { unwrap } from '../shared/app-failure';
import { useRepositories } from '../shared/repositories-provider';

export const catalogQueryKeys = {
  all: ['catalog'] as const,
  active: ['catalog', 'active'] as const,
  byIds: (ids: readonly string[]) => ['catalog', 'by-ids', [...ids].sort()] as const,
};

/** Títulos activos ordenados por categoría y nombre (HU-BASE-04). */
export function useActiveTitles() {
  const { titles } = useRepositories();
  return useQuery({
    queryKey: catalogQueryKeys.active,
    queryFn: async () => unwrap(await titles.listActive()),
  });
}

/** Títulos por id, incluidos los desactivados (para mostrar ejemplares de títulos desactivados). */
export function useTitlesByIds(ids: readonly string[]) {
  const { titles } = useRepositories();
  return useQuery({
    queryKey: catalogQueryKeys.byIds(ids),
    queryFn: async () => unwrap(await titles.getMany(ids)),
    enabled: ids.length > 0,
  });
}
