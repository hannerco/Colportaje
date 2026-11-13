import { appError, COMMON_ERROR_CODES, type AppError } from '@/domain/shared/errors';
import { err, type Result } from '@/domain/shared/result';
import type { Connectivity } from '@/repositories';

/** Un fallo de red lanzado por `fetch` (la petición no llegó o la respuesta se perdió). */
export const isNetworkFailure = (error: unknown): boolean =>
  error instanceof TypeError ||
  (error instanceof Error && /fetch failed|failed to fetch|network|load failed/i.test(error.message));

/**
 * Envoltorio que usa toda acción (HU-BASE-06):
 * - sin conexión devuelve `OFFLINE` **sin ejecutar** `fn` (R1, BR-GEN-08);
 * - si la red falla a mitad, devuelve `NETWORK_ERROR` reintentable. Reintentar con los mismos IDs
 *   no duplica nada porque cada acción es idempotente (R4, AF-91).
 * Otros errores inesperados se relanzan.
 */
export async function runMutation<T>(
  connectivity: Connectivity,
  fn: () => Promise<Result<T, AppError>>,
): Promise<Result<T, AppError>> {
  if (!connectivity.isOnline()) return err(appError(COMMON_ERROR_CODES.OFFLINE));
  try {
    return await fn();
  } catch (error) {
    if (isNetworkFailure(error)) return err(appError(COMMON_ERROR_CODES.NETWORK_ERROR));
    throw error;
  }
}
