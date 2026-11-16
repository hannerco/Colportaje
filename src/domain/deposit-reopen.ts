// Reabrir un Abibono confirmado e historial (HU-DIN-07, BR-DEP-12, BR-AUD-01).
import { appError, type AppError } from './shared/errors';
import { err, ok, type Result } from './shared/result';
import type { Instant } from './time';

export const DEPOSIT_REOPEN_ERROR_CODES = {
  /** R1: el motivo debe tener texto. */
  REASON_REQUIRED: 'REASON_REQUIRED',
  /** R3: solo un Abibono confirmado se reabre. */
  DEPOSIT_NOT_CONFIRMED: 'DEPOSIT_NOT_CONFIRMED',
} as const;

/** Un cambio del historial del Abibono (`leader_deposit_event`), del más antiguo al más reciente. */
export type DepositEvent = {
  readonly type: 'confirmed' | 'reopened';
  /** Motivo al reabrir; `null` al confirmar. */
  readonly reason: string | null;
  readonly at: Instant;
};

/** R1: el motivo sin espacios sobrantes; vacío → `REASON_REQUIRED`. */
export const validateReopenReason = (reason: string | null): Result<string, AppError> => {
  const trimmed = reason?.trim() ?? '';
  return trimmed === '' ? err(appError(DEPOSIT_REOPEN_ERROR_CODES.REASON_REQUIRED)) : ok(trimmed);
};
