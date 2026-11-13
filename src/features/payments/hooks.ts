'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ExcessChoice, ExcessTrigger } from '@/domain/schedule-excess';
import { systemClock } from '@/lib/clock';
import { useRepositories } from '../shared/repositories-provider';
import { resolveScheduleExcess } from './use-cases/resolve-schedule-excess';

export const paymentQueryKeys = { all: ['payments'] as const };

/**
 * Lecturas que cambian con los abonos de un cliente: abonos, clientes (ficha y lista) y Dinero.
 * Las HU de esas lecturas usan estas raíces en sus claves.
 */
const AFFECTED_ROOTS = [['payments'], ['customers'], ['money']] as const;

/** Aplica "Recortar", "Cancelar los que marque" o "Dejar como está" (HU-ABO-07). Devuelve `Result`. */
export function useResolveScheduleExcess() {
  const { payments, customers, connectivity } = useRepositories();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: { customerId: string; choice: ExcessChoice; trigger: ExcessTrigger }) =>
      resolveScheduleExcess(
        { payments, customers, connectivity, clock: systemClock },
        input.customerId,
        input.choice,
        input.trigger,
      ),
    onSuccess: (result, input) => {
      // "Dejar como está" no cambia nada en la base.
      if (!result.ok || input.choice.action === 'leave') return;
      for (const queryKey of AFFECTED_ROOTS) void queryClient.invalidateQueries({ queryKey });
    },
  });
  return { resolveScheduleExcess: mutation.mutateAsync, isPending: mutation.isPending };
}
