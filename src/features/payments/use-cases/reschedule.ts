// Prórroga de un abono programado (HU-ABO-05, BR-PAY-06).
import { validateReschedule } from '@/domain/reschedule';
import type { AppError } from '@/domain/shared/errors';
import type { Result } from '@/domain/shared/result';
import type { LocalDate } from '@/domain/time';
import { runMutation } from '../../shared/run-mutation';
import type { CollectedPaymentsDeps } from './collected-payments';

export type RescheduleInput = {
  readonly newDueDate: LocalDate;
  /** La fecha que tiene hoy el abono, si la app la conoce. */
  readonly currentDueDate?: LocalDate;
  readonly note?: string | null;
};

/**
 * Aplazar (ronda 38): cualquier fecha distinta de la actual. Errores: `OFFLINE`, `VALIDATION` (misma fecha),
 * `PAYMENT_NOT_SCHEDULED`, `CUSTOMER_ARCHIVED`, `NOT_FOUND`, `NETWORK_ERROR`.
 */
export async function reschedulePayment(
  deps: Pick<CollectedPaymentsDeps, 'payments' | 'connectivity'>,
  paymentId: string,
  input: RescheduleInput,
): Promise<
  Result<{ moved: { paymentId: string; previousDueDate: LocalDate; newDueDate: LocalDate }[] }, AppError>
> {
  return runMutation(deps.connectivity, async () => {
    const valid = validateReschedule(input);
    if (!valid.ok) return valid;
    return deps.payments.reschedule(paymentId, {
      newDueDate: input.newDueDate,
      note: input.note ?? null,
    });
  });
}
