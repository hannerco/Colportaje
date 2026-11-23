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
  /** La pestaña «Todos» agrupa por estado en móvil (Por cobrar, Cobrado, Entregado). */
  grouped?: boolean;
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
  grouped = false,
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
      <MobileList
        rows={rows}
        grouped={grouped}
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

const GROUPS = ['scheduled', 'collected', 'delivered'] as const;

function MobileList({
  rows,
  grouped,
  paymentHref,
  label,
  swipe,
}: {
  rows: readonly PaymentsListRow[];
  grouped: boolean;
  paymentHref: (paymentId: string) => string;
  label: string;
  swipe: Swipe;
}) {
  if (!grouped) return <Rows rows={rows} paymentHref={paymentHref} label={label} swipe={swipe} />;
  return (
    <>
      {GROUPS.map((status) => {
        const inGroup = rows.filter((row) => row.status === status);
        return inGroup.length === 0 ? null : (
          <section key={status} className={styles.group}>
            <h2 className={styles.groupName}>{copy.status[status]}</h2>
            <Rows rows={inGroup} paymentHref={paymentHref} label={copy.status[status]} swipe={swipe} />
          </section>
        );
      })}
    </>
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
              <a className={styles.mobileRow} href={paymentHref(row.paymentId)}>
                <span className={styles.mobileMain}>
                  <span className={styles.mobileAmount}>{cop(row.paidAmount ?? row.agreedAmount)}</span>
                  <span className={styles.mobileName}>
                    {row.customer.name}
                    {row.customer.archived && <span className={styles.muted}> {t.archivedCustomer}</span>}
                  </span>
                </span>
                <span className={styles.mobileDate}>
                  <StatusPill status={statusOf(row)} shape="text" />
                  <span>
                    {day(row.paidAt ?? row.agreedDate)}
                    {row.isOverdue && <span className={styles.overdue}>{t.overdue(row.overdueDays)}</span>}
                  </span>
                  {row.method && <Method method={row.method} />}
                </span>
              </a>
            </SwipeRow>
          ) : (
            <a className={styles.mobileRow} href={paymentHref(row.paymentId)}>
              <span className={styles.mobileMain}>
                <span className={styles.mobileAmount}>{cop(row.paidAmount ?? row.agreedAmount)}</span>
                <span className={styles.mobileName}>
                  {row.customer.name}
                  {row.customer.archived && <span className={styles.muted}> {t.archivedCustomer}</span>}
                </span>
              </span>
              <span className={styles.mobileDate}>
                <StatusPill status={statusOf(row)} shape="text" />
                <span>
                  {day(row.paidAt ?? row.agreedDate)}
                  {row.isOverdue && <span className={styles.overdue}>{t.overdue(row.overdueDays)}</span>}
                </span>
                {row.method && <Method method={row.method} />}
              </span>
            </a>
          )}
        </li>
      ))}
    </ul>
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
