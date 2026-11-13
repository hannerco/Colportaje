'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { findPossibleDuplicates, type CustomerPatch } from '@/domain/customer-data';
import { unwrap } from '../shared/app-failure';
import { useRepositories } from '../shared/repositories-provider';
import { createCustomer, updateCustomer } from './use-cases/customer-data';

export const customerQueryKeys = {
  all: ['customers'] as const,
  duplicateCandidates: ['customers', 'duplicate-candidates'] as const,
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
