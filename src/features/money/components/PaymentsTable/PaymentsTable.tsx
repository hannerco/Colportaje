'use client';

import { copy } from '@/copy/es';
import { formatCOP } from '@/domain/money';
import type { PayMethod } from '@/domain/payment';
import type { PaymentsListRow } from '@/domain/payments-list';
import { formatDate } from '@/domain/time';
import { SwipeRow } from '@/features/inventory';
import { Avatar } from '@/ui/atoms/Avatar';
import { StatusPill } from '@/ui/atoms/StatusPill';
import { Icon } from '@/ui/icons';
import { usePlatform } from '@/ui/platform';
import styles from './PaymentsTable.module.css';

export type PaymentsTableProps = {
  rows: readonly PaymentsListRow[];
  /** Ruta del detalle del abono (HU-PAN-DIN-02). */
  paymentHref: (paymentId: string) => string;
  /** Escritorio (#29): un clic normal en el cliente abre el abono en la Ventana de detalle en vez de ir a la página. */
  onOpen?: (paymentId: string) => void;
  /** El abono abierto en la Ventana (fila resaltada). */
  selectedId?: string;
  /**
   * Móvil: deslizar un abono por cobrar a la izquierda muestra «Cobrar» y a la derecha «Más plazo»; llevan al mismo
   * formulario del detalle (CA-5). Sin conexión se ven deshabilitados.
   */
  onCollect?: (paymentId: string) => void;
  onExtend?: (paymentId: string) => void;
  isOnline?: boolean;
  'aria-label': string;
};

const t = copy.money.list;
const d = copy.payments.detail;
const cop = (amount: number | null) => (amount === null ? copy.ui.listRow.empty : formatCOP(amount));
const day = (date: Parameters<typeof formatDate>[0] | null) =>
  date === null ? copy.ui.listRow.empty : formatDate(date);
/** El estado que se ve: Vencido es una marca derivada del abono por cobrar (BR-PAY-08). */
const statusOf = (row: PaymentsListRow) => (row.isOverdue ? 'overdue' : row.status);

/**
 * Tabla de abonos de clientes (pieza de Dinero, lienzo «1 · Abonos de clientes»): en escritorio, columnas Cliente ·
 * Valor acordado · Fecha acordada · Estado · Fecha real · Valor real · Método; en móvil, filas de dos líneas con el
 * estado y el método como íconos. Abrir una fila lleva al abono.
 */
export function PaymentsTable({
  rows,
  paymentHref,
  onOpen,
  selectedId,
  onCollect,
  onExtend,
  isOnline = true,
  'aria-label': ariaLabel,
}: PaymentsTableProps) {
  const mobile = usePlatform() === 'mobile';
  if (mobile)
    return (
      // Diseño móvil («Dinero · Abonos de clientes»): una sola lista, sin grupos; el estado va en el ícono de cada fila.
      <Rows
        rows={rows}
        paymentHref={paymentHref}
        label={ariaLabel}
        swipe={{ onCollect, onExtend, isOnline }}
      />
    );
  return (
    <table className={styles.table} aria-label={ariaLabel}>
      <thead>
        <tr>
          {(
            ['customer', 'agreedAmount', 'agreedDate', 'status', 'paidAt', 'paidAmount', 'method'] as const
          ).map((column) => (
            <th
              key={column}
              scope="col"
              className={column === 'agreedAmount' || column === 'paidAmount' ? styles.end : undefined}
            >
              {t.columns[column]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.paymentId}
            className={styles.row}
            aria-current={row.paymentId === selectedId || undefined}
            data-selected={row.paymentId === selectedId || undefined}
          >
            <td>
              <span className={styles.customer}>
                <Avatar
                  kind={row.customer.avatarEmoji ? 'emoji' : 'person'}
                  emoji={row.customer.avatarEmoji ?? undefined}
                  decorative
                />
                <a
                  className={styles.link}
                  href={paymentHref(row.paymentId)}
                  onClick={
                    onOpen &&
                    ((event) => {
                      if (
                        event.button !== 0 ||
                        event.metaKey ||
                        event.ctrlKey ||
                        event.shiftKey ||
                        event.altKey
                      )
                        return;
                      event.preventDefault();
                      onOpen(row.paymentId);
                    })
                  }
                >
                  {row.customer.name}
                </a>
                {row.customer.archived && <span className={styles.muted}>{t.archivedCustomer}</span>}
              </span>
            </td>
            <td className={styles.end}>{cop(row.agreedAmount)}</td>
            <td>
              {day(row.agreedDate)}
              {row.isOverdue && <span className={styles.overdue}>{t.overdue(row.overdueDays)}</span>}
            </td>
            <td>
              <StatusPill status={statusOf(row)} />
            </td>
            <td>{day(row.paidAt)}</td>
            <td className={styles.end}>{cop(row.paidAmount)}</td>
            <td>{row.method ? <Method method={row.method} /> : copy.ui.listRow.empty}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Method({ method }: { method: PayMethod }) {
  return (
    <span className={styles.method}>
      <Icon name={method === 'cash' ? 'money' : 'transfer'} size={16} tone="current" />
      {t.methods[method]}
    </span>
  );
}

function Rows({
  rows,
  paymentHref,
  label,
  swipe,
}: {
  rows: readonly PaymentsListRow[];
  paymentHref: (paymentId: string) => string;
  label: string;
  swipe: Swipe;
}) {
  return (
    <ul className={styles.list} aria-label={label}>
      {rows.map((row) => (
        <li key={row.paymentId}>
          {row.canCollect && swipe.onCollect && swipe.onExtend ? (
            <SwipeRow
              disabled={!swipe.isOnline}
              start={action(
                d.swipe.extend(row.customer.name),
                d.extendShort,
                'calendar',
                () => swipe.onExtend?.(row.paymentId),
                swipe.isOnline,
              )}
              end={action(
                d.swipe.collect(row.customer.name),
                d.collect,
                'check',
                () => swipe.onCollect?.(row.paymentId),
                swipe.isOnline,
              )}
            >
              <MobileRow row={row} href={paymentHref(row.paymentId)} />
            </SwipeRow>
          ) : (
            <MobileRow row={row} href={paymentHref(row.paymentId)} />
          )}
        </li>
      ))}
    </ul>
  );
}

/** El ícono de la izquierda: el estado y, si ya se cobró, el medio de pago en una insignia. */
const STATUS_ICON = {
  scheduled: 'scheduled',
  overdue: 'scheduled',
  collected: 'collected',
  delivered: 'locked',
  canceled: 'canceled',
} as const;

/**
 * Fila del celular (diseño «Dinero · Abonos de clientes» móvil): ícono del estado (con el medio de pago), el valor en
 * negrita y el cliente debajo, y la fecha a la derecha (en rojo y con «hace N días» si está vencido).
 */
function MobileRow({ row, href }: { row: PaymentsListRow; href: string }) {
  const status = statusOf(row);
  return (
    <a className={styles.mobileRow} href={href}>
      <span className={styles.mobileIcon} data-status={status} aria-label={copy.status[status]} role="img">
        <Icon name={STATUS_ICON[status]} size={16} tone="current" />
        {row.method && (
          <span className={styles.mobileBadge}>
            <Icon name={row.method === 'cash' ? 'money' : 'transfer'} size={11} tone="current" />
          </span>
        )}
      </span>
      <span className={styles.mobileMain}>
        <span className={styles.mobileAmount}>{cop(row.paidAmount ?? row.agreedAmount)}</span>
        <span className={styles.mobileName}>
          {row.customer.name}
          {row.customer.archived && <span className={styles.muted}> {t.archivedCustomer}</span>}
        </span>
      </span>
      <span className={styles.mobileDate} data-overdue={row.isOverdue || undefined}>
        <span>{day(row.paidAt ?? row.agreedDate)}</span>
        {row.isOverdue && <span>{t.overdue(row.overdueDays)}</span>}
      </span>
    </a>
  );
}

type Swipe = {
  onCollect?: (paymentId: string) => void;
  onExtend?: (paymentId: string) => void;
  isOnline: boolean;
};

/** Un botón de la fila que se desliza (también se llega con el teclado). */
const action = (
  label: string,
  text: string,
  icon: 'check' | 'calendar',
  onClick: () => void,
  online: boolean,
) => (
  <button
    type="button"
    className={styles.swipeAction}
    data-tone={icon === 'check' ? 'accent' : 'neutral'}
    aria-label={label}
    aria-disabled={!online || undefined}
    onClick={() => {
      if (online) onClick();
    }}
  >
    <Icon name={icon} size={18} tone="current" />
    <span>{text}</span>
  </button>
);
