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

export const customerQueryKeys = {
  all: ['customers'] as const,
  duplicateCandidates: ['customers', 'duplicate-candidates'] as const,
  assignableCopies: ['customers', 'assignable-copies'] as const,
};

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
