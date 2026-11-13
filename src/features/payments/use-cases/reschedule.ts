// Prórroga de un abono programado (HU-ABO-05, BR-PAY-06).
import { validateReschedule } from '@/domain/reschedule';
import type { AppError } from '@/domain/shared/errors';
import type { Result } from '@/domain/shared/result';
import { todayBogota, type LocalDate } from '@/domain/time';
import { runMutation } from '../../shared/run-mutation';
import type { CollectedPaymentsDeps } from './collected-payments';

export type RescheduleInput = {
  readonly newDueDate: LocalDate;
  /** La fecha que tiene hoy el abono, si la app la conoce: así `DATE_NOT_LATER` no espera a la red. */
  readonly currentDueDate?: LocalDate;
  readonly note?: string | null;
  /** `true` cuando el usuario ya confirmó una fecha a más de 2 meses (R3). */
  readonly confirmed?: boolean;
};

/**
 * Errores: `OFFLINE`, `DATE_IN_PAST`, `DATE_NOT_LATER`, `RESCHEDULE_NEEDS_CONFIRMATION` (`details.dates`;
 * no guarda nada), `PAYMENT_NOT_SCHEDULED`, `CUSTOMER_ARCHIVED`, `NOT_FOUND`, `NETWORK_ERROR`.
 */
export async function reschedulePayment(
  deps: Pick<CollectedPaymentsDeps, 'payments' | 'connectivity' | 'clock'>,
  paymentId: string,
  input: RescheduleInput,
): Promise<
  Result<{ moved: { paymentId: string; previousDueDate: LocalDate; newDueDate: LocalDate }[] }, AppError>
> {
  return runMutation(deps.connectivity, async () => {
    const valid = validateReschedule({ ...input, today: todayBogota(deps.clock) });
    if (!valid.ok) return valid;
    return deps.payments.reschedule(paymentId, {
      newDueDate: input.newDueDate,
      note: input.note ?? null,
      confirmed: input.confirmed ?? false,
    });
  });
}
