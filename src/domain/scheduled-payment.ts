// Programar, editar, corregir y cancelar abonos programados (HU-ABO-04, BR-PAY-06/11/15/16, ADR-0045/0047).
import { isValidCOP, type COP } from './money';
import { validationError, type AppError } from './shared/errors';
import { err, ok, type Result } from './shared/result';
import type { LocalDate } from './time';

export const SCHEDULED_PAYMENT_ERROR_CODES = { PAYMENT_NOT_SCHEDULED: 'PAYMENT_NOT_SCHEDULED' } as const;

/**
 * R1 / R2: valor entero > 0 (a mano cualquier entero, sin múltiplos de 1.000). La fecha acordada puede ser
 * anterior a hoy: el abono nace vencido (HU-ABO-08, ADR-0049; el front avisa con `isPastDate`).
 * Errores: `VALIDATION` (`agreedAmount`).
 */
export const validateScheduled = (input: {
  readonly agreedAmount?: COP;
  readonly dueDate?: LocalDate;
}): Result<void, AppError> => {
  if (input.agreedAmount !== undefined && (!isValidCOP(input.agreedAmount) || input.agreedAmount === 0)) {
    return err(validationError('agreedAmount'));
  }
  return ok(undefined);
};
