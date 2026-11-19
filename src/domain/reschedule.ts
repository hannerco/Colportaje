// Prórroga de un abono (HU-ABO-05, BR-PAY-06, ADR-0033, OQ-31): más plazo, sin tocar la fecha original.
import { businessConfig } from './config/business-config';
import { appError, type AppError } from './shared/errors';
import { err, ok, type Result } from './shared/result';
import { addMonthsClamped, type LocalDate } from './time';

export const RESCHEDULE_ERROR_CODES = {
  DATE_NOT_LATER: 'DATE_NOT_LATER',
  RESCHEDULE_NEEDS_CONFIRMATION: 'RESCHEDULE_NEEDS_CONFIRMATION',
} as const;

/**
 * Fecha hasta la que no se pide confirmar: hoy + N meses calendario (OQ-31: 31/12 + 2 meses = 28/02; el
 * límite exacto se acepta sin confirmar).
 */
export const rescheduleConfirmLimit = (today: LocalDate): LocalDate =>
  addMonthsClamped(today, businessConfig.reschedule.confirmBeyondMonths);

/**
 * R2 / R3: la nueva fecha es posterior a la actual; puede quedar antes de hoy (HU-ABO-08 R2, ADR-0049). Si pasa
 * del límite (hoy + 2 meses) y no viene confirmada, `RESCHEDULE_NEEDS_CONFIRMATION` con las fechas a confirmar.
 */
export const validateReschedule = (input: {
  /** Si se conoce; la base vuelve a validarlo con la fecha vigente. */
  readonly currentDueDate?: LocalDate;
  readonly newDueDate: LocalDate;
  readonly today: LocalDate;
  readonly confirmed?: boolean;
}): Result<LocalDate, AppError> => {
  if (input.currentDueDate !== undefined && input.newDueDate <= input.currentDueDate) {
    return err(appError(RESCHEDULE_ERROR_CODES.DATE_NOT_LATER));
  }
  if (!input.confirmed && input.newDueDate > rescheduleConfirmLimit(input.today)) {
    return err(appError(RESCHEDULE_ERROR_CODES.RESCHEDULE_NEEDS_CONFIRMATION, { dates: [input.newDueDate] }));
  }
  return ok(input.newDueDate);
};
