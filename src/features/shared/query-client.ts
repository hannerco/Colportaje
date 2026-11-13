import { QueryClient } from '@tanstack/react-query';
import { AppFailure } from './app-failure';

/**
 * Cuánto tiempo se conservan las lecturas guardadas para consultar sin conexión (BR-GEN-08).
 * El colportor puede pasar días sin señal; pasado este plazo hay que volver a sincronizar.
 */
export const OFFLINE_CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** Solo se reintentan solas las lecturas que fallaron por red (no las de negocio, como NOT_FOUND). */
const shouldRetry = (failureCount: number, error: unknown): boolean =>
  failureCount < 2 && (!(error instanceof AppFailure) || error.error.retryable);

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Para persistir, una lectura debe vivir en memoria al menos lo mismo que en disco.
        gcTime: OFFLINE_CACHE_MAX_AGE_MS,
        staleTime: 30_000,
        retry: shouldRetry,
      },
    },
  });
}
