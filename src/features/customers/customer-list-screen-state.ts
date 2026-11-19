// Qué pinta la lista de clientes en cada caso (HU-PAN-CLI-01, «Estados»). Sin React, para probarlo aparte.
import type { CustomerListParams, CustomerListView } from '@/domain/customer-list';

export type CustomerListScreenState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'offline-empty' }
  | { kind: 'ready' }
  /** Sin ningún cliente (pestaña Todos, sin búsqueda ni filtros). */
  | { kind: 'empty' }
  /** Una pestaña sin clientes (p. ej. Archivados), sin búsqueda ni filtros. */
  | { kind: 'empty-tab' }
  /** Con filtros de estado y sin búsqueda, nadie cumple. */
  | { kind: 'filtered' }
  /** HU-CLI-05: la búsqueda no encontró a nadie. */
  | { kind: 'no-results'; query: string; canSearchArchived: boolean; createName: string };

export const customerListScreenState = (input: {
  params: CustomerListParams;
  view: CustomerListView | undefined;
  loading: boolean;
  error: boolean;
  isOnline: boolean;
}): CustomerListScreenState => {
  const { params, view } = input;
  if (!view) {
    if (input.error) return input.isOnline ? { kind: 'error' } : { kind: 'offline-empty' };
    return { kind: 'loading' };
  }
  if (view.rows.length > 0) return { kind: 'ready' };
  if (view.emptySearch) return { kind: 'no-results', ...view.emptySearch };
  if (params.statusFilter.length > 0) return { kind: 'filtered' };
  return params.tab === 'all' ? { kind: 'empty' } : { kind: 'empty-tab' };
};
