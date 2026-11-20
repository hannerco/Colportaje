// Vista de la lista de clientes ↔ URL (HU-PAN-CLI-01 R3): pestaña, filtros, orden y búsqueda viven en la URL
// (`?tab=debtors&status=overdue&sort=balance-desc&q=mar`) para volver a la misma vista con «atrás».
// Lo que coincide con la vista por defecto no se escribe; un valor desconocido se ignora.
import type { PaymentStanding } from '@/domain/customer';
import {
  DEFAULT_CUSTOMER_LIST_PARAMS,
  DEFAULT_SORT_DIR,
  type CustomerListParams,
  type CustomerListTab,
  type CustomerSortKey,
} from '@/domain/customer-list';

const TABS: readonly CustomerListTab[] = ['all', 'debtors', 'settled', 'archived'];
const STANDINGS: readonly PaymentStanding[] = ['current', 'overdue', 'settled'];
const SORT_KEYS: readonly CustomerSortKey[] = ['recent', 'modified', 'name', 'balance', 'next_due'];

/** En la URL, `next_due` se escribe `next-due` (como el resto de la URL). */
const sortSlug = (key: CustomerSortKey) => key.replace('_', '-');
const sortFromSlug = (slug: string) => SORT_KEYS.find((key) => sortSlug(key) === slug);

const isOneOf = <T extends string>(list: readonly T[], value: string | null): value is T =>
  value !== null && (list as readonly string[]).includes(value);

/** Lee la vista desde la URL. */
export const customerListParamsFromUrl = (query: URLSearchParams): CustomerListParams => {
  const tab = query.get('tab');
  const status = (query.get('status') ?? '')
    .split(',')
    .filter((s): s is PaymentStanding => isOneOf(STANDINGS, s));
  const sortText = query.get('sort') ?? '';
  const cut = sortText.lastIndexOf('-');
  const key = cut > 0 ? sortFromSlug(sortText.slice(0, cut)) : undefined;
  const dir = sortText.slice(cut + 1);
  const search = (query.get('q') ?? '').trim();
  return {
    tab: isOneOf(TABS, tab) ? tab : DEFAULT_CUSTOMER_LIST_PARAMS.tab,
    includeProspects: query.get('prospects') === '1',
    statusFilter: STANDINGS.filter((s) => status.includes(s)),
    sort: key
      ? { key, dir: dir === 'asc' || dir === 'desc' ? dir : DEFAULT_SORT_DIR[key] }
      : DEFAULT_CUSTOMER_LIST_PARAMS.sort,
    ...(search ? { search: query.get('q')! } : {}),
    ...(query.get('archived') === '1' ? { includeArchivedInSearch: true } : {}),
  };
};

/** Escribe la vista en la URL (solo lo que no es el valor por defecto). */
export const customerListParamsToUrl = (params: CustomerListParams): URLSearchParams => {
  const query = new URLSearchParams();
  if (params.tab !== DEFAULT_CUSTOMER_LIST_PARAMS.tab) query.set('tab', params.tab);
  if (params.statusFilter.length > 0)
    query.set('status', STANDINGS.filter((s) => params.statusFilter.includes(s)).join(','));
  const sort = DEFAULT_CUSTOMER_LIST_PARAMS.sort;
  if (params.sort.key !== sort.key || params.sort.dir !== sort.dir)
    query.set('sort', `${sortSlug(params.sort.key)}-${params.sort.dir}`);
  if (params.includeProspects) query.set('prospects', '1');
  if (params.search) query.set('q', params.search);
  if (params.search && params.includeArchivedInSearch) query.set('archived', '1');
  return query;
};
