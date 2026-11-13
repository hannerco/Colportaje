// Programar, editar, corregir y cancelar abonos programados (HU-ABO-04). Borrar usa deletePayment (HU-ABO-02).
import type { CustomerAccount } from '@/domain/customer';
import type { COP } from '@/domain/money';
import { validateScheduled } from '@/domain/scheduled-payment';
import type { AppError } from '@/domain/shared/errors';
import { ok, type Result } from '@/domain/shared/result';
import { todayBogota, type LocalDate } from '@/domain/time';
import { runMutation } from '../../shared/run-mutation';
import { accountAndExcess, type AccountAndExcess, type CollectedPaymentsDeps } from './collected-payments';

export type ScheduleSingleInput = {
  readonly paymentId: string;
  readonly customerId: string;
  readonly agreedAmount: COP;
  readonly dueDate: LocalDate;
};

/**
 * Programa un abono suelto, aunque no haya libro (la cuenta trae `notices.noBook`). Disparador `form_edit`.
 * Errores: `OFFLINE`, `VALIDATION`, `CUSTOMER_ARCHIVED`, `CONFLICT`, `NOT_FOUND`, `NETWORK_ERROR`.
 */
export async function scheduleSinglePayment(
  deps: CollectedPaymentsDeps,
  input: ScheduleSingleInput,
): Promise<Result<AccountAndExcess, AppError>> {
  return runMutation(deps.connectivity, async () => {
    const valid = validateScheduled(input, todayBogota(deps.clock));
    if (!valid.ok) return valid;
    const saved = await deps.payments.scheduleSingle(input);
    if (!saved.ok) return saved;
    return accountAndExcess(deps, input.customerId, 'form_edit');
  });
}

/** Cambia el valor de un programado (cualquier entero > 0). Errores: + `PAYMENT_NOT_SCHEDULED`. */
export async function updateScheduledAmount(
  deps: CollectedPaymentsDeps,
  paymentId: string,
  agreedAmount: COP,
): Promise<Result<AccountAndExcess, AppError>> {
  return runMutation(deps.connectivity, async () => {
    const valid = validateScheduled({ agreedAmount }, todayBogota(deps.clock));
    if (!valid.ok) return valid;
    const saved = await deps.payments.updateScheduledAmount(paymentId, agreedAmount);
    if (!saved.ok) return saved;
    return accountAndExcess(deps, saved.value.customerId, 'form_edit');
  });
}

/**
 * Corrige la fecha de un programado durante la creación del cliente: mueve solo ese abono, también su
 * fecha original, sin prórroga (R3). Errores: `OFFLINE`, `VALIDATION`, `PAYMENT_NOT_SCHEDULED`, `NOT_FOUND`.
 */
export async function correctScheduledDate(
  deps: CollectedPaymentsDeps,
  paymentId: string,
  dueDate: LocalDate,
): Promise<Result<void, AppError>> {
  return runMutation(deps.connectivity, async () => {
    const valid = validateScheduled({ dueDate }, todayBogota(deps.clock));
    if (!valid.ok) return valid;
    const saved = await deps.payments.correctScheduledDate(paymentId, dueDate);
    return saved.ok ? ok(undefined) : saved;
  });
}

/** Cancela programados (motivo manual): quedan en Cancelados y no cuentan en nada (R4). */
export async function cancelScheduledPayments(
  deps: CollectedPaymentsDeps,
  paymentIds: readonly string[],
): Promise<Result<{ account: CustomerAccount }, AppError>> {
  return runMutation(deps.connectivity, async () => {
    const saved = await deps.payments.cancelScheduled(paymentIds);
    if (!saved.ok) return saved;
    const after = await accountAndExcess(deps, saved.value.customerId, 'form_edit');
    return after.ok ? ok({ account: after.value.account }) : after;
  });
}
