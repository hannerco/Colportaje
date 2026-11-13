import type { AddCopiesInput } from '@/domain/add-batch';
import type { CopyEvent } from '@/domain/copy';
import type { AppError } from '@/domain/shared/errors';
import type { Result } from '@/domain/shared/result';

/** Un ejemplar recién creado por el lote, con el número que le asignó la base. */
export type CreatedCopy = { readonly copyId: string; readonly titleId: string; readonly number: number };

/** Ejemplares (HU-INV-01). Las HU de Inventario agregan aquí sus lecturas y acciones. */
export interface CopyRepository {
  /**
   * Historial del ejemplar, del más reciente al más antiguo.
   * Errores: `NOT_FOUND` (no existe, no es del usuario o está eliminado, R5), `NETWORK_ERROR`.
   */
  getHistory(copyId: string): Promise<Result<CopyEvent[], AppError>>;

  /**
   * Crea todo el lote o nada (HU-INV-02, función `add_copies`). Reintentar con los mismos `copyIds`
   * devuelve los ya creados. Errores: `BATCH_EMPTY`, `DATE_IN_FUTURE`, `TITLE_INACTIVE`
   * (`details.titleIds`), `VALIDATION`, `CONFLICT`, `FORBIDDEN`, `NETWORK_ERROR`.
   */
  addBatch(input: AddCopiesInput): Promise<Result<{ created: CreatedCopy[] }, AppError>>;
}
