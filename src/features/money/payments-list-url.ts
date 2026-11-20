// Vista de la lista de abonos ↔ URL (HU-PAN-DIN-01): pestaña, método, «solo vencidos», orden y búsqueda viven en la
// URL (`?vista=por-cobrar&vencidos=1&orden=cliente-asc&q=ana`) para volver a la misma vista con «atrás». Lo que
// coincide con la vista por defecto no se escribe; un valor desconocido se ignora.
import {
  DEFAULT_PAYMENTS_LIST_PARAMS,
  defaultPaymentsSort,
  type PaymentsListParams,
  type PaymentsSortKey,
  type PaymentsView,
} from '@/domain/payments-list';
import type { PayMethod } from '@/domain/payment';

const VIEWS: Record<PaymentsView, string> = {
  all: 'todos',
  to_collect: 'por-cobrar',
  to_deliver: 'por-entregar',
  delivered: 'entregados',
  canceled: 'cancelados',
};
const SORTS: Record<PaymentsSortKey, string> = {
  agreed_date: 'fecha-acordada',
  paid_date: 'fecha-real',
  agreed_amount: 'valor-acordado',
  paid_amount: 'valor-real',
  customer: 'cliente',
};
const METHODS: Record<PayMethod, string> = { cash: 'efectivo', transfer: 'transferencia' };

const keyOf = <K extends string>(slugs: Record<K, string>, slug: string): K | undefined =>
  (Object.keys(slugs) as K[]).find((key) => slugs[key] === slug);

/** Lee la vista desde la URL. */
export const paymentsListParamsFromUrl = (query: URLSearchParams): PaymentsListParams => {
  const view = keyOf(VIEWS, query.get('vista') ?? '') ?? DEFAULT_PAYMENTS_LIST_PARAMS.view;
  const fallback = defaultPaymentsSort(view);
  const text = query.get('orden') ?? '';
  const cut = text.lastIndexOf('-');
  const key = cut > 0 ? keyOf(SORTS, text.slice(0, cut)) : undefined;
  const dir = text.slice(cut + 1);
  return {
    view,
    method: keyOf(METHODS, query.get('metodo') ?? '') ?? null,
    overdueOnly: query.get('vencidos') === '1',
    search: (query.get('q') ?? '').trim(),
    sort: key ? { key, dir: dir === 'asc' || dir === 'desc' ? dir : fallback.dir } : fallback,
  };
};

/** Escribe la vista en la URL (solo lo que no es el valor por defecto). */
export const paymentsListParamsToUrl = (params: PaymentsListParams): URLSearchParams => {
  const query = new URLSearchParams();
  if (params.view !== DEFAULT_PAYMENTS_LIST_PARAMS.view) query.set('vista', VIEWS[params.view]);
  if (params.method) query.set('metodo', METHODS[params.method]);
  if (params.overdueOnly) query.set('vencidos', '1');
  const fallback = defaultPaymentsSort(params.view);
  if (params.sort.key !== fallback.key || params.sort.dir !== fallback.dir)
    query.set('orden', `${SORTS[params.sort.key]}-${params.sort.dir}`);
  if (params.search) query.set('q', params.search);
  return query;
};
