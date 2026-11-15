// Precio acordado de un ejemplar vendido (HU-INV-06, BR-COPY-07, BR-PRC-01..03, BR-PAY-13, AF-29, AF-30).
import type { CustomerAccount } from './customer';
import { isValidCOP, type COP } from './money';
import { evaluateScheduleExcess, type ExcessEvaluation, type ExcessPayment } from './schedule-excess';
import { validationError, type AppError } from './shared/errors';
import { err, ok, type Result } from './shared/result';

/** R2: entero ≥ 0; puede ser mayor o menor que el público. Error: `VALIDATION` (`field: price`). */
export const validateAgreedPrice = (price: number): Result<COP, AppError> =>
  isValidCOP(price) ? ok(price) : err(validationError('price'));

/**
 * R4: solo si el precio **bajó** se revisan los abonos (disparador `price_decrease`: modal, desde el más
 * lejano). Subir el precio nunca genera sobrante: solo aumenta lo "sin programar" (AF-30).
 */
export const evaluatePriceChange = (
  account: CustomerAccount,
  scheduled: readonly ExcessPayment[],
  previousPrice: COP,
  newPrice: COP,
): ExcessEvaluation | null =>
  newPrice < previousPrice ? evaluateScheduleExcess(account, scheduled, 'price_decrease') : null;
