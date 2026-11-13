// Programar, editar, corregir y cancelar abonos programados (HU-ABO-04, BR-PAY-06/11/15/16, ADR-0045/0047).
import { isValidCOP, type COP } from './money';
import { validationError, type AppError } from './shared/errors';
import { err, ok, type Result } from './shared/result';
import type { LocalDate } from './time';

export const SCHEDULED_PAYMENT_ERROR_CODES = { PAYMENT_NOT_SCHEDULED: 'PAYMENT_NOT_SCHEDULED' } as const;

/**
 * R1 / R2: valor entero > 0 (a mano cualquier entero, sin múltiplos de 1.000) y fecha no anterior a hoy
 * (BR-PAY-16). Errores: `VALIDATION` (`agreedAmount`, `dueDate`).
 */
export const validateScheduled = (
  input: { readonly agreedAmount?: COP; readonly dueDate?: LocalDate },
  today: LocalDate,
): Result<void, AppError> => {
  if (input.agreedAmount !== undefined && (!isValidCOP(input.agreedAmount) || input.agreedAmount === 0)) {
    return err(validationError('agreedAmount'));
  }
  if (input.dueDate !== undefined && input.dueDate < today) return err(validationError('dueDate'));
  return ok(undefined);
};
