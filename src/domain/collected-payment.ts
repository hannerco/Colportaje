// Cuota inicial, abono extra y corrección de cobros (HU-ABO-02, BR-PAY-01/03/04/10/11).
import { businessConfig } from './config/business-config';
import { isValidCOP, type COP } from './money';
import type { PayMethod } from './payment';
import { validationError, type AppError } from './shared/errors';
import { err, ok, type Result } from './shared/result';
import type { LocalDate } from './time';

export const COLLECTED_PAYMENT_ERROR_CODES = { PAYMENT_LOCKED: 'PAYMENT_LOCKED' } as const;

/** BR-PAY-04: Transferencia, siempre (ronda 26). */
export const DEFAULT_PAY_METHOD = businessConfig.defaultPaymentMethod as PayMethod;

/** R1: el valor real es un entero > 0 y la fecha real no es futura. Errores: `VALIDATION` (`paidAmount`, `paidAt`). */
export const validateCollected = (
  input: { readonly paidAmount?: COP; readonly paidAt?: LocalDate },
  today: LocalDate,
): Result<void, AppError> => {
  if (input.paidAmount !== undefined && (!isValidCOP(input.paidAmount) || input.paidAmount === 0)) {
    return err(validationError('paidAmount'));
  }
  if (input.paidAt !== undefined && input.paidAt > today) return err(validationError('paidAt'));
  return ok(undefined);
};

/**
 * HU-ABO-09 R3: la fecha de la cuota inicial de la ficha nueva no es futura (Bogotá); pasada sí (ADR-0049).
 * Errores: `VALIDATION` (`paidOn`).
 */
export const validateDownPaymentDate = (paidOn: LocalDate, today: LocalDate): Result<LocalDate, AppError> =>
  paidOn > today ? err(validationError('paidOn')) : ok(paidOn);

/**
 * Cuota inicial de la ficha nueva: vacío o 0 la borra; un entero > 0 la crea o actualiza (ronda 26).
 * Devuelve el valor a guardar (`0` = borrar). Errores: `VALIDATION` (`paidAmount`).
 */
export const creationDownPaymentAmount = (amount: COP | null | undefined): Result<COP, AppError> => {
  if (amount === null || amount === undefined || amount === 0) return ok(0);
  return isValidCOP(amount) ? ok(amount) : err(validationError('paidAmount'));
};

/**
 * BR-PAY-07 (HU-ABO-06 R2): lo que falta cuando se paga menos de lo acordado; `null` si pagó lo acordado o
 * más. El faltante queda en el saldo (derivado) y la app solo SUGIERE programarlo; nunca lo crea.
 */
export const collectShortfall = (agreedAmount: COP, paidAmount: COP): COP | null =>
  paidAmount < agreedAmount ? agreedAmount - paidAmount : null;

/** R3 (AF-21): solo un pago mayor que lo acordado evalúa abonos que no cuadran (disparador `overpayment`). */
export const isOverpayment = (agreedAmount: COP, paidAmount: COP): boolean => paidAmount > agreedAmount;
