'use client';

import type { MouseEvent, ReactNode } from 'react';
import { copy } from '@/copy/es';
import type { PaymentStanding } from '@/domain/customer';
import {
  DEFAULT_CUSTOMER_LIST_PARAMS,
  DEFAULT_SORT_DIR,
  type CustomerListParams,
  type CustomerListRow,
  type CustomerListTab,
  type CustomerListView,
  type CustomerSortKey,
} from '@/domain/customer-list';
import { Choice } from '@/ui/atoms/Choice';
import { ListRow, ListTable } from '@/ui/molecules/ListRow';
import type { AppNavProps } from '@/ui/organisms/AppNav';
import type { EmptyStateProps } from '@/ui/organisms/EmptyState';
import type { ViewBarFilters, ViewBarSort } from '@/ui/organisms/ViewBar';
import { ListTemplate, type ListState, ListSkeletonFor } from '@/ui/templates/ListTemplate';
import { customerListScreenState, type CustomerListScreenState } from '../../customer-list-screen-state';
import styles from './CustomerListScreen.module.css';

export type CustomerListScreenProps = {
  /** Navegación del armazón (`useAppShell().nav`). */
  nav: AppNavProps;
  /** Franja de sin conexión (`useAppShell().offlineBanner`). */
  banner?: ReactNode;
  /** R2: sin conexión, «Nuevo cliente» y «Crear «…»» se ven deshabilitados con «Necesita conexión». */
  isOnline: boolean;
  /** La vista: pestaña, filtros, orden y búsqueda (la del contenedor, que la lee de la URL). */
  params: CustomerListParams;
  onParamsChange: (params: CustomerListParams) => void;
  /** `useCustomerList(params).data`; sin valor mientras carga o si falló. */
  view?: CustomerListView;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  /** El cliente abierto en la Ventana de detalle (escritorio): su fila queda marcada (CA-4). */
  selectedId?: string;
  /** Ruta de la ficha de un cliente (el enlace de la fila). */
  customerHref: (id: string) => string;
  /** Abrir la ficha: en escritorio, en la Ventana de detalle; en móvil, en pantalla. */
  onOpenCustomer: (id: string) => void;
  /** «Nuevo cliente»; con `name`, «Crear «texto»» de la búsqueda sin resultados (HU-CLI-05). */
  onNewCustomer: (name?: string) => void;
  /** La Ventana de detalle abierta, si la hay. */
  detail?: ReactNode;
};

const t = copy.customers.list;
const TABS: CustomerListTab[] = ['all', 'debtors', 'settled', 'archived'];
const STANDINGS: PaymentStanding[] = ['current', 'overdue', 'settled'];
const SORT_KEYS: CustomerSortKey[] = ['recent', 'modified', 'name', 'balance', 'next_due'];
const SORT_CHIP = 'sort';
const PROSPECTS_CHIP = 'prospects';

const isDefaultSort = (sort: CustomerListParams['sort']) =>
  sort.key === DEFAULT_CUSTOMER_LIST_PARAMS.sort.key && sort.dir === DEFAULT_CUSTOMER_LIST_PARAMS.sort.dir;

/** Un clic normal abre la ficha en la app; con Ctrl, Cmd o Mayús el enlace se abre como siempre. */
const plainClick = (event: MouseEvent) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

const LIST_STATE: Record<CustomerListScreenState['kind'], ListState> = {
  loading: 'loading',
  error: 'error',
  'offline-empty': 'offline-empty',
  ready: 'ready',
  empty: 'empty',
  'empty-tab': 'empty',
  filtered: 'no-results',
  'no-results': 'no-results',
};

/**
 * Lista de clientes (HU-PAN-CLI-01): pestañas con conteos, buscador, filtro de estado e «Incluir prospectos», orden con
 * su sentido, y la lista. Pantalla de presentación: recibe la vista y los datos por props y avisa de cada cambio.
 */
export function CustomerListScreen({
  nav,
  banner,
  isOnline,
  params,
  onParamsChange,
  view,
  loading = false,
  error = false,
  onRetry,
  selectedId,
  customerHref,
  onOpenCustomer,
  onNewCustomer,
  detail,
}: CustomerListScreenProps) {
  const state = customerListScreenState({ params, view, loading, error, isOnline });
  const set = (patch: Partial<CustomerListParams>) => onParamsChange({ ...params, ...patch });
  const tabCount = (tab: CustomerListTab) => view?.counts[tab];

  const toggleStatus = (status: PaymentStanding, on: boolean) =>
    set({
      statusFilter: on
        ? STANDINGS.filter((s) => s === status || params.statusFilter.includes(s))
        : params.statusFilter.filter((s) => s !== status),
    });

  const chips = [
    ...params.statusFilter.map((status) => ({ id: status, label: copy.status[status] })),
    ...(params.tab === 'all' && params.includeProspects
      ? [{ id: PROSPECTS_CHIP, label: t.prospectsChip }]
      : []),
    ...(isDefaultSort(params.sort) ? [] : [{ id: SORT_CHIP, label: t.sort[params.sort.key] }]),
  ];

  const filters: ViewBarFilters = {
    label: t.filter,
    panel: (
      <div className={styles.filters}>
        {STANDINGS.map((status) => (
          <Choice
            key={status}
            label={t.statusOption(copy.status[status], view?.statusCounts[status] ?? 0)}
            checked={params.statusFilter.includes(status)}
            onCheckedChange={(on) => toggleStatus(status, on)}
          />
        ))}
        {params.tab === 'all' && (
          <Choice
            kind="switch"
            label={t.includeProspects}
            checked={params.includeProspects}
            onCheckedChange={(on) => set({ includeProspects: on })}
          />
        )}
      </div>
    ),
    activeChips: chips,
    onRemove: (id) => {
      if (id === SORT_CHIP) set({ sort: DEFAULT_CUSTOMER_LIST_PARAMS.sort });
      else if (id === PROSPECTS_CHIP) set({ includeProspects: false });
      else set({ statusFilter: params.statusFilter.filter((s) => s !== id) });
    },
    // CA-2: «Limpiar» vuelve a la vista por defecto (filtros, prospectos y orden); la pestaña y la búsqueda siguen.
    onClear: () =>
      set({
        statusFilter: DEFAULT_CUSTOMER_LIST_PARAMS.statusFilter,
        includeProspects: DEFAULT_CUSTOMER_LIST_PARAMS.includeProspects,
        sort: DEFAULT_CUSTOMER_LIST_PARAMS.sort,
      }),
  };

  const sort: ViewBarSort = {
    options: SORT_KEYS.map((key) => ({ id: key, label: t.sort[key] })),
    value: params.sort.key,
    direction: params.sort.dir,
    onChange: ({ value, direction }) => {
      const key = value as CustomerSortKey;
      // BR-CUS-05: al cambiar de criterio se usa su sentido por defecto; si no, el elegido.
      set({ sort: { key, dir: key === params.sort.key ? direction : DEFAULT_SORT_DIR[key] } });
    },
  };

  const newCustomer = { label: t.newCustomer, icon: 'new-customer' as const, onClick: () => onNewCustomer() };
  const emptyState = ((): Omit<EmptyStateProps, 'kind'> | undefined => {
    switch (state.kind) {
      case 'empty':
        return { ...t.empty, action: { ...newCustomer, disabled: !isOnline } };
      case 'empty-tab':
        return { title: t.emptyTab.title };
      case 'filtered':
        return t.filtered;
      case 'no-results':
        return {
          title: t.noResults.title(state.query),
          text: t.noResults.text,
          action: {
            label: t.noResults.create(state.createName),
            icon: 'new-customer',
            onClick: () => onNewCustomer(state.createName),
            disabled: !isOnline,
          },
          ...(state.canSearchArchived
            ? {
                secondaryAction: {
                  label: t.noResults.searchArchived,
                  onClick: () => set({ includeArchivedInSearch: true }),
                },
              }
            : {}),
        };
      case 'offline-empty':
        return t.offline;
      case 'error':
        return { ...t.error, ...(onRetry ? { action: { label: copy.errors.retry, onClick: onRetry } } : {}) };
      default:
        return undefined;
    }
  })();

  const rows = view?.rows ?? [];
  return (
    <ListTemplate
      skeleton={<ListSkeletonFor columns={['person', 'text', 'amount', 'pill']} />}
      nav={{
        ...nav,
        fab: {
          icon: 'new-customer',
          label: t.newCustomer,
          onClick: () => onNewCustomer(),
          disabled: !isOnline,
        },
      }}
      header={{
        title: t.title,
        count: tabCount(params.tab),
        primaryAction: { ...newCustomer, disabled: !isOnline },
      }}
      viewBar={{
        views: {
          'aria-label': t.tabsLabel,
          items: TABS.map((tab) => ({ id: tab, label: t.tabs[tab], count: tabCount(tab) })),
          value: params.tab,
          onValueChange: (tab) => set({ tab: tab as CustomerListTab }),
        },
        search: {
          placeholder: t.search,
          value: params.search ?? '',
          onValueChange: (search) =>
            onParamsChange(
              search
                ? { ...params, search }
                : { ...params, search: undefined, includeArchivedInSearch: undefined },
            ),
          resultsAnnouncement: params.search && view ? t.results(rows.length) : undefined,
        },
        filters,
        sort,
      }}
      banner={banner}
      state={LIST_STATE[state.kind]}
      emptyState={emptyState}
      detail={detail}
    >
      <ListTable kind="customer" aria-label={t.title}>
        <ListRow variant="header" kind="customer" groupLabel={t.tabs[params.tab]} groupCount={rows.length} />
        {rows.map((row) => (
          <CustomerRow
            key={row.id}
            row={row}
            selected={row.id === selectedId}
            href={customerHref(row.id)}
            onOpen={(event) => {
              if (!plainClick(event)) return;
              event.preventDefault();
              onOpenCustomer(row.id);
            }}
          />
        ))}
      </ListTable>
    </ListTemplate>
  );
}

function CustomerRow({
  row,
  selected,
  href,
  onOpen,
}: {
  row: CustomerListRow;
  selected: boolean;
  href: string;
  onOpen: (event: MouseEvent) => void;
}) {
  return (
    <ListRow
      kind="customer"
      title={row.archived ? t.archived(row.name) : row.name}
      avatar={row.avatarEmoji ? { kind: 'emoji', emoji: row.avatarEmoji } : { kind: 'person' }}
      books={row.books ? { first: row.books.title, more: row.books.extraCount } : undefined}
      phone={row.phone ?? undefined}
      // Saldo pendiente; un prospecto no tiene saldo («—»). El saldo a favor se ve en la ficha.
      amount={row.isProspect ? undefined : Math.max(row.balance, 0)}
      date={row.lastPaymentAt ?? undefined}
      status={row.standing ?? undefined}
      selected={selected}
      href={href}
      onOpen={onOpen}
    />
  );
}
