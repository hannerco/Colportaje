// Aplicar el plan de abonos (HU-ABO-03). El plan lo arma el dominio (buildPaymentPlan) para la vista previa;
// el servidor recalcula la base y valida el total antes de guardar (R4).
import type { CustomerAccount } from '@/domain/customer';
import type { COP } from '@/domain/money';
import type { PlanMode } from '@/domain/payment-plan';
import type { AppError } from '@/domain/shared/errors';
import { ok, type Result } from '@/domain/shared/result';
import type { LocalDate } from '@/domain/time';
import { runMutation } from '../../shared/run-mutation';
import { accountAndExcess, type CollectedPaymentsDeps } from './collected-payments';

export type ApplyPaymentPlanInput = {
  readonly customerId: string;
  readonly mode: PlanMode;
  /** Ids generados una vez (withPaymentIds): reintentar no duplica. */
  readonly items: readonly { paymentId: string; dueDate: LocalDate; amount: COP }[];
};

/**
 * Errores: `OFFLINE`, `PLAN_REQUIRES_BALANCE`, `PLAN_TOTAL_MISMATCH` (la cuenta cambió: rehacer el plan),
 * `VALIDATION`, `CUSTOMER_ARCHIVED`, `CONFLICT`, `NETWORK_ERROR`.
 */
export async function applyPaymentPlan(
  deps: CollectedPaymentsDeps,
  input: ApplyPaymentPlanInput,
): Promise<Result<{ account: CustomerAccount }, AppError>> {
  return runMutation(deps.connectivity, async () => {
    const applied = await deps.payments.applyPlan(input.customerId, input.mode, input.items);
    if (!applied.ok) return applied;
    const after = await accountAndExcess(deps, input.customerId, 'form_edit');
    if (!after.ok) return after;
    return ok({ account: after.value.account });
  });
}
