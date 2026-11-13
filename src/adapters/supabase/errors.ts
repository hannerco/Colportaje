import {
  isAuthError,
  isAuthRetryableFetchError,
  type AuthError,
  type PostgrestError,
} from '@supabase/supabase-js';
import { AUTH_ERROR_CODES } from '@/domain/auth';
import { appError, COMMON_ERROR_CODES, type AppError } from '@/domain/shared/errors';

/** Traduce un error de Supabase Auth a un `AppError`. */
export const mapAuthError = (error: AuthError): AppError => {
  if (isAuthRetryableFetchError(error)) return appError(COMMON_ERROR_CODES.NETWORK_ERROR);
  switch (error.code) {
    case 'invalid_credentials':
      return appError(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
    case 'user_banned':
      return appError(AUTH_ERROR_CODES.USER_INACTIVE);
    case 'session_expired':
    case 'session_not_found':
    case 'refresh_token_not_found':
      return appError(COMMON_ERROR_CODES.SESSION_EXPIRED);
  }
  if (error.status === undefined || error.status === 0 || error.status >= 500) {
    return appError(COMMON_ERROR_CODES.NETWORK_ERROR);
  }
  return appError('AUTH_FAILED', { code: error.code, status: error.status });
};

export const isMissingSessionError = (error: unknown): boolean =>
  isAuthError(error) && error.name === 'AuthSessionMissingError';

/**
 * Error de PostgREST: sin código es un fallo de red (la petición no llegó); con código es un error
 * inesperado del servidor (permisos, esquema…), que se lanza para que no pase desapercibido.
 */
export const mapPostgrestError = (error: PostgrestError): AppError => {
  if (!error.code) return appError(COMMON_ERROR_CODES.NETWORK_ERROR);
  throw new Error(`Error inesperado de la base de datos (${error.code}): ${error.message}`);
};

/**
 * Error de una función SQL (RPC). Las funciones de negocio lanzan `raise exception 'CODIGO: …'` con
 * `errcode = 'P0001'`; si `CODIGO` es uno de los esperados (`known`), se devuelve como `AppError` con
 * `details` = el `detail` de la excepción interpretado por `toDetails`. Lo demás sigue `mapPostgrestError`.
 */
export const mapRpcError = (
  error: PostgrestError,
  known: readonly string[],
  toDetails: (code: string, detail: string | null) => Readonly<Record<string, unknown>> | undefined = () =>
    undefined,
): AppError => {
  const code = error.code === 'P0001' ? /^([A-Z][A-Z_]*):/.exec(error.message)?.[1] : undefined;
  if (code !== undefined && known.includes(code))
    return appError(code, toDetails(code, error.details || null));
  return mapPostgrestError(error);
};

/** Error de Supabase Storage (forma común de StorageApiError y StorageUnknownError). */
type StorageErrorLike = { message: string; status?: number | undefined; statusCode?: string | undefined };

/** Traduce un error de Storage. Sin estado HTTP (no hubo respuesta) es un fallo de red reintentable (AF-92). */
export const mapStorageError = (error: StorageErrorLike): AppError => {
  const code = Number(error.statusCode ?? error.status);
  if (!Number.isFinite(code) || code === 0 || code >= 500) return appError(COMMON_ERROR_CODES.NETWORK_ERROR);
  if (code === 401 || code === 403) return appError(COMMON_ERROR_CODES.FORBIDDEN);
  if (code === 404) return appError(COMMON_ERROR_CODES.NOT_FOUND);
  if (code === 413 || code === 415)
    return appError(COMMON_ERROR_CODES.VALIDATION, { field: 'file', status: code });
  return appError('STORAGE_FAILED', { status: code, message: error.message });
};
