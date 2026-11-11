import { validationError, type AppError } from './shared/errors';
import { err, ok, type Result } from './shared/result';

/** Pesos colombianos, siempre enteros (AGENTS.md: "COP enteros"). */
export type COP = number;

/** Un monto válido: entero seguro y no negativo. */
export const isValidCOP = (n: number): boolean => Number.isSafeInteger(n) && n >= 0;

const MINUS_SIGN = '−';

const groupThousands = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** `1250000` → `"$1.250.000"`; `-5000` → `"−$5.000"`. */
export const formatCOP = (n: COP): string => {
  if (!Number.isSafeInteger(n)) throw new RangeError(`formatCOP espera un entero, recibió ${n}`);
  return n < 0 ? `${MINUS_SIGN}$${groupThousands(-n)}` : `$${groupThousands(n)}`;
};

// Solo dígitos, o dígitos agrupados de a tres con punto. "$" opcional al inicio.
const COP_PATTERN = /^\$?\s*(\d{1,3}(?:\.\d{3})+|\d+)$/;

/** Interpreta lo que escribe el usuario: `"1.250.000"`, `"$1.250.000"` o `"1250000"`. */
export const parseCOP = (text: string): Result<COP, AppError> => {
  const match = COP_PATTERN.exec(text.trim());
  const digits = match?.[1]?.replaceAll('.', '');
  const value = digits === undefined ? Number.NaN : Number(digits);
  return isValidCOP(value) ? ok(value) : err(validationError('amount', { input: text }));
};
