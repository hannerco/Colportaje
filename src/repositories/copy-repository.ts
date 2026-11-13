import type { CopyEvent } from '@/domain/copy';
import type { AppError } from '@/domain/shared/errors';
import type { Result } from '@/domain/shared/result';

/** Ejemplares (HU-INV-01). Las HU de Inventario agregan aquí sus lecturas y acciones. */
export interface CopyRepository {
  /**
   * Historial del ejemplar, del más reciente al más antiguo.
   * Errores: `NOT_FOUND` (no existe, no es del usuario o está eliminado, R5), `NETWORK_ERROR`.
   */
  getHistory(copyId: string): Promise<Result<CopyEvent[], AppError>>;
}
