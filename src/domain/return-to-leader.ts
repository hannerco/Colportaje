// Devolver al líder (HU-INV-09, BR-COPY-16, ADR-0043): candidatos, resumen y validación de la selección.
import { COPY_DELETE_ERROR_CODES } from './copy-delete';
import type { StockCopy } from './inventory';
import { appError, validationError, type AppError } from './shared/errors';
import { err, ok, type Result } from './shared/result';
import { compareEs, compareIds, normalizeForSearch } from './text';
import type { LocalDate } from './time';
import type { Title, TitleCategory } from './title';

export const RETURN_TO_LEADER_ERROR_CODES = {
  /** La nota es obligatoria al devolver y al deshacer (R1). */
  NOTE_REQUIRED: COPY_DELETE_ERROR_CODES.NOTE_REQUIRED,
  SELECTION_EMPTY: 'SELECTION_EMPTY',
  /** No hay suficientes minibooks en físico de un título (`details.titleId`). */
  NOT_ENOUGH_STOCK: 'NOT_ENOUGH_STOCK',
} as const;

export type ReturnCandidates = {
  /** Libros en físico (no minibook): recibido más antiguo, luego título y número. */
  readonly books: readonly {
    readonly copyId: string;
    readonly titleId: string;
    readonly titleName: string;
    readonly number: number;
    readonly category: Exclude<TitleCategory, 'minibook'>;
    readonly receivedAt: LocalDate;
  }[];
  /** Minibooks con ejemplares en físico, por nombre. */
  readonly minibooks: readonly {
    readonly titleId: string;
    readonly name: string;
    readonly inStockCount: number;
  }[];
};

export type ReturnSelection = {
  readonly copyIds: readonly string[];
  readonly minibookLines: readonly { readonly titleId: string; readonly quantity: number }[];
};

/**
 * Candidatos a devolver: cualquier ejemplar en físico, sin importar su fecha (BR-COPY-16). `search` filtra
 * por título (sin tildes ni mayúsculas); no cambia la selección, que es estado del front.
 */
export const buildReturnCandidates = (
  copies: readonly StockCopy[],
  titles: readonly Pick<Title, 'id' | 'name' | 'category'>[],
  search = '',
): ReturnCandidates => {
  const query = normalizeForSearch(search);
  const titleById = new Map(titles.map((t) => [t.id, t]));
  const matches = (name: string) => !query || normalizeForSearch(name).includes(query);
  const books: ReturnCandidates['books'][number][] = [];
  const minibookCount = new Map<string, number>();
  for (const copy of copies) {
    const title = titleById.get(copy.titleId);
    if (!title || copy.status !== 'in_stock' || !matches(title.name)) continue;
    if (title.category === 'minibook') {
      minibookCount.set(title.id, (minibookCount.get(title.id) ?? 0) + 1);
    } else {
      books.push({
        copyId: copy.id,
        titleId: title.id,
        titleName: title.name,
        number: copy.number,
        category: title.category,
        receivedAt: copy.receivedAt,
      });
    }
  }
  books.sort(
    (a, b) =>
      (a.receivedAt < b.receivedAt ? -1 : a.receivedAt > b.receivedAt ? 1 : 0) ||
      compareEs(a.titleName, b.titleName) ||
      a.number - b.number ||
      compareIds(a.copyId, b.copyId),
  );
  const minibooks = [...minibookCount].map(([titleId, inStockCount]) => ({
    titleId,
    name: titleById.get(titleId)!.name,
    inStockCount,
  }));
  minibooks.sort((a, b) => compareEs(a.name, b.name) || compareIds(a.titleId, b.titleId));
  return { books, minibooks };
};

export type ReturnSummary = {
  readonly total: number;
  readonly byCategory: Readonly<Record<TitleCategory, number>>;
  /** Por título: categoría, nombre y cuántos (libros agrupados; minibooks por su cantidad). */
  readonly lines: readonly {
    readonly titleId: string;
    readonly name: string;
    readonly category: TitleCategory;
    readonly count: number;
  }[];
};

const CATEGORY_RANK: Readonly<Record<TitleCategory, number>> = { cultural: 0, religious: 1, minibook: 2 };

/** "Vas a devolver N ejemplares" por categoría (CA-1). Ids o títulos que no son candidatos se ignoran. */
export const returnSelectionSummary = (
  selection: ReturnSelection,
  candidates: ReturnCandidates,
): ReturnSummary => {
  const bookById = new Map(candidates.books.map((b) => [b.copyId, b]));
  const minibookById = new Map(candidates.minibooks.map((m) => [m.titleId, m]));
  const lines = new Map<string, { titleId: string; name: string; category: TitleCategory; count: number }>();
  for (const copyId of new Set(selection.copyIds)) {
    const book = bookById.get(copyId);
    if (!book) continue;
    const line = lines.get(book.titleId) ?? {
      titleId: book.titleId,
      name: book.titleName,
      category: book.category,
      count: 0,
    };
    line.count += 1;
    lines.set(book.titleId, line);
  }
  for (const { titleId, quantity } of selection.minibookLines) {
    const minibook = minibookById.get(titleId);
    if (!minibook || quantity < 1) continue;
    const line = lines.get(titleId) ?? {
      titleId,
      name: minibook.name,
      category: 'minibook' as const,
      count: 0,
    };
    line.count += quantity;
    lines.set(titleId, line);
  }
  const sorted = [...lines.values()].sort(
    (a, b) => CATEGORY_RANK[a.category] - CATEGORY_RANK[b.category] || compareEs(a.name, b.name),
  );
  const byCategory = { cultural: 0, religious: 0, minibook: 0 };
  for (const line of sorted) byCategory[line.category] += line.count;
  return {
    total: byCategory.cultural + byCategory.religious + byCategory.minibook,
    byCategory,
    lines: sorted,
  };
};

/** Nota obligatoria (R1), sin espacios sobrantes. Error: `NOTE_REQUIRED`. */
export const requiredNote = (note: string | null | undefined): Result<string, AppError> => {
  const trimmed = note?.trim();
  return trimmed ? ok(trimmed) : err(appError(RETURN_TO_LEADER_ERROR_CODES.NOTE_REQUIRED));
};

/**
 * Valida la selección antes de ir a la red: nota (`NOTE_REQUIRED`), algo que devolver (`SELECTION_EMPTY`) y
 * cantidades enteras ≥ 1 (`VALIDATION` `minibookLines`). Quita ids repetidos.
 */
export const validateReturnSelection = (
  input: ReturnSelection & { readonly note: string | null | undefined },
): Result<ReturnSelection & { note: string }, AppError> => {
  const note = requiredNote(input.note);
  if (!note.ok) return note;
  if (input.copyIds.length === 0 && input.minibookLines.length === 0)
    return err(appError(RETURN_TO_LEADER_ERROR_CODES.SELECTION_EMPTY));
  if (input.minibookLines.some((l) => !Number.isInteger(l.quantity) || l.quantity < 1))
    return err(validationError('minibookLines'));
  return ok({ copyIds: [...new Set(input.copyIds)], minibookLines: input.minibookLines, note: note.value });
};
