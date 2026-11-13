'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addCatalogGroups,
  batchLines,
  receivedDateOptions,
  type AddBatch,
  type AddCopiesInput,
} from '@/domain/add-batch';
import { todayBogota, type LocalDate } from '@/domain/time';
import { systemClock } from '@/lib/clock';
import { catalogQueryKeys } from '../catalog';
import { unwrap } from '../shared/app-failure';
import { useRepositories } from '../shared/repositories-provider';
import { addCopiesBatch } from './use-cases/add-copies-batch';

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

/**
 * Catálogo para "Agregar" (HU-INV-02): solo activos, agrupados en Culturales, Religiosos y Minibooks,
 * por nombre; la búsqueda filtra por nombre normalizado. Comparte la caché del catálogo (funciona sin conexión).
 */
export function useAddCatalog({ search = '' }: { search?: string } = {}) {
  const { titles } = useRepositories();
  return useQuery({
    queryKey: catalogQueryKeys.active,
    queryFn: async () => unwrap(await titles.listActive()),
    select: (data) => ({ groups: addCatalogGroups(data, search) }),
  });
}

/** Opciones del chip de fecha: Hoy, Ayer y Anteayer en Bogotá (AF-50). */
export const useReceivedDateOptions = () => receivedDateOptions(todayBogota(systemClock));

/**
 * Prepara la confirmación del lote: genera el `batchId` y un UUID por ejemplar. Se llama UNA vez al
 * abrir el Resumen y se guarda: reintentar con el mismo resultado no duplica (R6).
 */
export const prepareAddCopies = (batch: AddBatch, receivedAt: LocalDate): AddCopiesInput => ({
  batchId: crypto.randomUUID(),
  receivedAt,
  lines: batchLines(batch, () => crypto.randomUUID()),
});

/** "Agregar N": crea todo el lote o nada. Devuelve `Result`; al terminar bien invalida Inventario. */
export function useAddCopiesBatch() {
  const { copies, connectivity } = useRepositories();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: AddCopiesInput) =>
      addCopiesBatch({ copies, connectivity, clock: systemClock }, input),
    onSuccess: (result) => {
      if (result.ok) void queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.all });
    },
  });
  return { addCopiesBatch: mutation.mutateAsync, isPending: mutation.isPending };
}
