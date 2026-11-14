// Cobrar un abono programado (HU-ABO-06, BR-PAY-04/05/07/13, AF-21/22/23).
import {
  collectShortfall,
  DEFAULT_PAY_METHOD,
  isOverpayment,
  validateCollected,
} from '@/domain/collected-payment';
import type { COP } from '@/domain/money';
import type { PayMethod } from '@/domain/payment';
import type { AppError } from '@/domain/shared/errors';
import { ok, type Result } from '@/domain/shared/result';
import { todayBogota, type LocalDate } from '@/domain/time';
import { runMutation } from '../../shared/run-mutation';
import { accountAndExcess, type AccountAndExcess, type CollectedPaymentsDeps } from './collected-payments';

export type CollectPaymentInput = {
  /** Por defecto, el valor acordado. */
  readonly paidAmount?: COP;
  /** Por defecto, hoy (Bogotá); no futura (AF-23). */
  readonly paidAt?: LocalDate;
  /** Por defecto, Transferencia (BR-PAY-04). */
  readonly method?: PayMethod;
};

export type CollectPaymentResult = AccountAndExcess & {
  /** Lo que faltó si pagó menos (R2): el front sugiere "Programar"; nunca se crea solo. */
  readonly shortfall: COP | null;
};

/**
 * Cobra un abono programado. Si pagó más de lo acordado, trae la evaluación de abonos que no cuadran con el
 * disparador `overpayment` (modal, desde el más próximo; R3); si no, `excess` es `null`.
 * Errores: `OFFLINE`, `VALIDATION` (`paidAmount`, `paidAt`), `PAYMENT_NOT_SCHEDULED`, `CUSTOMER_ARCHIVED`,
 * `NOT_FOUND`, `NETWORK_ERROR`.
 */
export async function collectPayment(
  deps: CollectedPaymentsDeps,
  paymentId: string,
  input: CollectPaymentInput = {},
): Promise<Result<CollectPaymentResult, AppError>> {
  return runMutation(deps.connectivity, async () => {
    const today = todayBogota(deps.clock);
    const paidAt = input.paidAt ?? today;
    const valid = validateCollected({ paidAmount: input.paidAmount, paidAt }, today);
    if (!valid.ok) return valid;
    const saved = await deps.payments.collect(paymentId, {
      paidAmount: input.paidAmount ?? null,
      paidAt,
      method: input.method ?? DEFAULT_PAY_METHOD,
    });
    if (!saved.ok) return saved;
    const { customerId, agreedAmount, paidAmount } = saved.value;
    const read = await accountAndExcess(deps, customerId, 'overpayment');
    if (!read.ok) return read;
    return ok({
      account: read.value.account,
      shortfall: collectShortfall(agreedAmount, paidAmount),
      excess: isOverpayment(agreedAmount, paidAmount) ? read.value.excess : null,
    });
  });
}
