// Lista de ejemplares (HU-INV-04, BR-COPY-12, BR-PRC-01/02, BR-GEN-14). Sin sumas de dinero (BR-GOAL-06).
import { priceDelta, priceDiffers, type Copy, type CopyStatus } from './copy';
import type { COP } from './money';
import { compareEs, compareIds, normalizeForSearch } from './text';
import { toBogotaDate, type Instant, type LocalDate } from './time';
import type { Title } from './title';

export type CopiesView = 'all' | 'in_stock' | 'sold' | 'price_changed';
export type CopiesSortKey = 'received' | 'sold' | 'title' | 'agreed_price' | 'price_delta';
export type SortDir = 'asc' | 'desc';

export type CopiesListParams = {
  readonly view: CopiesView;
  /** Vacío = sin filtro. */
  readonly statusFilter: readonly CopyStatus[];
  readonly search: string;
  readonly sort: { readonly key: CopiesSortKey; readonly dir: SortDir };
};

/** Por defecto: Todos, sin filtro ni búsqueda, Recibido "Mayor primero". */
export const DEFAULT_COPIES_LIST_PARAMS: CopiesListParams = {
  view: 'all',
  statusFilter: [],
  search: '',
  sort: { key: 'received', dir: 'desc' },
};

export type CopiesListCopy = Pick<
  Copy,
  | 'id'
  | 'titleId'
  | 'number'
  | 'status'
  | 'customerId'
  | 'agreedPrice'
  | 'publicPriceSnapshot'
  | 'receivedAt'
  | 'soldAt'
  | 'deletedAt'
>;

export type CustomerRef = { readonly id: string; readonly name: string; readonly avatarEmoji: string | null };

export type CopiesListRow = {
  readonly copyId: string;
  readonly titleName: string;
  /** Portada del título (#53). */
  readonly imageUrl?: string | null;
  readonly number: number;
  readonly status: CopyStatus;
  readonly customer: CustomerRef | null;
  /** La fecha del orden elegido (R3): venta si se ordena por Vendido; si no, recibido. */
  readonly rowDate: LocalDate | null;
  readonly receivedAt: LocalDate;
  readonly soldAt: Instant | null;
  /** R1: acordado si está vendido; si no, el público copiado (referencia). */
  readonly price: COP | null;
  /** R2: solo en vendidos con precio distinto (+ aumento, − descuento). */
  readonly priceDelta: COP | null;
  readonly priceDiffers: boolean;
};

export type CopiesListView = {
  readonly counts: {
    readonly all: number;
    readonly inStock: number;
    readonly sold: number;
    readonly priceChanged: number;
  };
  readonly rows: readonly CopiesListRow[];
};

type Item = { row: CopiesListRow; agreedPrice: COP | null };

const inView = (view: CopiesView, row: CopiesListRow): boolean => {
  switch (view) {
    case 'all':
      return true;
    case 'in_stock':
      return row.status === 'in_stock';
    case 'sold':
      return row.status === 'sold';
    case 'price_changed':
      return row.priceDiffers;
  }
};

/** R6: por título o cliente (sin tildes ni mayúsculas); `12` o `#12` = ese número exacto. */
const matchesSearch = (search: string): ((row: CopiesListRow) => boolean) => {
  const query = normalizeForSearch(search);
  if (!query) return () => true;
  const number = /^#?\s*(\d+)$/.exec(query);
  if (number) return (row) => row.number === Number(number[1]);
  return (row) =>
    normalizeForSearch(row.titleName).includes(query) ||
    (row.customer !== null && normalizeForSearch(row.customer.name).includes(query));
};

/** Valor del criterio de orden; `null` = vacío (va al final en ambos sentidos, R4). */
const sortValue = (key: CopiesSortKey, item: Item): number | string | null => {
  switch (key) {
    case 'received':
      return item.row.receivedAt;
    case 'sold':
      return item.row.soldAt?.getTime() ?? null;
    case 'title':
      return item.row.titleName;
    case 'agreed_price':
      return item.agreedPrice;
    case 'price_delta':
      return item.row.priceDelta;
  }
};

/** Título en español (sin tildes ni mayúsculas); fechas AAAA-MM-DD y números, directo. */
const compareValues = (key: CopiesSortKey, a: number | string, b: number | string): number =>
  key === 'title' ? compareEs(String(a), String(b)) : a < b ? -1 : a > b ? 1 : 0;

const comparator =
  (sort: CopiesListParams['sort']) =>
  (a: Item, b: Item): number => {
    const x = sortValue(sort.key, a);
    const y = sortValue(sort.key, b);
    if (x === null || y === null) {
      if (x !== y) return x === null ? 1 : -1; // R4: vacíos al final en ambos sentidos
    } else {
      const primary = compareValues(sort.key, x, y) * (sort.dir === 'asc' ? 1 : -1);
      if (primary !== 0) return primary;
    }
    // Desempate: título, número y, al final, id (BR-GEN-14).
    return (
      compareEs(a.row.titleName, b.row.titleName) ||
      a.row.number - b.row.number ||
      compareIds(a.row.copyId, b.row.copyId)
    );
  };

/**
 * Lista de ejemplares lista para pintar (BR-COPY-12): excluye minibooks y eliminados; conteos de las
 * pestañas independientes de la búsqueda y del filtro (R5); vista → filtro de estado → búsqueda → orden.
 */
export const buildCopiesListView = (
  copies: readonly CopiesListCopy[],
  titles: readonly (Pick<Title, 'id' | 'name' | 'category'> & Partial<Pick<Title, 'imageUrl'>>)[],
  customers: readonly CustomerRef[],
  params: CopiesListParams,
): CopiesListView => {
  const titleById = new Map(titles.map((t) => [t.id, t]));
  const customerById = new Map(customers.map((c) => [c.id, c]));

  const items: Item[] = [];
  for (const copy of copies) {
    const title = titleById.get(copy.titleId);
    if (!title || title.category === 'minibook' || copy.deletedAt) continue;
    const sold = copy.status === 'sold';
    const pricing = { ...copy, category: title.category };
    items.push({
      agreedPrice: sold ? copy.agreedPrice : null,
      row: {
        copyId: copy.id,
        titleName: title.name,
        ...(title.imageUrl ? { imageUrl: title.imageUrl } : {}),
        number: copy.number,
        status: copy.status,
        customer: sold && copy.customerId ? (customerById.get(copy.customerId) ?? null) : null,
        rowDate:
          params.sort.key === 'sold' ? (copy.soldAt ? toBogotaDate(copy.soldAt) : null) : copy.receivedAt,
        receivedAt: copy.receivedAt,
        soldAt: copy.soldAt,
        price: sold ? copy.agreedPrice : copy.publicPriceSnapshot,
        priceDelta: priceDelta(pricing),
        priceDiffers: priceDiffers(pricing),
      },
    });
  }

  const counts = {
    all: items.length,
    inStock: items.filter((i) => i.row.status === 'in_stock').length,
    sold: items.filter((i) => i.row.status === 'sold').length,
    priceChanged: items.filter((i) => i.row.priceDiffers).length,
  };

  const statuses = new Set(params.statusFilter);
  const search = matchesSearch(params.search);
  const rows = items
    .filter(
      (i) =>
        inView(params.view, i.row) && (statuses.size === 0 || statuses.has(i.row.status)) && search(i.row),
    )
    .sort(comparator(params.sort))
    .map((i) => i.row);

  return { counts, rows };
};
