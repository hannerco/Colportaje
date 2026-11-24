// Agregar ejemplares al inventario por lote (HU-INV-02, BR-COPY-02/04, BR-MBK-01, ADR-0043).
// Todo aquí es local: sumar, restar o descartar el lote nunca toca la base de datos (R1).
import { appError, validationError, type AppError } from './shared/errors';
import { err, ok, type Result } from './shared/result';
import { compareEs, compareIds, normalizeForSearch } from './text';
import { addDays, type LocalDate } from './time';
import { CATEGORY_ORDER, type Title, type TitleCategory } from './title';

export const ADD_COPIES_ERROR_CODES = {
  BATCH_EMPTY: 'BATCH_EMPTY',
  DATE_IN_FUTURE: 'DATE_IN_FUTURE',
  TITLE_INACTIVE: 'TITLE_INACTIVE',
} as const;

/** Lo que el lote necesita saber de cada título. */
export type AddBatchTitle = Pick<Title, 'id' | 'name' | 'category'>;

export type AddBatchLine = {
  readonly titleId: string;
  readonly name: string;
  readonly category: TitleCategory;
  readonly quantity: number;
};

export type AddBatchSummary = {
  readonly total: number;
  readonly byCategory: Readonly<Record<TitleCategory, number>>;
  /** Ordenadas por categoría (Culturales, Religiosos, Minibooks) y nombre. */
  readonly lines: readonly AddBatchLine[];
};

/**
 * Lote local e inmutable: cada operación devuelve un lote nuevo (listo para el estado de React).
 * Los títulos que no están en el catálogo con que se creó se ignoran.
 */
export interface AddBatch {
  quantityOf(titleId: string): number;
  /** Un toque sobre el título: suma uno. */
  increment(titleId: string): AddBatch;
  /** "−": resta uno, sin bajar de 0. */
  decrement(titleId: string): AddBatch;
  /** Cantidad escrita (móvil). Solo enteros ≥ 0; otro valor deja el lote igual. 0 quita la línea. */
  setQuantity(titleId: string, quantity: number): AddBatch;
  /** "Descartar": vacía el lote. */
  clear(): AddBatch;
  total(): number;
  summary(): AddBatchSummary;
}

export const isValidQuantity = (n: number): boolean => Number.isSafeInteger(n) && n >= 0;

const compareLines = (a: AddBatchLine, b: AddBatchLine): number =>
  CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
  compareEs(a.name, b.name) ||
  compareIds(a.titleId, b.titleId);

const batchOf = (
  titles: ReadonlyMap<string, AddBatchTitle>,
  quantities: ReadonlyMap<string, number>,
): AddBatch => {
  const withQuantity = (titleId: string, quantity: number): AddBatch => {
    if (!titles.has(titleId) || !isValidQuantity(quantity)) return batch;
    const next = new Map(quantities);
    if (quantity === 0) next.delete(titleId);
    else next.set(titleId, quantity);
    return batchOf(titles, next);
  };
  const quantityOf = (titleId: string) => quantities.get(titleId) ?? 0;
  const batch: AddBatch = {
    quantityOf,
    increment: (titleId) => withQuantity(titleId, quantityOf(titleId) + 1),
    decrement: (titleId) => withQuantity(titleId, Math.max(0, quantityOf(titleId) - 1)),
    setQuantity: withQuantity,
    clear: () => batchOf(titles, new Map()),
    total: () => [...quantities.values()].reduce((sum, n) => sum + n, 0),
    summary: () => {
      const byCategory: Record<TitleCategory, number> = { cultural: 0, religious: 0, minibook: 0 };
      const lines = [...quantities].map(([titleId, quantity]): AddBatchLine => {
        const { name, category } = titles.get(titleId)!;
        byCategory[category] += quantity;
        return { titleId, name, category, quantity };
      });
      return { total: batch.total(), byCategory, lines: lines.sort(compareLines) };
    },
  };
  return batch;
};

/** Lote vacío sobre los títulos que se muestran para agregar. */
export const createAddBatch = (titles: readonly AddBatchTitle[]): AddBatch =>
  batchOf(new Map(titles.map((t) => [t.id, t])), new Map());

/**
 * #94: el mismo lote sobre una lista nueva de títulos (llegó o se actualizó el catálogo). Conserva lo que ya se llevaba
 * de cada título que sigue en la lista; nunca vacía el lote por recargar el catálogo.
 */
export const rebaseAddBatch = (batch: AddBatch, titles: readonly AddBatchTitle[]): AddBatch =>
  batch
    .summary()
    .lines.reduce((next, line) => next.setQuantity(line.titleId, line.quantity), createAddBatch(titles));

/** Líneas para confirmar: un UUID por ejemplar, generados UNA vez para que reintentar no duplique (R6). */
export const batchLines = (batch: AddBatch, newId: () => string): { titleId: string; copyIds: string[] }[] =>
  batch.summary().lines.map((line) => ({
    titleId: line.titleId,
    copyIds: Array.from({ length: line.quantity }, newId),
  }));

// ─── Chip de fecha (AF-50) ─────────────────────────────────────────────────────────────────────────
export type ReceivedDateKey = 'today' | 'yesterday' | 'day_before';

/** Hoy, Ayer y Anteayer. "Otra fecha…" la elige el usuario (nunca futura, R4). */
export const receivedDateOptions = (today: LocalDate): { key: ReceivedDateKey; date: LocalDate }[] => [
  { key: 'today', date: today },
  { key: 'yesterday', date: addDays(today, -1) },
  { key: 'day_before', date: addDays(today, -2) },
];

// ─── Catálogo para agregar (BR-COPY-02) ────────────────────────────────────────────────────────────
export type AddCatalogTitle = Pick<Title, 'id' | 'name' | 'imageUrl'>;
export type AddCatalogGroup = { readonly category: TitleCategory; readonly titles: AddCatalogTitle[] };

/**
 * Solo títulos activos, agrupados en Culturales, Religiosos y Minibooks; dentro, por nombre (español,
 * sin tildes). La búsqueda filtra por nombre normalizado (contiene). Los grupos vacíos no aparecen.
 */
export const addCatalogGroups = (titles: readonly Title[], search = ''): AddCatalogGroup[] => {
  const query = normalizeForSearch(search);
  const visible = titles
    .filter((t) => t.isActive && normalizeForSearch(t.name).includes(query))
    .sort((a, b) => compareEs(a.name, b.name) || compareIds(a.id, b.id));
  return CATEGORY_ORDER.map((category) => ({
    category,
    titles: visible
      .filter((t) => t.category === category)
      .map(({ id, name, imageUrl }) => ({ id, name, imageUrl })),
  })).filter((group) => group.titles.length > 0);
};

// ─── Confirmar (R2–R6) ─────────────────────────────────────────────────────────────────────────────
export type AddCopiesInput = {
  readonly batchId: string;
  readonly receivedAt: LocalDate;
  readonly lines: readonly { readonly titleId: string; readonly copyIds: readonly string[] }[];
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validación antes de llamar a la base (que vuelve a validar todo). Errores: `BATCH_EMPTY`,
 * `DATE_IN_FUTURE` (R4, BR-COPY-04), `VALIDATION` (ids que no son UUID o repetidos).
 */
export const validateAddCopiesInput = (
  input: AddCopiesInput,
  today: LocalDate,
): Result<AddCopiesInput, AppError> => {
  const copyIds = input.lines.flatMap((line) => line.copyIds);
  if (copyIds.length === 0) return err(appError(ADD_COPIES_ERROR_CODES.BATCH_EMPTY));
  if (input.receivedAt > today) return err(appError(ADD_COPIES_ERROR_CODES.DATE_IN_FUTURE));
  if (!UUID.test(input.batchId)) return err(validationError('batchId'));
  if (input.lines.some((line) => !UUID.test(line.titleId))) return err(validationError('titleId'));
  if (copyIds.some((id) => !UUID.test(id)) || new Set(copyIds).size !== copyIds.length) {
    return err(validationError('copyIds'));
  }
  return ok(input);
};
