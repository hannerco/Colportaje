/**
 * Error que toda acción devuelve dentro de un `Result` (00-REGLAS-COMUNES §3).
 * El front traduce `code` a un texto en español; el back nunca devuelve textos de pantalla.
 */
export type AppError = {
  readonly code: string;
  readonly retryable: boolean;
  readonly details?: Readonly<Record<string, unknown>>;
};

/** Códigos comunes a todas las HU. Cada HU añade los suyos en SCREAMING_SNAKE_CASE. */
export const COMMON_ERROR_CODES = {
  OFFLINE: 'OFFLINE',
  NETWORK_ERROR: 'NETWORK_ERROR',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION: 'VALIDATION',
  CONFLICT: 'CONFLICT',
} as const;

export type CommonErrorCode = (typeof COMMON_ERROR_CODES)[keyof typeof COMMON_ERROR_CODES];

/** Solo los fallos de red se reintentan tal cual; los demás requieren otra acción del usuario. */
const RETRYABLE: ReadonlySet<string> = new Set([COMMON_ERROR_CODES.NETWORK_ERROR]);

export const appError = (code: string, details?: Readonly<Record<string, unknown>>): AppError =>
  details === undefined
    ? { code, retryable: RETRYABLE.has(code) }
    : { code, retryable: RETRYABLE.has(code), details };

/** `VALIDATION` con el campo que falló en `details.field`. */
export const validationError = (field: string, details?: Readonly<Record<string, unknown>>): AppError =>
  appError(COMMON_ERROR_CODES.VALIDATION, { ...details, field });
