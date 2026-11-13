'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ExcessChoice, ExcessTrigger } from '@/domain/schedule-excess';
import type { LocalDate } from '@/domain/time';
import { systemClock } from '@/lib/clock';
import { useRepositories } from '../shared/repositories-provider';
import { resolveScheduleExcess } from './use-cases/resolve-schedule-excess';
import {
  deletePayment,
  registerCollectedPayment,
  setCreationDownPayment,
  updateCollectedPayment,
  type RegisterCollectedInput,
  type SetCreationDownPaymentInput,
  type UpdateCollectedPatch,
} from './use-cases/collected-payments';
import { applyPaymentPlan, type ApplyPaymentPlanInput } from './use-cases/payment-plan';
import {
  cancelScheduledPayments,
  correctScheduledDate,
  scheduleSinglePayment,
  updateScheduledAmount,
  type ScheduleSingleInput,
} from './use-cases/scheduled-payments';

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

/** Mutación de cobros que, al terminar bien, refresca abonos, clientes y Dinero. */
function useCollectedMutation<TInput, TResult extends { ok: boolean }>(
  run: (deps: Parameters<typeof setCreationDownPayment>[0], input: TInput) => Promise<TResult>,
) {
  const { payments, customers, connectivity } = useRepositories();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: TInput) => run({ payments, customers, connectivity, clock: systemClock }, input),
    onSuccess: (result) => {
      if (!result.ok) return;
      for (const queryKey of AFFECTED_ROOTS) void queryClient.invalidateQueries({ queryKey });
    },
  });
  return { mutate: mutation.mutateAsync, isPending: mutation.isPending };
}

/** Cuota inicial de la ficha nueva (HU-ABO-02): 0 o vacío la borra. Devuelve cuenta y franja de sobrante. */
export function useSetCreationDownPayment() {
  const { mutate, isPending } = useCollectedMutation((deps, input: SetCreationDownPaymentInput) =>
    setCreationDownPayment(deps, input),
  );
  return { setCreationDownPayment: mutate, isPending };
}

/** "Registrar abono" en un cliente guardado: otra cuota inicial o un abono extra (modal de sobrante). */
export function useRegisterCollectedPayment() {
  const { mutate, isPending } = useCollectedMutation((deps, input: RegisterCollectedInput) =>
    registerCollectedPayment(deps, input),
  );
  return { registerCollectedPayment: mutate, isPending };
}

/** Corrige un cobro (valor, fecha real o método). */
export function useUpdateCollectedPayment() {
  const { mutate, isPending } = useCollectedMutation(
    (deps, input: { paymentId: string; patch: UpdateCollectedPatch }) =>
      updateCollectedPayment(deps, input.paymentId, input.patch),
  );
  return { updateCollectedPayment: mutate, isPending };
}

/** Borra (lógico) un abono cobrado o por cobrar. */
export function useDeletePayment() {
  const { mutate, isPending } = useCollectedMutation((deps, paymentId: string) =>
    deletePayment(deps, paymentId),
  );
  return { deletePayment: mutate, isPending };
}

/**
 * Aplica el plan de abonos (HU-ABO-03): en la ficha nueva reemplaza los programados (`replace_all`); en un
 * cliente guardado reparte solo lo sin programar (`unscheduled_only`). Devuelve la cuenta recalculada.
 */
export function useApplyPaymentPlan() {
  const { mutate, isPending } = useCollectedMutation((deps, input: ApplyPaymentPlanInput) =>
    applyPaymentPlan(deps, input),
  );
  return { applyPaymentPlan: mutate, isPending };
}

/** Programa un abono suelto (HU-ABO-04): siempre se puede, aunque el cliente no tenga libro. */
export function useScheduleSinglePayment() {
  const { mutate, isPending } = useCollectedMutation((deps, input: ScheduleSingleInput) =>
    scheduleSinglePayment(deps, input),
  );
  return { scheduleSinglePayment: mutate, isPending };
}

/** Cambia el valor de un abono programado (cualquier entero > 0). */
export function useUpdateScheduledAmount() {
  const { mutate, isPending } = useCollectedMutation(
    (deps, input: { paymentId: string; agreedAmount: number }) =>
      updateScheduledAmount(deps, input.paymentId, input.agreedAmount),
  );
  return { updateScheduledAmount: mutate, isPending };
}

/** Corrige la fecha de un programado (solo durante la creación del cliente): mueve solo ese abono. */
export function useCorrectScheduledDate() {
  const { mutate, isPending } = useCollectedMutation(
    (deps, input: { paymentId: string; dueDate: LocalDate }) =>
      correctScheduledDate(deps, input.paymentId, input.dueDate),
  );
  return { correctScheduledDate: mutate, isPending };
}

/** Cancela abonos programados (quedan en Cancelados, motivo manual). */
export function useCancelScheduledPayments() {
  const { mutate, isPending } = useCollectedMutation((deps, paymentIds: readonly string[]) =>
    cancelScheduledPayments(deps, paymentIds),
  );
  return { cancelScheduledPayments: mutate, isPending };
}
