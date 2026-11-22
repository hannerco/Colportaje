import type { AppError } from '@/domain/shared/errors';
import type { Result } from '@/domain/shared/result';
import type { Title, TitleFields } from '@/domain/title';

/** Un título para guardar desde Admin: sus datos y, si cambia, la ruta de su portada (`null` la quita). */
export type TitleWrite = TitleFields & { readonly imagePath?: string | null };

/** Catálogo (HU-BASE-04). Lo lee todo colportor activo; lo escribe solo el admin (BR-TIT-01, RLS). */
export interface TitleRepository {
  /** Títulos activos, ordenados por categoría y nombre (para Agregar al inventario). */
  listActive(): Promise<Result<Title[], AppError>>;
  /** Los títulos pedidos, incluidos los inactivos (ejemplares de títulos desactivados, BR-TIT-03). */
  getMany(ids: readonly string[]): Promise<Result<Title[], AppError>>;
  /** Todos los títulos, activos e inactivos, ordenados como `listActive` (Admin · Catálogo). */
  listAll(): Promise<Result<Title[], AppError>>;
  /**
   * Crea un título (Admin). Idempotente por `id`: reintentar con el mismo id deja lo mismo (AF-91).
   * Errores: `FORBIDDEN` (no es admin), `VALIDATION`, `NETWORK_ERROR`.
   */
  create(id: string, title: TitleWrite): Promise<Result<void, AppError>>;
  /**
   * Cambia los datos de un título; `imagePath` solo si viene. Un título no se borra: se desactiva (BR-TIT-03).
   * Errores: `NOT_FOUND` (no existe o no es admin), `VALIDATION`, `NETWORK_ERROR`.
   */
  update(id: string, title: Partial<TitleWrite>): Promise<Result<void, AppError>>;
  /** Sube una portada al bucket público `title-images` (solo admin). Errores: `FORBIDDEN`, `NETWORK_ERROR`. */
  uploadCover(path: string, blob: Blob): Promise<Result<void, AppError>>;
}
