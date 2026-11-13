import type { AppError } from '@/domain/shared/errors';
import type { Result } from '@/domain/shared/result';
import type { Title } from '@/domain/title';

/** Lectura del catálogo (HU-BASE-04). La escritura es del admin: script o panel de Admin. */
export interface TitleRepository {
  /** Títulos activos, ordenados por categoría y nombre (para Agregar al inventario). */
  listActive(): Promise<Result<Title[], AppError>>;
  /** Los títulos pedidos, incluidos los inactivos (ejemplares de títulos desactivados, BR-TIT-03). */
  getMany(ids: readonly string[]): Promise<Result<Title[], AppError>>;
}
