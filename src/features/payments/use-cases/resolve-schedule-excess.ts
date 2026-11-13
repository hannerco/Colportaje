import { computeCustomerAccount, type CustomerAccount } from '@/domain/customer';
import type { ExcessChoice, ExcessTrigger } from '@/domain/schedule-excess';
import type { AppError } from '@/domain/shared/errors';
import { ok, type Result } from '@/domain/shared/result';
import { todayBogota, type Clock } from '@/domain/time';
import type { Connectivity, CustomerRepository, PaymentRepository } from '@/repositories';
import { runMutation } from '../../shared/run-mutation';

export type ResolveScheduleExcessDeps = {
  readonly payments: PaymentRepository;
  readonly customers: CustomerRepository;
  readonly connectivity: Connectivity;
  readonly clock: Clock;
};

/**
 * Aplica la opción elegida ante abonos que no cuadran (HU-ABO-07, BR-PAY-13) y devuelve la cuenta
 * recalculada. "Dejar como está" no guarda nada: la cuenta sigue con `notices.excess` (CA-6).
 * Errores: `OFFLINE` (sin intentar), `NO_EXCESS`, `LEAVE_NOT_ALLOWED`, `CONFLICT`, `NOT_FOUND`,
 * `VALIDATION`, `NETWORK_ERROR`.
 */
export async function resolveScheduleExcess(
  deps: ResolveScheduleExcessDeps,
  customerId: string,
  choice: ExcessChoice,
  trigger: ExcessTrigger,
): Promise<Result<{ account: CustomerAccount }, AppError>> {
  return runMutation(deps.connectivity, async () => {
    const resolved = await deps.payments.resolveScheduleExcess(customerId, choice, trigger);
    if (!resolved.ok) return resolved;
    const data = await deps.customers.getAccountData(customerId);
    if (!data.ok) return data;
    return ok({ account: computeCustomerAccount(data.value, todayBogota(deps.clock)) });
  });
}
