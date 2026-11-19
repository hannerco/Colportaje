// Vista de la lista de Abibonos ↔ URL (HU-PAN-DIN-03): orden y búsqueda viven en la URL (`?orden=total-asc&q=oct`) para
// volver a la misma vista con «atrás». Lo que coincide con la vista por defecto no se escribe; un valor desconocido se
// ignora.
import {
  DEFAULT_DEPOSITS_LIST_PARAMS,
  type DepositsListParams,
  type DepositsSortKey,
} from '@/domain/deposits-list';

const SORTS: Record<DepositsSortKey, string> = { date: 'fecha', total: 'total', name: 'nombre' };

const keyOf = (slug: string): DepositsSortKey | undefined =>
  (Object.keys(SORTS) as DepositsSortKey[]).find((key) => SORTS[key] === slug);

/** Lee la vista desde la URL. */
export const depositsListParamsFromUrl = (query: URLSearchParams): DepositsListParams => {
  const defaults = DEFAULT_DEPOSITS_LIST_PARAMS;
  const text = query.get('orden') ?? '';
  const cut = text.lastIndexOf('-');
  const key = cut > 0 ? keyOf(text.slice(0, cut)) : undefined;
  const dir = text.slice(cut + 1);
  return {
    search: (query.get('q') ?? '').trim(),
    sort: key ? { key, dir: dir === 'asc' || dir === 'desc' ? dir : defaults.sort.dir } : defaults.sort,
  };
};

/** Escribe la vista en la URL (solo lo que no es el valor por defecto). */
export const depositsListParamsToUrl = (params: DepositsListParams): URLSearchParams => {
  const defaults = DEFAULT_DEPOSITS_LIST_PARAMS;
  const query = new URLSearchParams();
  if (params.sort.key !== defaults.sort.key || params.sort.dir !== defaults.sort.dir)
    query.set('orden', `${SORTS[params.sort.key]}-${params.sort.dir}`);
  if (params.search) query.set('q', params.search);
  return query;
};
