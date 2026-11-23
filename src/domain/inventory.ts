// Libros en físico y Por resolver (HU-INV-03, BR-INV-03, BR-COPY-10, BR-GOAL-06, BR-MBK-01).
// Solo conteos y el precio de referencia de cada título: ninguna lectura de aquí suma dinero (R3).
import type { COP } from './money';
import type { CopyStatus } from './copy';
import { compareEs, compareIds } from './text';
import type { Instant, LocalDate } from './time';
import { referencePrice, type Title, type TitleCategory } from './title';

/** Lo que estas lecturas necesitan de un ejemplar (ya sin borrados: R1). */
export type StockCopy = {
  readonly id: string;
  readonly titleId: string;
  readonly number: number;
  readonly status: CopyStatus;
  readonly receivedAt: LocalDate;
};

export type InStockTitle = {
  readonly titleId: string;
  readonly name: string;
  readonly imageUrl: string | null;
  readonly category: TitleCategory;
  /** Precio público vigente (o colportor en un minibook sin precio público). No es una suma. */
  readonly referencePrice: COP;
  readonly inStockCount: number;
};

export type InStockSummary = {
  /** Ejemplares en físico que no son minibook (R2). */
  readonly booksTotal: number;
  /** Culturales y religiosos con al menos uno en físico, por nombre. Incluye desactivados (CA-5). */
  readonly titles: readonly InStockTitle[];
  /** Minibooks con al menos uno en físico, por nombre; aparte (BR-MBK-01). */
  readonly minibooks: readonly InStockTitle[];
  /** Ejemplares con novedad ("N por resolver", R4). */
  readonly flaggedCount: number;
};

const byName = (a: InStockTitle, b: InStockTitle) =>
  compareEs(a.name, b.name) || compareIds(a.titleId, b.titleId);

/**
 * Resumen de Libros en físico (BR-INV-03). Cuenta solo `in_stock` (R1); los `flagged` van aparte (R4).
 * Un ejemplar cuyo título no llegó en `titles` no se puede mostrar y se omite.
 */
export const buildInStockSummary = (
  copies: readonly Pick<StockCopy, 'titleId' | 'status'>[],
  titles: readonly Title[],
): InStockSummary => {
  const counts = new Map<string, number>();
  let flaggedCount = 0;
  for (const copy of copies) {
    if (copy.status === 'in_stock') counts.set(copy.titleId, (counts.get(copy.titleId) ?? 0) + 1);
    else if (copy.status === 'flagged') flaggedCount += 1;
  }
  const rows = titles
    .filter((t) => counts.has(t.id))
    .map((t): InStockTitle => ({
      titleId: t.id,
      name: t.name,
      imageUrl: t.imageUrl,
      category: t.category,
      referencePrice: referencePrice(t),
      inStockCount: counts.get(t.id)!,
    }));
  const books = rows.filter((r) => r.category !== 'minibook').sort(byName);
  return {
    booksTotal: books.reduce((sum, r) => sum + r.inStockCount, 0),
    titles: books,
    minibooks: rows.filter((r) => r.category === 'minibook').sort(byName),
    flaggedCount,
  };
};

export type InStockCopiesOfTitle = {
  readonly title: { readonly name: string; readonly inStockCount: number; readonly referencePrice: COP };
  readonly copies: readonly {
    readonly copyId: string;
    readonly number: number;
    readonly receivedAt: LocalDate;
  }[];
};

/** Un título abierto: sus ejemplares en físico, del recibido más antiguo al más nuevo y luego por número. */
export const inStockCopiesOfTitle = (title: Title, copies: readonly StockCopy[]): InStockCopiesOfTitle => {
  const inStock = copies
    .filter((c) => c.titleId === title.id && c.status === 'in_stock')
    .sort(
      (a, b) =>
        (a.receivedAt < b.receivedAt ? -1 : a.receivedAt > b.receivedAt ? 1 : 0) ||
        a.number - b.number ||
        compareIds(a.id, b.id),
    );
  return {
    title: { name: title.name, inStockCount: inStock.length, referencePrice: referencePrice(title) },
    copies: inStock.map((c) => ({ copyId: c.id, number: c.number, receivedAt: c.receivedAt })),
  };
};

/** Un ejemplar con novedad y su novedad abierta (si la hay). */
export type FlaggedCopyInput = {
  readonly copyId: string;
  readonly titleId: string;
  readonly number: number;
  readonly note: string | null;
  readonly flaggedAt: Instant;
};

export type FlaggedCopy = {
  readonly copyId: string;
  readonly titleName: string;
  /** Portada del título (#53). */
  readonly imageUrl?: string | null;
  readonly number: number;
  readonly note: string | null;
  readonly flaggedAt: Instant;
};

/** Por resolver (BR-COPY-10): del más reciente al más antiguo; incluye minibooks. */
export const flaggedCopies = (
  items: readonly FlaggedCopyInput[],
  titles: readonly (Pick<Title, 'id' | 'name'> & Partial<Pick<Title, 'imageUrl'>>)[],
): FlaggedCopy[] => {
  const names = new Map(titles.map((t) => [t.id, t.name]));
  const covers = new Map(titles.map((t) => [t.id, t.imageUrl ?? null]));
  return items
    .filter((item) => names.has(item.titleId))
    .sort((a, b) => b.flaggedAt.getTime() - a.flaggedAt.getTime() || compareIds(a.copyId, b.copyId))
    .map((item) => ({
      copyId: item.copyId,
      titleName: names.get(item.titleId)!,
      ...(covers.get(item.titleId) ? { imageUrl: covers.get(item.titleId)! } : {}),
      number: item.number,
      note: item.note,
      flaggedAt: item.flaggedAt,
    }));
};
