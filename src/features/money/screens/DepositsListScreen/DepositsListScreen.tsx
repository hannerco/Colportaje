'use client';

import { useState, type ReactNode } from 'react';
import { copy } from '@/copy/es';
import type { DepositsListParams, DepositsListView, DepositsSortKey } from '@/domain/deposits-list';
import { formatCOP } from '@/domain/money';
import type { MoneySummary as MoneySummaryData } from '@/domain/money-summary';
import { Button } from '@/ui/atoms/Button';
import { Icon } from '@/ui/icons';
import type { AppNavProps } from '@/ui/organisms/AppNav';
import type { EmptyStateProps } from '@/ui/organisms/EmptyState';
import type { ViewBarSort } from '@/ui/organisms/ViewBar';
import { usePlatform } from '@/ui/platform';
import { ListTemplate, type ListState } from '@/ui/templates/ListTemplate';
import { DepositsTable } from '../../components/DepositsTable';
import { useMoneyChrome } from '../../components/MoneyChrome';
import styles from './DepositsListScreen.module.css';

export type DepositsListScreenProps = {
  /** Navegación del armazón (`useAppShell().nav`). */
  nav: AppNavProps;
  banner?: ReactNode;
  isOnline: boolean;
  /** La vista: búsqueda y orden (la del contenedor, que la lee de la URL). */
  params: DepositsListParams;
  onParamsChange: (params: DepositsListParams) => void;
  /** `useDepositsList(params).data`; sin valor mientras carga o si falló. */
  view?: DepositsListView;
  /** `useMoneySummary().data`: el mismo resumen que Abonos de clientes. */
  summary?: MoneySummaryData;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  /** Cuántos abonos hay (el segmento «Abonos de clientes»). */
  paymentsCount?: number;
  onOpenPayments: () => void;
  /** «Entregar al líder»: abre Nuevo Abibono precargado (HU-PAN-DIN-04). */
  onDeliver: () => void;
  /** Ruta del Abibono: borrador (HU-PAN-DIN-04) o entregado (HU-PAN-DIN-05). */
  depositHref: (depositId: string) => string;
  /** Ruta de Dinero (vuelta de la hoja de resumen en móvil). */
  backHref: string;
};

const t = copy.money.deposits;
const SORT_KEYS: DepositsSortKey[] = ['date', 'total', 'name'];

/**
 * Lista de Abibonos (HU-PAN-DIN-03, diseño «3 · Abibonos», BR-DEP-02, BR-DEP-14): el mismo encabezado y resumen que
 * Dinero con el segmento en «Abibonos», el buscador, el orden (fecha, total o nombre), el «Total abonado al líder» y la
 * lista con nombre, fecha, total, método, Pastilla (Borrador, o Entregado con candado) y recibo. El ⓘ explica «Entrega
 * al líder». Pantalla de presentación: datos y acciones por props.
 */
export function DepositsListScreen(props: DepositsListScreenProps) {
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
  const mobile = usePlatform() === 'mobile';
  const [tipOpen, setTipOpen] = useState<null | 'deposit' | 'total'>(null);
  const set = (patch: Partial<DepositsListParams>) => onParamsChange({ ...params, ...patch });
  const rows = view?.rows ?? [];

  const chrome = useMoneyChrome({
    summary,
    onDeliver: props.onDeliver,
    backHref: props.backHref,
    active: 'deposits',
    paymentsCount: props.paymentsCount,
    depositsCount: view?.count,
    onOpenPayments: props.onOpenPayments,
    onOpenDeposits: () => {},
  });

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
        // CA-3: el estado vacío del lienzo, con «Entregar al líder».
        return {
          ...t.empty,
          action: {
            label: copy.money.summary.deliver,
            icon: 'money',
            onClick: props.onDeliver,
            disabled: !isOnline || !summary || summary.toDeliver.total === 0,
          },
        };
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

  const sort: ViewBarSort = {
    options: SORT_KEYS.map((key) => ({ id: key, label: t.sort[key] })),
    value: params.sort.key,
    direction: params.sort.dir,
    onChange: ({ value, direction }) => set({ sort: { key: value as DepositsSortKey, dir: direction } }),
  };

  const toggle = (tip: 'deposit' | 'total') => setTipOpen((open) => (open === tip ? null : tip));

  return (
    <>
      <ListTemplate
        nav={nav}
        header={{ title: copy.money.list.title, ...chrome.header }}
        sections={chrome.sections}
        viewBar={{
          views: {
            'aria-label': t.tabsLabel,
            items: [{ id: 'all', label: t.all, count: view?.count }],
            value: 'all',
          },
          search: {
            placeholder: t.search,
            value: params.search,
            onValueChange: (search) => set({ search }),
            resultsAnnouncement: params.search && view ? t.results(rows.length) : undefined,
          },
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
      >
        <div className={styles.total}>
          <span className={styles.totalLabel}>{t.totalDelivered}</span>
          <Button
            variant="tertiary"
            iconOnly
            icon="info"
            aria-expanded={tipOpen === 'total'}
            onClick={() => toggle('total')}
          >
            {t.totalDeliveredInfo}
          </Button>
          <span className={styles.totalAmount}>{formatCOP(view?.totalDeliveredToLeader ?? 0)}</span>
          {!mobile && (
            <button
              type="button"
              className={styles.info}
              aria-label={t.info}
              aria-expanded={tipOpen === 'deposit'}
              onClick={() => toggle('deposit')}
            >
              <Icon name="info" size={16} tone="current" />
            </button>
          )}
        </div>
        {tipOpen && (
          <p role="status" className={styles.tip}>
            {tipOpen === 'total' ? t.totalDeliveredTip : t.infoTip}
          </p>
        )}
        <DepositsTable rows={rows} depositHref={props.depositHref} aria-label={t.listLabel} />
      </ListTemplate>
      {chrome.sheet}
    </>
  );
}
