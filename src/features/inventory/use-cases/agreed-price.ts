// Precio acordado de un ejemplar vendido (HU-INV-06, BR-COPY-07, BR-PAY-13, AF-29, AF-30).
import { evaluatePriceChange, validateAgreedPrice } from '@/domain/agreed-price';
import { computeCustomerAccount, type CustomerAccount } from '@/domain/customer';
import { scheduledForExcess, type ExcessEvaluation } from '@/domain/schedule-excess';
import type { AppError } from '@/domain/shared/errors';
import { ok, type Result } from '@/domain/shared/result';
import { todayBogota, type Clock } from '@/domain/time';
import type { Connectivity, CopyRepository, CustomerRepository } from '@/repositories';
import { runMutation } from '../../shared/run-mutation';

export type AgreedPriceDeps = {
  readonly copies: CopyRepository;
  readonly customers: CustomerRepository;
  readonly connectivity: Connectivity;
  readonly clock: Clock;
};

export type AgreedPriceResult = { account: CustomerAccount; excess: ExcessEvaluation | null };

/** Guarda (`null` = restaurar al público) y trae la cuenta recalculada y, si el precio bajó, el sobrante. */
async function changePrice(
  deps: AgreedPriceDeps,
  copyId: string,
  price: number | null,
): Promise<Result<AgreedPriceResult, AppError>> {
  const changed = await deps.copies.updateAgreedPrice(copyId, price);
  if (!changed.ok) return changed;
  const data = await deps.customers.getAccountData(changed.value.customerId);
  if (!data.ok) return data;
  const account = computeCustomerAccount(data.value, todayBogota(deps.clock));
  return ok({
    account,
    excess: evaluatePriceChange(
      account,
      scheduledForExcess(data.value.payments),
      changed.value.previousPrice,
      changed.value.agreedPrice,
    ),
  });
}

/**
 * Cambia el precio acordado (entero ≥ 0, mayor o menor que el público). Si bajó y los programados exceden
 * lo que debe, `excess` trae la evaluación `price_decrease` (modal). Errores: `OFFLINE`, `VALIDATION`
 * (`price`), `COPY_NOT_SOLD`, `COPY_IS_MINIBOOK`, `NOT_FOUND`, `NETWORK_ERROR`.
 */
export async function updateAgreedPrice(
  deps: AgreedPriceDeps,
  copyId: string,
  price: number,
): Promise<Result<AgreedPriceResult, AppError>> {
  return runMutation(deps.connectivity, async () => {
    const valid = validateAgreedPrice(price);
    if (!valid.ok) return valid;
    return changePrice(deps, copyId, valid.value);
  });
}

/** "Restaurar": vuelve al precio público copiado del ejemplar. Mismos errores (sin `VALIDATION`). */
export async function restorePublicPrice(
  deps: AgreedPriceDeps,
  copyId: string,
): Promise<Result<AgreedPriceResult, AppError>> {
  return runMutation(deps.connectivity, () => changePrice(deps, copyId, null));
}
