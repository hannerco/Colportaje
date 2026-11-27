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
        // Para persistir, una lectura debe vivir en memoria al menos lo mismo que en disco (30 días). No se puede
        // poner 30 días: pasa del máximo de setTimeout (~24,8 días), el temporizador se dispara de inmediato y las
        // lecturas recién restauradas sin conexión se borran antes de que una pantalla las lea. `Infinity` = nunca.
        gcTime: Infinity,
        // Toda pantalla pide sus datos de nuevo al abrirse (y al volver a la app): lo guardado se ve al instante y se
        // reemplaza en cuanto llega lo de Supabase. Antes la ficha se daba por fresca 30 minutos y un cambio hecho en
        // otro equipo (una factura, un abono) no se veía en ese rato, ni recargando. Sin conexión queda lo guardado.
        staleTime: 0,
        retry: shouldRetry,
      },
    },
  });
}
