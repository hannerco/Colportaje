'use client';

import { useState, type ReactNode } from 'react';
import { copy } from '@/copy/es';
import { formatCOP } from '@/domain/money';
import type { MoneySummary as MoneySummaryData, UnscheduledCustomer } from '@/domain/money-summary';
import type { PayMethod } from '@/domain/payment';
import {
  defaultPaymentsSort,
  type PaymentsListParams,
  type PaymentsListView,
  type PaymentsSortKey,
  type PaymentsView,
} from '@/domain/payments-list';
import { Avatar } from '@/ui/atoms/Avatar';
import { Button } from '@/ui/atoms/Button';
import { Choice } from '@/ui/atoms/Choice';
import type { AppNavProps } from '@/ui/organisms/AppNav';
import type { EmptyStateProps } from '@/ui/organisms/EmptyState';
import type { ViewBarFilters, ViewBarSort } from '@/ui/organisms/ViewBar';
import { ListTemplate, type ListState } from '@/ui/templates/ListTemplate';
import { useMoneyChrome } from '../../components/MoneyChrome';
import { PaymentsTable } from '../../components/PaymentsTable';
import styles from './MoneyScreen.module.css';

export type MoneyScreenProps = {
  /** Navegación del armazón (`useAppShell().nav`). */
  nav: AppNavProps;
  banner?: ReactNode;
  isOnline: boolean;
  /** La vista: pestaña, método, «solo vencidos», búsqueda y orden (la del contenedor, que la lee de la URL). */
  params: PaymentsListParams;
  onParamsChange: (params: PaymentsListParams) => void;
  /** `usePaymentsList(params).data`; sin valor mientras carga o si falló. */
  view?: PaymentsListView;
  /** `useMoneySummary().data` y `useUnscheduledCustomers().data`. */
  summary?: MoneySummaryData;
  unscheduled?: readonly UnscheduledCustomer[];
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  /** Cuántos Abibonos hay (el segmento «Abibonos»). */
  depositsCount?: number;
  onOpenDeposits: () => void;
  /** «Entregar al líder»: abre Nuevo Abibono precargado (HU-PAN-DIN-04). */
  onDeliver: () => void;
  /** Deslizar en móvil (CA-5): cobrar o dar más plazo lleva al formulario del abono. */
  onCollectPayment: (paymentId: string) => void;
  onExtendPayment: (paymentId: string) => void;
  /** Ruta del detalle del abono (HU-PAN-DIN-02) y de la ficha de un cliente. */
  paymentHref: (paymentId: string) => string;
  customerHref: (customerId: string) => string;
  /** Ruta de Dinero (vuelta de la hoja de resumen en móvil). */
  backHref: string;
  /** Escritorio (#29): abrir un abono en la Ventana de detalle (forma Lateral o Centrada). */
  onOpenPayment?: (paymentId: string) => void;
  /** El abono abierto (fila resaltada) y la Ventana con su detalle. */
  selectedId?: string;
  detail?: ReactNode;
};

const t = copy.money.list;
const VIEWS: PaymentsView[] = ['all', 'to_collect', 'to_deliver', 'delivered', 'canceled'];
const SORT_KEYS: PaymentsSortKey[] = ['agreed_date', 'paid_date', 'agreed_amount', 'paid_amount', 'customer'];
const COUNT_OF: Record<PaymentsView, keyof PaymentsListView['counts']> = {
  all: 'all',
  to_collect: 'toCollect',
  to_deliver: 'toDeliver',
  delivered: 'delivered',
  canceled: 'canceled',
};
const METHODS: PayMethod[] = ['cash', 'transfer'];
const SORT_CHIP = 'sort';
const METHOD_CHIP = 'method';

/**
 * Dinero: resumen y abonos de clientes (HU-PAN-DIN-01, diseño «1 · Abonos de clientes», «2 · Por cobrar y Cobrar» y
 * «5 · Estados»): cuánto hay que entregar al líder (en escritorio, arriba de la lista; en móvil, en una hoja que abre el
 * botón del Encabezado), las pestañas por estado con conteos que no cambian con la búsqueda (I-12), los filtros
 * Método y «solo vencidos», el orden y, en Por cobrar, lo programado y la lista de clientes sin programar.
 */
export function MoneyScreen(props: MoneyScreenProps) {
  const {
    nav,
    banner,
    isOnline,
    params,
    onParamsChange,
    view,
    summary,
    loading = false,
    error = false,
  } = props;
  const [unscheduledOpen, setUnscheduledOpen] = useState(false);
  const set = (patch: Partial<PaymentsListParams>) => onParamsChange({ ...params, ...patch });

  const usesMethod = params.view !== 'to_collect' && params.view !== 'canceled';
  const usesOverdue = params.view === 'to_collect';
  const rows = view?.rows ?? [];
  const showUnscheduled = unscheduledOpen && params.view === 'to_collect';
  const unscheduled = props.unscheduled ?? [];

  const state: ListState = !view
    ? error && !loading
      ? isOnline
        ? 'error'
        : 'offline-empty'
      : 'loading'
    : showUnscheduled
      ? unscheduled.length > 0
        ? 'ready'
        : 'empty'
      : rows.length > 0
        ? 'ready'
        : params.search
          ? 'no-results'
          : 'empty';

  const emptyState = ((): Omit<EmptyStateProps, 'kind'> | undefined => {
    switch (state) {
      case 'empty':
        if (showUnscheduled) return t.unscheduledEmpty;
        return params.view === 'all' && !params.overdueOnly && params.method === null ? t.empty : t.emptyTab;
      case 'no-results':
        return { title: t.noResults.title(params.search), text: t.noResults.text };
      case 'offline-empty':
        return t.offline;
      case 'error':
        return {
          ...t.error,
          ...(props.onRetry ? { action: { label: copy.errors.retry, onClick: props.onRetry } } : {}),
        };
      default:
        return undefined;
    }
  })();

  const defaultSort = defaultPaymentsSort(params.view);
  const sortIsDefault = params.sort.key === defaultSort.key && params.sort.dir === defaultSort.dir;
  const chips = [
    ...(usesMethod && params.method ? [{ id: METHOD_CHIP, label: t.methods[params.method] }] : []),
    ...(usesOverdue && params.overdueOnly ? [{ id: 'overdue', label: t.overdueChip }] : []),
    ...(sortIsDefault ? [] : [{ id: SORT_CHIP, label: t.sort[params.sort.key] }]),
  ];

  const filters: ViewBarFilters = {
    label: t.filter,
    panel: (
      <div className={styles.filters}>
        {usesMethod &&
          METHODS.map((method) => (
            <Choice
              key={method}
              label={t.methods[method]}
              checked={params.method === method}
              onCheckedChange={(on) => set({ method: on ? method : null })}
            />
          ))}
        {usesOverdue && (
          <Choice
            kind="switch"
            label={t.overdueOnly}
            checked={params.overdueOnly}
            onCheckedChange={(on) => set({ overdueOnly: on })}
          />
        )}
      </div>
    ),
    activeChips: chips,
    onRemove: (id) => {
      if (id === SORT_CHIP) set({ sort: defaultSort });
      else if (id === METHOD_CHIP) set({ method: null });
      else set({ overdueOnly: false });
    },
    onClear: () => set({ method: null, overdueOnly: false, sort: defaultSort }),
  };

  const sort: ViewBarSort = {
    options: SORT_KEYS.map((key) => ({ id: key, label: t.sort[key] })),
    value: params.sort.key,
    direction: params.sort.dir,
    onChange: ({ value, direction }) => set({ sort: { key: value as PaymentsSortKey, dir: direction } }),
  };

  const changeView = (next: PaymentsView) => {
    setUnscheduledOpen(false);
    // El orden por defecto sigue a la pestaña (Por cobrar: la más antigua primero); uno elegido se conserva.
    set({ view: next, sort: sortIsDefault ? defaultPaymentsSort(next) : params.sort });
  };

  const chrome = useMoneyChrome({
    summary,
    onDeliver: props.onDeliver,
    backHref: props.backHref,
    active: 'payments',
    paymentsCount: view?.counts.all,
    depositsCount: props.depositsCount,
    onOpenPayments: () => {},
    onOpenDeposits: props.onOpenDeposits,
  });

  return (
    <>
      <ListTemplate
        nav={nav}
        header={{ title: t.title, ...chrome.header }}
        sections={chrome.sections}
        viewBar={{
          views: {
            'aria-label': t.tabsLabel,
            items: VIEWS.map((id) => ({ id, label: t.tabs[id], count: view?.counts[COUNT_OF[id]] })),
            value: params.view,
            onValueChange: (next) => changeView(next as PaymentsView),
          },
          search: {
            placeholder: t.search,
            value: params.search,
            onValueChange: (search) => set({ search }),
            resultsAnnouncement: params.search && view ? t.results(rows.length) : undefined,
          },
          filters,
          sort,
        }}
        banner={
          <>
            {banner}
            {chrome.aboveList}
          </>
        }
        state={state}
        emptyState={emptyState}
        detail={props.detail}
      >
        {params.view === 'to_collect' && summary && (
          <div className={styles.scheduled}>
            <span className={styles.figure}>
              <span className={styles.figureLabel}>{t.scheduled}</span>
              {formatCOP(summary.scheduledTotal)}
            </span>
            <span className={styles.figure}>
              <span className={styles.figureLabel}>{t.unscheduled}</span>
              {formatCOP(summary.unscheduledTotal)}
            </span>
            {summary.unscheduledCustomers > 0 &&
              (showUnscheduled ? (
                <Button variant="tertiary" icon="back" onClick={() => setUnscheduledOpen(false)}>
                  {t.unscheduledBack}
                </Button>
              ) : (
                <Button variant="secondary" size="compact" onClick={() => setUnscheduledOpen(true)}>
                  {t.unscheduledLink(formatCOP(summary.unscheduledTotal), summary.unscheduledCustomers)}
                </Button>
              ))}
          </div>
        )}
        {showUnscheduled ? (
          <ul className={styles.unscheduled} aria-label={t.unscheduledTitle}>
            {unscheduled.map((customer) => (
              <li key={customer.customerId} className={styles.unscheduledRow}>
                <Avatar
                  kind={customer.avatarEmoji ? 'emoji' : 'person'}
                  emoji={customer.avatarEmoji ?? undefined}
                  decorative
                />
                <a className={styles.unscheduledName} href={props.customerHref(customer.customerId)}>
                  {customer.name}
                </a>
                <span className={styles.amount}>{formatCOP(customer.unscheduled)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <PaymentsTable
            rows={rows}
            grouped={params.view === 'all'}
            paymentHref={props.paymentHref}
            onOpen={props.onOpenPayment}
            selectedId={props.selectedId}
            onCollect={props.onCollectPayment}
            onExtend={props.onExtendPayment}
            isOnline={isOnline}
            aria-label={t.payments}
          />
        )}
      </ListTemplate>
      {chrome.sheet}
    </>
  );
}
