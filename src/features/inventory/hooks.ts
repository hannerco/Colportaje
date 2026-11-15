'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addCatalogGroups,
  batchLines,
  receivedDateOptions,
  type AddBatch,
  type AddCopiesInput,
} from '@/domain/add-batch';
import { buildCopiesListView, type CopiesListParams } from '@/domain/copies-list';
import { todayBogota, type LocalDate } from '@/domain/time';
import { systemClock } from '@/lib/clock';
import { catalogQueryKeys } from '../catalog';
import { unwrap } from '../shared/app-failure';
import { useRepositories } from '../shared/repositories-provider';
import { addCopiesBatch } from './use-cases/add-copies-batch';
import { loadCopiesListData } from './use-cases/copies-list';
import { loadCopyDetail, updateReceivedDate } from './use-cases/copy-detail';
import { restorePublicPrice, updateAgreedPrice } from './use-cases/agreed-price';
import { flagCopy, resolveCopyIssue, undoResolveCopyIssue } from './use-cases/copy-issue';
import type { IssueResolution } from '@/domain/copy-issue';
import { loadFlaggedCopies, loadInStockCopiesOfTitle, loadInStockSummary } from './use-cases/stock';

export const inventoryQueryKeys = {
  all: ['inventory'] as const,
  copyHistory: (copyId: string) => ['inventory', 'copy-history', copyId] as const,
  inStockSummary: ['inventory', 'in-stock-summary'] as const,
  inStockOfTitle: (titleId: string) => ['inventory', 'in-stock-of-title', titleId] as const,
  flagged: ['inventory', 'flagged'] as const,
  copiesList: ['inventory', 'copies-list'] as const,
  copyDetail: (copyId: string) => ['inventory', 'copy-detail', copyId] as const,
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

/** Libros en físico: conteo por título, minibooks aparte y "N por resolver" (HU-INV-03). Sin sumas de dinero. */
export function useInStockSummary() {
  const { copies, titles } = useRepositories();
  return useQuery({
    queryKey: inventoryQueryKeys.inStockSummary,
    queryFn: async () => unwrap(await loadInStockSummary({ copies, titles })),
  });
}

/** Un título abierto: sus ejemplares en físico, del recibido más antiguo al más nuevo (HU-INV-03). */
export function useInStockCopiesOfTitle(titleId: string | null | undefined) {
  const { copies, titles } = useRepositories();
  return useQuery({
    queryKey: inventoryQueryKeys.inStockOfTitle(titleId ?? ''),
    queryFn: async () => unwrap(await loadInStockCopiesOfTitle({ copies, titles }, titleId!)),
    enabled: Boolean(titleId),
  });
}

/** Por resolver: ejemplares con novedad, del más reciente al más antiguo (HU-INV-03, BR-COPY-10). */
export function useFlaggedCopies() {
  const { copies, titles } = useRepositories();
  return useQuery({
    queryKey: inventoryQueryKeys.flagged,
    queryFn: async () => unwrap(await loadFlaggedCopies({ copies, titles })),
  });
}

/**
 * Lista de ejemplares con vistas, conteos, filtro de estado, orden y búsqueda (HU-INV-04). Los datos se
 * leen una vez; cambiar de vista, filtro, orden o búsqueda no vuelve a la red.
 */
export function useCopiesList(params: CopiesListParams) {
  const { copies, titles, customers } = useRepositories();
  return useQuery({
    queryKey: inventoryQueryKeys.copiesList,
    queryFn: async () => unwrap(await loadCopiesListData({ copies, titles, customers })),
    select: (data) => buildCopiesListView(data.copies, data.titles, data.customers, params),
  });
}

/** Detalle de un ejemplar con historial e indicadores de acciones (HU-INV-05). */
export function useCopyDetail(copyId: string | null | undefined) {
  const { copies, titles, customers } = useRepositories();
  return useQuery({
    queryKey: inventoryQueryKeys.copyDetail(copyId ?? ''),
    queryFn: async () => unwrap(await loadCopyDetail({ copies, titles, customers }, copyId!)),
    enabled: Boolean(copyId),
  });
}

/** Cambia la fecha de recibido (discreto en el diseño). Devuelve `Result`; al terminar bien invalida Inventario. */
export function useUpdateReceivedDate() {
  const { copies, connectivity } = useRepositories();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: { copyId: string; date: LocalDate }) =>
      updateReceivedDate({ copies, connectivity, clock: systemClock }, input.copyId, input.date),
    onSuccess: (result) => {
      if (result.ok) void queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.all });
    },
  });
  return { updateReceivedDate: mutation.mutateAsync, isPending: mutation.isPending };
}

/** Lecturas que cambian con el precio acordado: inventario (detalle y lista), clientes, abonos y Dinero. */
const PRICE_AFFECTED_ROOTS = [['inventory'], ['customers'], ['payments'], ['money']] as const;

/**
 * Precio acordado de un ejemplar vendido (HU-INV-06): `updateAgreedPrice({ copyId, price })` y
 * `restorePublicPrice(copyId)`. Devuelven `Result` con la cuenta del cliente y el sobrante (`price_decrease`).
 */
export function useAgreedPrice() {
  const { copies, customers, connectivity } = useRepositories();
  const queryClient = useQueryClient();
  const deps = { copies, customers, connectivity, clock: systemClock };
  const onSuccess = (result: { ok: boolean }) => {
    if (!result.ok) return;
    for (const queryKey of PRICE_AFFECTED_ROOTS) void queryClient.invalidateQueries({ queryKey });
  };
  const update = useMutation({
    mutationFn: (input: { copyId: string; price: number }) =>
      updateAgreedPrice(deps, input.copyId, input.price),
    onSuccess,
  });
  const restore = useMutation({
    mutationFn: (copyId: string) => restorePublicPrice(deps, copyId),
    onSuccess,
  });
  return {
    updateAgreedPrice: update.mutateAsync,
    restorePublicPrice: restore.mutateAsync,
    isPending: update.isPending || restore.isPending,
  };
}

/**
 * Novedades de un ejemplar (HU-INV-07): `flagCopy({ copyId, note })`, `resolveCopyIssue({ copyId,
 * resolution, note? })` y `undoResolveCopyIssue(copyId)`. Devuelven `Result`; al terminar bien refrescan
 * Inventario (en físico, Por resolver, lista, detalle e historial).
 */
export function useCopyIssueActions() {
  const { copies, connectivity } = useRepositories();
  const queryClient = useQueryClient();
  const deps = { copies, connectivity };
  const onSuccess = (result: { ok: boolean }) => {
    if (result.ok) void queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.all });
  };
  const flag = useMutation({
    mutationFn: (input: { copyId: string; note: string }) => flagCopy(deps, input.copyId, input.note),
    onSuccess,
  });
  const resolve = useMutation({
    mutationFn: (input: { copyId: string; resolution: IssueResolution; note?: string | null }) =>
      resolveCopyIssue(deps, input.copyId, input.resolution, input.note),
    onSuccess,
  });
  const undo = useMutation({
    mutationFn: (copyId: string) => undoResolveCopyIssue(deps, copyId),
    onSuccess,
  });
  return {
    flagCopy: flag.mutateAsync,
    resolveCopyIssue: resolve.mutateAsync,
    undoResolveCopyIssue: undo.mutateAsync,
    isPending: flag.isPending || resolve.isPending || undo.isPending,
  };
}
