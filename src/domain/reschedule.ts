// Aplazar un abono (HU-ABO-05, BR-PAY-06). Ronda 38 (ADR-0052): cualquier fecha distinta de la actual, antes o después
// y sin confirmar; los avisos los da `dateChangeNotes` (manual-schedule). La fecha original no cambia.
import { appError, type AppError } from './shared/errors';
import { err, ok, type Result } from './shared/result';
import type { LocalDate } from './time';

/** Solo se rechaza aplazar a la misma fecha (no cambiaría nada). */
export const validateReschedule = (input: {
  /** Si se conoce; la base vuelve a validarlo con la fecha vigente. */
  readonly currentDueDate?: LocalDate;
  readonly newDueDate: LocalDate;
}): Result<LocalDate, AppError> =>
  input.currentDueDate !== undefined && input.newDueDate === input.currentDueDate
    ? err(appError('VALIDATION', { field: 'newDueDate' }))
    : ok(input.newDueDate);
