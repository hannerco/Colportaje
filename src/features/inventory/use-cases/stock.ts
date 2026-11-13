// Lecturas de Libros en físico y Por resolver (HU-INV-03): repositorios → dominio → modelo de vista.
import {
  buildInStockSummary,
  flaggedCopies,
  inStockCopiesOfTitle,
  type FlaggedCopy,
  type InStockCopiesOfTitle,
  type InStockSummary,
} from '@/domain/inventory';
import { appError, COMMON_ERROR_CODES, type AppError } from '@/domain/shared/errors';
import { err, ok, type Result } from '@/domain/shared/result';
import type { CopyRepository, TitleRepository } from '@/repositories';

export type StockDeps = { readonly copies: CopyRepository; readonly titles: TitleRepository };

const uniqueTitleIds = (rows: readonly { titleId: string }[]) => [...new Set(rows.map((r) => r.titleId))];

/** Resumen de Libros en físico. Lee los títulos de los ejemplares, también los desactivados (CA-5). */
export async function loadInStockSummary(deps: StockDeps): Promise<Result<InStockSummary, AppError>> {
  const copies = await deps.copies.listStock();
  if (!copies.ok) return copies;
  const titles = await deps.titles.getMany(uniqueTitleIds(copies.value));
  if (!titles.ok) return titles;
  return ok(buildInStockSummary(copies.value, titles.value));
}

/** Un título abierto. Errores: `NOT_FOUND` (el título no existe), `NETWORK_ERROR`. */
export async function loadInStockCopiesOfTitle(
  deps: StockDeps,
  titleId: string,
): Promise<Result<InStockCopiesOfTitle, AppError>> {
  const titles = await deps.titles.getMany([titleId]);
  if (!titles.ok) return titles;
  const [title] = titles.value;
  if (!title) return err(appError(COMMON_ERROR_CODES.NOT_FOUND));
  const copies = await deps.copies.listInStockOfTitle(titleId);
  if (!copies.ok) return copies;
  return ok(inStockCopiesOfTitle(title, copies.value));
}

/** Por resolver: ejemplares con novedad, del más reciente al más antiguo (incluye minibooks). */
export async function loadFlaggedCopies(deps: StockDeps): Promise<Result<FlaggedCopy[], AppError>> {
  const items = await deps.copies.listFlagged();
  if (!items.ok) return items;
  const titles = await deps.titles.getMany(uniqueTitleIds(items.value));
  if (!titles.ok) return titles;
  return ok(flaggedCopies(items.value, titles.value));
}
