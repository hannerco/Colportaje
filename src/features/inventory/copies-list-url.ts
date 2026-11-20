// Vista de la lista de ejemplares ↔ URL (HU-PAN-INV-02): pestaña, orden y búsqueda viven en la URL
// (`?vista=vendidos&orden=titulo-asc&q=12`) para volver a la misma vista con «atrás». Lo que coincide con la vista
// por defecto no se escribe; un valor desconocido se ignora.
import {
  DEFAULT_COPIES_LIST_PARAMS,
  type CopiesListParams,
  type CopiesSortKey,
  type CopiesView,
} from '@/domain/copies-list';

const VIEWS: Record<CopiesView, string> = {
  all: 'todos',
  in_stock: 'en-fisico',
  sold: 'vendidos',
  price_changed: 'con-diferencia',
};
const SORTS: Record<CopiesSortKey, string> = {
  received: 'recibido',
  sold: 'vendido',
  title: 'titulo',
  agreed_price: 'precio',
  price_delta: 'diferencia',
};

const keyOf = <K extends string>(slugs: Record<K, string>, slug: string): K | undefined =>
  (Object.keys(slugs) as K[]).find((key) => slugs[key] === slug);

/** Lee la vista desde la URL. */
export const copiesListParamsFromUrl = (query: URLSearchParams): CopiesListParams => {
  const defaults = DEFAULT_COPIES_LIST_PARAMS;
  const view = keyOf(VIEWS, query.get('vista') ?? '') ?? defaults.view;
  const text = query.get('orden') ?? '';
  const cut = text.lastIndexOf('-');
  const key = cut > 0 ? keyOf(SORTS, text.slice(0, cut)) : undefined;
  const dir = text.slice(cut + 1);
  const search = (query.get('q') ?? '').trim();
  return {
    view,
    statusFilter: defaults.statusFilter,
    sort: key ? { key, dir: dir === 'asc' || dir === 'desc' ? dir : defaults.sort.dir } : defaults.sort,
    search,
  };
};

/** Escribe la vista en la URL (solo lo que no es el valor por defecto). */
export const copiesListParamsToUrl = (params: CopiesListParams): URLSearchParams => {
  const defaults = DEFAULT_COPIES_LIST_PARAMS;
  const query = new URLSearchParams();
  if (params.view !== defaults.view) query.set('vista', VIEWS[params.view]);
  if (params.sort.key !== defaults.sort.key || params.sort.dir !== defaults.sort.dir)
    query.set('orden', `${SORTS[params.sort.key]}-${params.sort.dir}`);
  if (params.search) query.set('q', params.search);
  return query;
};
