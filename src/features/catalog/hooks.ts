'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TitleFieldsDraft } from '@/domain/title';
import { unwrap } from '../shared/app-failure';
import { useRepositories } from '../shared/repositories-provider';
import { createTitle, removeTitleCover, setTitleCover, updateTitle } from './use-cases/manage-titles';

export const catalogQueryKeys = {
  all: ['catalog'] as const,
  active: ['catalog', 'active'] as const,
  /** Admin · Catálogo: todos, activos e inactivos. */
  admin: ['catalog', 'admin'] as const,
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

/** Admin · Catálogo (HU-PAN-ADM-01): todos los títulos, activos e inactivos. */
export function useAllTitles() {
  const { titles } = useRepositories();
  return useQuery({
    queryKey: catalogQueryKeys.admin,
    queryFn: async () => unwrap(await titles.listAll()),
  });
}

/**
 * Tras escribir el catálogo se vuelven a leer el catálogo y el inventario (nombres, portadas y precios de
 * referencia en Libros en físico y Agregar).
 */
function useInvalidateCatalog() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: catalogQueryKeys.all });
    void queryClient.invalidateQueries({ queryKey: ['inventory'] });
  };
}

/** Crea un título (Admin). Devuelve `Result`. */
export function useCreateTitle() {
  const { titles, connectivity } = useRepositories();
  const invalidate = useInvalidateCatalog();
  const mutation = useMutation({
    mutationFn: (input: { id: string; fields: TitleFieldsDraft }) =>
      createTitle({ titles, connectivity }, input),
    onSuccess: (result) => {
      if (result.ok) invalidate();
    },
  });
  return { createTitle: mutation.mutateAsync, isPending: mutation.isPending };
}

/** Cambia los datos de un título (incluido activarlo o desactivarlo). Devuelve `Result`. */
export function useUpdateTitle() {
  const { titles, connectivity } = useRepositories();
  const invalidate = useInvalidateCatalog();
  const mutation = useMutation({
    mutationFn: (input: { id: string; fields: TitleFieldsDraft }) =>
      updateTitle({ titles, connectivity }, input),
    onSuccess: (result) => {
      if (result.ok) invalidate();
    },
  });
  return { updateTitle: mutation.mutateAsync, isPending: mutation.isPending };
}

/** Pone o cambia la portada de un título (DT-10). Devuelve `Result`. */
export function useSetTitleCover() {
  const { titles, connectivity, imageCodec } = useRepositories();
  const invalidate = useInvalidateCatalog();
  const mutation = useMutation({
    mutationFn: (input: { titleId: string; coverId: string; file: Blob }) =>
      setTitleCover({ titles, connectivity, imageCodec }, input),
    onSuccess: (result) => {
      if (result.ok) invalidate();
    },
  });
  return { setTitleCover: mutation.mutateAsync, isPending: mutation.isPending };
}

/** Quita la portada de un título. Devuelve `Result`. */
export function useRemoveTitleCover() {
  const { titles, connectivity } = useRepositories();
  const invalidate = useInvalidateCatalog();
  const mutation = useMutation({
    mutationFn: (titleId: string) => removeTitleCover({ titles, connectivity }, titleId),
    onSuccess: (result) => {
      if (result.ok) invalidate();
    },
  });
  return { removeTitleCover: mutation.mutateAsync, isPending: mutation.isPending };
}
