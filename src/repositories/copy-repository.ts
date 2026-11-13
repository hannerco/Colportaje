import type { AddCopiesInput } from '@/domain/add-batch';
import type { CopiesListCopy } from '@/domain/copies-list';
import type { CopyEvent } from '@/domain/copy';
import type { DetailCopy } from '@/domain/copy-detail';
import type { FlaggedCopyInput, StockCopy } from '@/domain/inventory';
import type { AppError } from '@/domain/shared/errors';
import type { Result } from '@/domain/shared/result';
import type { Instant, LocalDate } from '@/domain/time';

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

  /**
   * Ejemplares en físico y con novedad, sin borrados (HU-INV-03, R1/R4). Errores: `NETWORK_ERROR`.
   */
  listStock(): Promise<Result<StockCopy[], AppError>>;

  /** Ejemplares en físico de un título, sin borrados (HU-INV-03). Errores: `NETWORK_ERROR`. */
  listInStockOfTitle(titleId: string): Promise<Result<StockCopy[], AppError>>;

  /**
   * Ejemplares con novedad y su novedad abierta: nota y fecha en que se marcó (HU-INV-03, BR-COPY-10).
   * Errores: `NETWORK_ERROR`.
   */
  listFlagged(): Promise<Result<FlaggedCopyInput[], AppError>>;

  /** Todos los ejemplares no eliminados, para la lista de ejemplares (HU-INV-04). Errores: `NETWORK_ERROR`. */
  listAll(): Promise<Result<CopiesListCopy[], AppError>>;

  /**
   * El ejemplar y su novedad abierta (HU-INV-05). Errores: `NOT_FOUND` (no existe, no es del usuario o
   * está eliminado), `NETWORK_ERROR`.
   */
  getDetail(
    copyId: string,
  ): Promise<Result<{ copy: DetailCopy; openIssue: { note: string; createdAt: Instant } | null }, AppError>>;

  /**
   * Cambia la fecha de recibido (función `update_copy_received_date`). Errores: `DATE_IN_FUTURE`,
   * `DATE_AFTER_SALE`, `NOT_FOUND`, `FORBIDDEN`, `NETWORK_ERROR`.
   */
  updateReceivedDate(copyId: string, date: LocalDate): Promise<Result<void, AppError>>;
}
