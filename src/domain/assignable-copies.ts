// Buscador "Agregar libro del inventario" de la ficha (HU-CLI-09, BR-COPY-06, ADR-0044).
import type { Copy } from './copy';
import type { COP } from './money';
import { compareEs, compareIds, normalizeForSearch } from './text';
import type { Title } from './title';

export const ASSIGN_ERROR_CODES = {
  COPY_NOT_IN_STOCK: 'COPY_NOT_IN_STOCK',
  COPY_IS_MINIBOOK: 'COPY_IS_MINIBOOK',
  COPY_NOT_SOLD: 'COPY_NOT_SOLD',
} as const;

export type AssignableCopy = {
  readonly copyId: string;
  readonly titleName: string;
  readonly number: number;
  /** Precio público copiado del ejemplar: será el precio acordado al asignarlo (BR-COPY-06). */
  readonly price: COP | null;
  readonly imageUrl: string | null;
};

type Row = AssignableCopy & { readonly receivedAt: string };

/**
 * Cada ejemplar en físico de un título que no es minibook (R1), ordenado por título, recibido más antiguo,
 * número e id (ADR-0044). Busca por título (sin tildes ni mayúsculas) o por número exacto (`7` o `#7`).
 * No muestra agotados: un título sin ejemplares en físico simplemente no aparece.
 */
export const assignableCopies = (
  copies: readonly Pick<
    Copy,
    'id' | 'titleId' | 'number' | 'status' | 'publicPriceSnapshot' | 'receivedAt' | 'deletedAt'
  >[],
  titles: readonly Pick<Title, 'id' | 'name' | 'category' | 'imageUrl'>[],
  search = '',
): AssignableCopy[] => {
  const titleById = new Map(titles.map((t) => [t.id, t]));
  const query = normalizeForSearch(search);
  const number = /^#?\s*(\d+)$/.exec(query);
  const matches = (row: Row) =>
    !query || (number ? row.number === Number(number[1]) : normalizeForSearch(row.titleName).includes(query));

  const rows: Row[] = [];
  for (const copy of copies) {
    const title = titleById.get(copy.titleId);
    if (!title || title.category === 'minibook' || copy.status !== 'in_stock' || copy.deletedAt) continue;
    const row: Row = {
      copyId: copy.id,
      titleName: title.name,
      number: copy.number,
      price: copy.publicPriceSnapshot,
      imageUrl: title.imageUrl,
      receivedAt: copy.receivedAt,
    };
    if (matches(row)) rows.push(row);
  }
  return rows
    .sort(
      (a, b) =>
        compareEs(a.titleName, b.titleName) ||
        compareIds(a.receivedAt, b.receivedAt) || // AAAA-MM-DD: por código = por fecha
        a.number - b.number ||
        compareIds(a.copyId, b.copyId),
    )
    .map((r) => ({
      copyId: r.copyId,
      titleName: r.titleName,
      number: r.number,
      price: r.price,
      imageUrl: r.imageUrl,
    }));
};
