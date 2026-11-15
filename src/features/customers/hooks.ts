'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { findPossibleDuplicates, type CustomerPatch } from '@/domain/customer-data';
import { unwrap } from '../shared/app-failure';
import { useRepositories } from '../shared/repositories-provider';
import { createCustomer, updateCustomer } from './use-cases/customer-data';
import {
  assignCopyToCustomer,
  loadAssignableData,
  removeCopyDuringCreation,
} from './use-cases/customer-books';
import { systemClock } from '@/lib/clock';
import { assignableCopies } from '@/domain/assignable-copies';
import { businessConfig } from '@/domain/config/business-config';
import { photoQueryKeys } from '../photos/hooks';
import {
  addCustomerInfoPhoto,
  deleteCustomerInfoPhoto,
  getPhotoUrl,
  listCustomerInfoPhotos,
} from './use-cases/customer-photos';
import {
  addInvoicePhoto,
  createInvoiceWithPhoto,
  deleteInvoicePhoto,
  listCustomerInvoices,
  updateInvoice,
} from './use-cases/customer-invoices';
import type { InvoicePatch } from '@/domain/invoice';
import { discardNewCustomer, getDiscardSummary } from './use-cases/customer-discard';

export const customerQueryKeys = {
  all: ['customers'] as const,
  duplicateCandidates: ['customers', 'duplicate-candidates'] as const,
  assignableCopies: ['customers', 'assignable-copies'] as const,
  infoPhotos: (customerId: string) => ['customers', 'info-photos', customerId] as const,
  photoUrl: (photoId: string) => ['customers', 'photo-url', photoId] as const,
  invoices: (customerId: string) => ['customers', 'invoices', customerId] as const,
  discardSummary: (customerId: string) => ['customers', 'discard-summary', customerId] as const,
};

/** Las URL firmadas caducan: las lecturas que las traen se refrescan a mitad de su vida. */
const signedUrlStaleMs = (businessConfig.photos.signedUrlSeconds * 1000) / 2;

/** Crea el cliente con su nombre (ficha viva, HU-CLI-02). Devuelve `Result`. */
export function useCreateCustomer() {
  const { customers, connectivity } = useRepositories();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: { id: string; name: string }) => createCustomer({ customers, connectivity }, input),
    onSuccess: (result) => {
      if (result.ok) void queryClient.invalidateQueries({ queryKey: customerQueryKeys.all });
    },
  });
  return { createCustomer: mutation.mutateAsync, isPending: mutation.isPending };
}

/** Guarda un dato de la ficha (nombre, teléfono, información, dirección, emoji o enlace de Maps). */
export function useUpdateCustomer() {
  const { customers, connectivity } = useRepositories();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: { id: string; patch: CustomerPatch }) =>
      updateCustomer({ customers, connectivity }, input.id, input.patch),
    onSuccess: (result) => {
      if (result.ok) void queryClient.invalidateQueries({ queryKey: customerQueryKeys.all });
    },
  });
  return { updateCustomer: mutation.mutateAsync, isPending: mutation.isPending };
}

/**
 * Posibles duplicados (aviso no bloqueante, BR-CUS-11). Lee una vez los clientes y compara en el
 * teléfono, así responde mientras se escribe y funciona sin conexión con lo último sincronizado.
 */
export function usePossibleDuplicates(query: {
  name?: string | null;
  phone?: string | null;
  excludeId?: string | null;
}) {
  const { customers } = useRepositories();
  const hasQuery = Boolean(query.name?.trim() || query.phone?.trim());
  return useQuery({
    queryKey: customerQueryKeys.duplicateCandidates,
    queryFn: async () => unwrap(await customers.listDuplicateCandidates()),
    select: (candidates) => findPossibleDuplicates(candidates, query),
    enabled: hasQuery,
  });
}

/** Lecturas que cambian cuando un libro entra o sale de un cliente: inventario, clientes, abonos y Dinero. */
const BOOK_AFFECTED_ROOTS = [['inventory'], ['customers'], ['payments'], ['money']] as const;

/**
 * Buscador "Agregar libro del inventario" (HU-CLI-09): cada ejemplar en físico de títulos que no son
 * minibook, por título y recibido más antiguo; busca por título o número exacto.
 */
export function useAssignableCopies({ search = '' }: { search?: string } = {}) {
  const { copies, titles } = useRepositories();
  return useQuery({
    queryKey: customerQueryKeys.assignableCopies,
    queryFn: async () => unwrap(await loadAssignableData({ copies, titles })),
    select: (data) => assignableCopies(data.copies, data.titles, search),
  });
}

/** Agrega (vende) un ejemplar al cliente. Devuelve `Result` con la cuenta recalculada. */
export function useAssignCopyToCustomer() {
  const { copies, customers, connectivity } = useRepositories();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: { copyId: string; customerId: string }) =>
      assignCopyToCustomer(
        { copies, customers, connectivity, clock: systemClock },
        input.copyId,
        input.customerId,
      ),
    onSuccess: (result) => {
      if (!result.ok) return;
      for (const queryKey of BOOK_AFFECTED_ROOTS) void queryClient.invalidateQueries({ queryKey });
    },
  });
  return { assignCopyToCustomer: mutation.mutateAsync, isPending: mutation.isPending };
}

/** Quita un libro mientras se crea el cliente (error de captura, AF-114). Trae la cuenta y la franja de sobrante. */
export function useRemoveCopyDuringCreation() {
  const { copies, customers, connectivity } = useRepositories();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (copyId: string) =>
      removeCopyDuringCreation({ copies, customers, connectivity, clock: systemClock }, copyId),
    onSuccess: (result) => {
      if (!result.ok) return;
      for (const queryKey of BOOK_AFFECTED_ROOTS) void queryClient.invalidateQueries({ queryKey });
    },
  });
  return { removeCopyDuringCreation: mutation.mutateAsync, isPending: mutation.isPending };
}

/** "Imágenes" del cliente (HU-CLI-07): `[{ photoId, thumbUrl, createdAt }]`, la más reciente primero. */
export function useCustomerInfoPhotos(customerId: string | null | undefined) {
  const { photos, storage } = useRepositories();
  return useQuery({
    queryKey: customerQueryKeys.infoPhotos(customerId ?? ''),
    queryFn: async () => unwrap(await listCustomerInfoPhotos({ photos, storage }, customerId!)),
    enabled: Boolean(customerId),
    staleTime: signedUrlStaleMs,
  });
}

/** URL firmada de la imagen completa de una foto (al abrirla). */
export function usePhotoUrl(photoId: string | null | undefined) {
  const { photos, storage } = useRepositories();
  return useQuery({
    queryKey: customerQueryKeys.photoUrl(photoId ?? ''),
    queryFn: async () => unwrap(await getPhotoUrl({ photos, storage }, photoId!)),
    enabled: Boolean(photoId),
    staleTime: signedUrlStaleMs,
  });
}

/** Agrega una foto de información (comprimir → subir → fila). Devuelve `Result`; reintentable con el mismo id. */
export function useAddCustomerInfoPhoto() {
  const repositories = useRepositories();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: { photoId: string; customerId: string; file: Blob }) =>
      addCustomerInfoPhoto(repositories, input),
    onSuccess: (result) => {
      if (!result.ok) return;
      void queryClient.invalidateQueries({ queryKey: customerQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: photoQueryKeys.usage });
    },
  });
  return { addCustomerInfoPhoto: mutation.mutateAsync, isPending: mutation.isPending };
}

/** Borra (lógico) una foto de información; se puede siempre. Devuelve `Result`. */
export function useDeleteCustomerInfoPhoto() {
  const { photos, connectivity } = useRepositories();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (photoId: string) => deleteCustomerInfoPhoto({ photos, connectivity }, photoId),
    onSuccess: (result) => {
      if (result.ok) void queryClient.invalidateQueries({ queryKey: customerQueryKeys.all });
    },
  });
  return { deleteCustomerInfoPhoto: mutation.mutateAsync, isPending: mutation.isPending };
}

/**
 * Facturas del cliente (HU-CLI-08): `[{ invoiceId, number, date, photos: [{ photoId, thumbUrl }] }]`, por
 * fecha descendente (sin fecha al final). La imagen completa se abre con `usePhotoUrl(photoId)`.
 */
export function useCustomerInvoices(customerId: string | null | undefined) {
  const { invoices, storage } = useRepositories();
  return useQuery({
    queryKey: customerQueryKeys.invoices(customerId ?? ''),
    queryFn: async () => unwrap(await listCustomerInvoices({ invoices, storage }, customerId!)),
    enabled: Boolean(customerId),
    staleTime: signedUrlStaleMs,
  });
}

/** Mutación de facturas que, al terminar bien, refresca clientes (ficha y lista) y el uso de fotos. */
function useInvoiceMutation<TInput, TResult extends { ok: boolean }>(
  run: (repositories: ReturnType<typeof useRepositories>, input: TInput) => Promise<TResult>,
) {
  const repositories = useRepositories();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: TInput) => run(repositories, input),
    onSuccess: (result) => {
      if (!result.ok) return;
      void queryClient.invalidateQueries({ queryKey: customerQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: photoQueryKeys.usage });
    },
  });
  return { mutate: mutation.mutateAsync, isPending: mutation.isPending };
}

/** Crea una factura con su primera foto (no hay factura sin foto). Devuelve `Result`. */
export function useCreateInvoiceWithPhoto() {
  const { mutate, isPending } = useInvoiceMutation(
    (repositories, input: { invoiceId: string; photoId: string; customerId: string; file: Blob }) =>
      createInvoiceWithPhoto(repositories, input),
  );
  return { createInvoiceWithPhoto: mutate, isPending };
}

/** Agrega otra foto a una factura. Devuelve `Result`. */
export function useAddInvoicePhoto() {
  const { mutate, isPending } = useInvoiceMutation(
    (repositories, input: { invoiceId: string; photoId: string; file: Blob }) =>
      addInvoicePhoto(repositories, input),
  );
  return { addInvoicePhoto: mutate, isPending };
}

/** Guarda el N.º o la fecha (vacía con `null`). Devuelve `Result`. */
export function useUpdateInvoice() {
  const { mutate, isPending } = useInvoiceMutation(
    (repositories, input: { invoiceId: string; patch: InvoicePatch }) =>
      updateInvoice(repositories, input.invoiceId, input.patch),
  );
  return { updateInvoice: mutate, isPending };
}

/** Borra una foto de factura; `invoiceDeleted` dice si era la última y la factura se fue con ella. */
export function useDeleteInvoicePhoto() {
  const { mutate, isPending } = useInvoiceMutation((repositories, photoId: string) =>
    deleteInvoicePhoto(repositories, photoId),
  );
  return { deleteInvoicePhoto: mutate, isPending };
}

/**
 * Resumen para la confirmación de "Descartar" (HU-CLI-03): `{ books, payments, invoices, photos,
 * blockedByDeposit }`. Siempre fresco: se pide al abrir la confirmación.
 */
export function useDiscardSummary(customerId: string | null | undefined) {
  const { customers } = useRepositories();
  return useQuery({
    queryKey: customerQueryKeys.discardSummary(customerId ?? ''),
    queryFn: async () => unwrap(await getDiscardSummary({ customers }, customerId!)),
    enabled: Boolean(customerId),
    staleTime: 0,
  });
}

/**
 * Descarta el cliente recién creado (solo durante la creación). Devuelve `Result`; al terminar bien refresca
 * inventario, clientes, abonos, Dinero y el uso de fotos.
 */
export function useDiscardNewCustomer() {
  const { customers, connectivity } = useRepositories();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (customerId: string) => discardNewCustomer({ customers, connectivity }, customerId),
    onSuccess: (result) => {
      if (!result.ok) return;
      for (const queryKey of BOOK_AFFECTED_ROOTS) void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({ queryKey: photoQueryKeys.usage });
    },
  });
  return { discardNewCustomer: mutation.mutateAsync, isPending: mutation.isPending };
}
