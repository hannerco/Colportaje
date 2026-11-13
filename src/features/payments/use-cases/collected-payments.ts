// Cuota inicial, abono extra y corrección de cobros (HU-ABO-02). Cada acción devuelve la cuenta del cliente
// y la evaluación de abonos que no cuadran con el disparador que corresponde (R6, HU-ABO-07).
import { creationDownPaymentAmount, DEFAULT_PAY_METHOD, validateCollected } from '@/domain/collected-payment';
import { computeCustomerAccount, type CustomerAccount } from '@/domain/customer';
import type { COP } from '@/domain/money';
import type { PayMethod } from '@/domain/payment';
import {
  evaluateScheduleExcess,
  scheduledForExcess,
  type ExcessEvaluation,
  type ExcessTrigger,
} from '@/domain/schedule-excess';
import type { AppError } from '@/domain/shared/errors';
import { ok, type Result } from '@/domain/shared/result';
import { todayBogota, type Clock, type LocalDate } from '@/domain/time';
import type { Connectivity, CustomerRepository, PaymentRepository } from '@/repositories';
import { runMutation } from '../../shared/run-mutation';

export type CollectedPaymentsDeps = {
  readonly payments: PaymentRepository;
  readonly customers: CustomerRepository;
  readonly connectivity: Connectivity;
  readonly clock: Clock;
};

export type AccountAndExcess = { account: CustomerAccount; excess: ExcessEvaluation | null };

/** Relee la cuenta del cliente y evalúa el sobrante con `trigger`. */
export async function accountAndExcess(
  deps: Pick<CollectedPaymentsDeps, 'customers' | 'clock'>,
  customerId: string,
  trigger: ExcessTrigger,
): Promise<Result<AccountAndExcess, AppError>> {
  const data = await deps.customers.getAccountData(customerId);
  if (!data.ok) return data;
  const account = computeCustomerAccount(data.value, todayBogota(deps.clock));
  return ok({
    account,
    excess: evaluateScheduleExcess(account, scheduledForExcess(data.value.payments), trigger),
  });
}

export type SetCreationDownPaymentInput = {
  readonly paymentId: string;
  readonly customerId: string;
  readonly amount: COP | null;
  readonly method?: PayMethod;
};

/**
 * Cuota inicial de la ficha nueva (una sola): 0 o vacío la borra; > 0 la crea o actualiza. Durante la
 * creación el sobrante se muestra como franja (`form_edit`).
 */
export async function setCreationDownPayment(
  deps: CollectedPaymentsDeps,
  input: SetCreationDownPaymentInput,
): Promise<Result<AccountAndExcess, AppError>> {
  return runMutation(deps.connectivity, async () => {
    const amount = creationDownPaymentAmount(input.amount);
    if (!amount.ok) return amount;
    const saved = await deps.payments.setCreationDownPayment({
      paymentId: input.paymentId,
      customerId: input.customerId,
      amount: amount.value,
      method: input.method ?? DEFAULT_PAY_METHOD,
    });
    if (!saved.ok) return saved;
    return accountAndExcess(deps, input.customerId, 'form_edit');
  });
}

export type RegisterCollectedInput = {
  readonly paymentId: string;
  readonly customerId: string;
  readonly kind: 'down_payment' | 'extra';
  readonly paidAmount: COP;
  /** Por defecto, hoy (Bogotá). */
  readonly paidAt?: LocalDate;
  readonly method?: PayMethod;
};

/** "Registrar abono" en un cliente guardado (disparador `extra_payment`: modal). */
export async function registerCollectedPayment(
  deps: CollectedPaymentsDeps,
  input: RegisterCollectedInput,
): Promise<Result<AccountAndExcess, AppError>> {
  return runMutation(deps.connectivity, async () => {
    const paidAt = input.paidAt ?? todayBogota(deps.clock);
    const valid = validateCollected({ paidAmount: input.paidAmount, paidAt }, todayBogota(deps.clock));
    if (!valid.ok) return valid;
    const saved = await deps.payments.registerCollected({
      paymentId: input.paymentId,
      customerId: input.customerId,
      kind: input.kind,
      paidAmount: input.paidAmount,
      paidAt,
      method: input.method ?? DEFAULT_PAY_METHOD,
    });
    if (!saved.ok) return saved;
    return accountAndExcess(deps, input.customerId, 'extra_payment');
  });
}

export type UpdateCollectedPatch = {
  readonly paidAmount?: COP;
  readonly paidAt?: LocalDate;
  readonly method?: PayMethod;
};

/** Corrige un cobro (disparador `edit_collected`: franja). */
export async function updateCollectedPayment(
  deps: CollectedPaymentsDeps,
  paymentId: string,
  patch: UpdateCollectedPatch,
): Promise<Result<AccountAndExcess, AppError>> {
  return runMutation(deps.connectivity, async () => {
    const valid = validateCollected(patch, todayBogota(deps.clock));
    if (!valid.ok) return valid;
    const saved = await deps.payments.updateCollected(paymentId, patch);
    if (!saved.ok) return saved;
    return accountAndExcess(deps, saved.value.customerId, 'edit_collected');
  });
}

/**
 * Borra (lógico) un abono. Si era un cobro, el disparador es `delete_collected` (franja, OQ-36); si era un
 * programado, `form_edit` (borrar un programado nunca deja sobrante, solo lo reduce).
 */
export async function deletePayment(
  deps: CollectedPaymentsDeps,
  paymentId: string,
): Promise<Result<AccountAndExcess, AppError>> {
  return runMutation(deps.connectivity, async () => {
    const deleted = await deps.payments.delete(paymentId);
    if (!deleted.ok) return deleted;
    const trigger: ExcessTrigger =
      deleted.value.previousStatus === 'collected' ? 'delete_collected' : 'form_edit';
    return accountAndExcess(deps, deleted.value.customerId, trigger);
  });
}
