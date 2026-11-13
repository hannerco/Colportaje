import type { PostgrestError } from '@supabase/supabase-js';
import type { AppError } from '@/domain/shared/errors';
import { err, ok, type Result } from '@/domain/shared/result';
import { mapPostgrestError } from './errors';

/** Igual a `max_rows` de PostgREST (supabase/config.toml): una respuesta nunca trae más filas. */
export const PAGE_SIZE = 1000;

type Page<T> = PromiseLike<{ data: T[] | null; error: PostgrestError | null }>;

/**
 * Lee todas las filas de una consulta por páginas (`range`), para que un inventario grande no se corte
 * en silencio en 1.000. La consulta debe tener un orden total (p. ej. por `id`) para que las páginas no
 * se solapen.
 */
export async function selectAll<T>(
  page: (from: number, to: number) => Page<T>,
  pageSize = PAGE_SIZE,
): Promise<Result<T[], AppError>> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await page(from, from + pageSize - 1);
    if (error) return err(mapPostgrestError(error));
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return ok(rows);
  }
}
