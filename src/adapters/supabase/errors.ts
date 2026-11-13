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
