'use client';

import type { ReactNode } from 'react';
import { copy } from '@/copy/es';
import {
  type CopiesListParams,
  type CopiesListRow,
  type CopiesListView,
  type CopiesSortKey,
  type CopiesView,
} from '@/domain/copies-list';
import { Tabs } from '@/ui/molecules/Tabs';
import { ListRow, ListTable } from '@/ui/molecules/ListRow';
import type { AppNavProps } from '@/ui/organisms/AppNav';
import type { EmptyStateProps } from '@/ui/organisms/EmptyState';
import type { ViewBarSort } from '@/ui/organisms/ViewBar';
import { ListTemplate, type ListState } from '@/ui/templates/ListTemplate';

export type CopiesListScreenProps = {
  /** Navegación del armazón (`useAppShell().nav`). */
  nav: AppNavProps;
  /** Franja de sin conexión. */
  banner?: ReactNode;
  isOnline: boolean;
  /** La vista: pestaña, búsqueda y orden (la del contenedor, que la lee de la URL). */
  params: CopiesListParams;
  onParamsChange: (params: CopiesListParams) => void;
  /** `useCopiesList(params).data`; sin valor mientras carga o si falló. */
  view?: CopiesListView;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  /** Ruta del Ejemplar (HU-PAN-INV-03). */
  copyHref: (copyId: string) => string;
  /** Cuántos libros hay en físico (la otra sección del módulo). */
  inStockCount?: number;
  /** Volver a «Libros en físico». */
  onOpenInStock: () => void;
};

const t = copy.inventory;
const VIEWS: CopiesView[] = ['all', 'in_stock', 'sold', 'price_changed'];
const SORT_KEYS: CopiesSortKey[] = ['received', 'sold', 'title', 'agreed_price', 'price_delta'];
const COUNT_OF: Record<CopiesView, keyof CopiesListView['counts']> = {
  all: 'all',
  in_stock: 'inStock',
  sold: 'sold',
  price_changed: 'priceChanged',
};

/**
 * Lista de ejemplares (HU-PAN-INV-02, diseño «2 · Ejemplares»): las secciones del módulo, pestañas con conteos que no
 * cambian con la búsqueda (I-12), buscador por título, cliente o número (I-23), orden con su sentido y la lista con el
 * precio y la diferencia con el público. La fecha de cada fila sigue al orden: Recibido o Vendido (R3).
 */
export function CopiesListScreen({
  nav,
  banner,
  isOnline,
  params,
  onParamsChange,
  view,
  loading = false,
  error = false,
  onRetry,
  copyHref,
  inStockCount,
  onOpenInStock,
}: CopiesListScreenProps) {
  const set = (patch: Partial<CopiesListParams>) => onParamsChange({ ...params, ...patch });
  const rows = view?.rows ?? [];
  const dateKind = params.sort.key === 'sold' ? 'sold' : 'received';

  const state: ListState = !view
    ? error && !loading
      ? isOnline
        ? 'error'
        : 'offline-empty'
      : 'loading'
    : rows.length > 0
      ? 'ready'
      : params.search
        ? 'no-results'
        : 'empty';

  const emptyState = ((): Omit<EmptyStateProps, 'kind'> | undefined => {
    switch (state) {
      case 'empty':
        return params.view === 'all' ? t.copies.empty : t.copies.emptyTab;
      case 'no-results':
        return { title: t.copies.noResults.title(params.search), text: t.copies.noResults.text };
      case 'offline-empty':
        return t.copies.offline;
      case 'error':
        return {
          ...t.copies.error,
          ...(onRetry ? { action: { label: copy.errors.retry, onClick: onRetry } } : {}),
        };
      default:
        return undefined;
    }
  })();

  const sort: ViewBarSort = {
    options: SORT_KEYS.map((key) => ({ id: key, label: t.copies.sort[key] })),
    value: params.sort.key,
    direction: params.sort.dir,
    onChange: ({ value, direction }) => set({ sort: { key: value as CopiesSortKey, dir: direction } }),
  };

  return (
    <ListTemplate
      nav={nav}
      header={{ title: t.title }}
      sections={
        <Tabs
          variant="segmented"
          aria-label={t.sections.label}
          width="auto"
          value="copies"
          onValueChange={(value) => {
            if (value === 'inStock') onOpenInStock();
          }}
          items={[
            { id: 'inStock', label: t.sections.inStock, count: inStockCount },
            { id: 'copies', label: t.sections.copies, count: view?.counts.all },
          ]}
        />
      }
      viewBar={{
        views: {
          'aria-label': t.copies.tabsLabel,
          items: VIEWS.map((id) => ({
            id,
            label: t.copies.tabs[id],
            count: view?.counts[COUNT_OF[id]],
          })),
          value: params.view,
          onValueChange: (next) => set({ view: next as CopiesView }),
        },
        search: {
          placeholder: t.copies.search,
          value: params.search,
          onValueChange: (search) => set({ search }),
          resultsAnnouncement: params.search && view ? t.copies.results(rows.length) : undefined,
        },
        filters: undefined,
        sort: {
          ...sort,
        },
      }}
      banner={banner}
      state={state}
      emptyState={emptyState}
    >
      <ListTable kind="copy" aria-label={t.copies.tabsLabel}>
        <ListRow
          variant="header"
          kind="copy"
          dateKind={dateKind}
          groupLabel={t.copies.tabs[params.view]}
          groupCount={rows.length}
        />
        {rows.map((row) => (
          <CopyRow key={row.copyId} row={row} dateKind={dateKind} href={copyHref(row.copyId)} />
        ))}
      </ListTable>
    </ListTemplate>
  );
}

function CopyRow({
  row,
  dateKind,
  href,
}: {
  row: CopiesListRow;
  dateKind: 'received' | 'sold';
  href: string;
}) {
  return (
    <ListRow
      kind="copy"
      title={row.titleName}
      copyNumber={row.number}
      amount={row.price ?? undefined}
      date={row.rowDate ?? undefined}
      dateKind={dateKind}
      customerName={row.customer?.name}
      status={row.status}
      priceDelta={row.priceDelta ?? undefined}
      href={href}
    />
  );
}
