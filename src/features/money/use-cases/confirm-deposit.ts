// Confirmar, editar la nota y reabrir un Abibono (HU-DIN-05 y 07, BR-DEP-05/06/07/09/12, BR-PAY-10).
import { validateDepositDraft, type DepositDraftInput } from '@/domain/deposit-draft';
import { validateReopenReason } from '@/domain/deposit-reopen';
import type { AppError } from '@/domain/shared/errors';
import type { Result } from '@/domain/shared/result';
import type { Connectivity, MoneyRepository } from '@/repositories';
import { runMutation } from '../../shared/run-mutation';

type Deps = { readonly money: MoneyRepository; readonly connectivity: Connectivity };

/**
 * Guarda y confirma en una sola operación, desde un borrador o directamente desde la propuesta (con sus
 * `stagedReceipts`). Si falla cualquier validación no cambia nada (R2). Errores: `OFFLINE`, `VALIDATION`,
 * `TOTAL_ZERO`, `NOTE_REQUIRED`, `NO_RECEIPT` (`details.blockers` = todos los bloqueos), `PAYMENT_NOT_AVAILABLE`,
 * `DEPOSIT_NOT_DRAFT` (ya confirmado), `CONFLICT`, `NETWORK_ERROR`.
 */
export async function confirmDeposit(
  deps: Deps,
  input: DepositDraftInput,
): Promise<Result<{ depositId: string }, AppError>> {
  return runMutation(deps.connectivity, async () => {
    const valid = validateDepositDraft(input);
    if (!valid.ok) return valid;
    return deps.money.confirmDeposit(valid.value);
  });
}

/**
 * Nota de un borrador o de un confirmado; vacía = sin nota. En un confirmado no puede quedar vacía si la
 * diferencia no es 0 (I-27). Errores: `OFFLINE`, `NOTE_REQUIRED`, `NOT_FOUND`, `NETWORK_ERROR`.
 */
export async function updateDepositNote(
  deps: Deps,
  depositId: string,
  note: string | null,
): Promise<Result<void, AppError>> {
  const trimmed = note?.trim() ?? '';
  return runMutation(deps.connectivity, () =>
    deps.money.updateDepositNote(depositId, trimmed === '' ? null : trimmed),
  );
}

/**
 * Reabre un Abibono confirmado con un motivo (HU-DIN-07): vuelve a borrador (conserva su número) y sus abonos a
 * cobrados; después se corrige con `saveDepositDraft` y se confirma otra vez con `confirmDeposit`.
 * Errores: `OFFLINE`, `REASON_REQUIRED`, `DEPOSIT_NOT_CONFIRMED`, `NOT_FOUND`, `NETWORK_ERROR`.
 */
export async function reopenDeposit(
  deps: Deps,
  depositId: string,
  reason: string,
): Promise<Result<void, AppError>> {
  return runMutation(deps.connectivity, async () => {
    const valid = validateReopenReason(reason);
    if (!valid.ok) return valid;
    return deps.money.reopenDeposit(depositId, valid.value);
  });
}
