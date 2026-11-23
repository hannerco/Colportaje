'use client';

import { copy } from '@/copy/es';
import type { DepositsListRow } from '@/domain/deposits-list';
import { formatCOP } from '@/domain/money';
import { formatDate } from '@/domain/time';
import { StatusPill } from '@/ui/atoms/StatusPill';
import { Icon } from '@/ui/icons';
import { usePlatform } from '@/ui/platform';
import styles from './DepositsTable.module.css';

export type DepositsTableProps = {
  rows: readonly DepositsListRow[];
  /** Ruta del Abibono (borrador: HU-PAN-DIN-04; entregado: HU-PAN-DIN-05). */
  depositHref: (depositId: string) => string;
  /** Escritorio (#29): un clic normal en el nombre abre el Abibono en la Ventana de detalle. */
  onOpen?: (depositId: string) => void;
  /** El Abibono abierto en la Ventana (fila resaltada). */
  selectedId?: string;
  'aria-label': string;
};

const t = copy.money.deposits;
const pillOf = (row: DepositsListRow) => (
  <StatusPill status={row.status === 'draft' ? 'draft' : 'delivered'} locked={row.status === 'confirmed'} />
);

/**
 * Tabla de Abibonos (pieza de Dinero, lienzo «3 · Abibonos»): en escritorio, columnas Nombre · Fecha · Total ·
 * Efectivo · Transferencia · Estado · Recibo; en móvil, filas de dos líneas con el total, el nombre y la fecha. El
 * Abibono entregado lleva la Pastilla con candado; el borrador, la suya con borde punteado.
 */
export function DepositsTable({
  rows,
  depositHref,
  onOpen,
  selectedId,
  'aria-label': ariaLabel,
}: DepositsTableProps) {
  const mobile = usePlatform() === 'mobile';
  if (mobile)
    return (
      <ul className={styles.list} aria-label={ariaLabel}>
        {rows.map((row) => (
          <li key={row.depositId}>
            <a className={styles.mobileRow} href={depositHref(row.depositId)}>
              <span className={styles.mobileMain}>
                <span className={styles.mobileName}>{row.title}</span>
                <span className={styles.number}>{formatCOP(row.total)}</span>
              </span>
              <span className={styles.mobileMeta}>
                {pillOf(row)}
                <span>{formatDate(row.depositDate)}</span>
                {row.hasReceipt && <Icon name="receipt" size={16} tone="current" label={t.receipt} />}
              </span>
            </a>
          </li>
        ))}
      </ul>
    );
  return (
    <table className={styles.table} aria-label={ariaLabel}>
      <thead>
        <tr>
          {(['name', 'date', 'total', 'cash', 'transfer', 'status', 'receipt'] as const).map((column) => (
            <th
              key={column}
              scope="col"
              className={
                column === 'total' || column === 'cash' || column === 'transfer' ? styles.end : undefined
              }
            >
              {t.columns[column]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.depositId}
            className={styles.row}
            aria-current={row.depositId === selectedId || undefined}
            data-selected={row.depositId === selectedId || undefined}
          >
            <td>
              <a
                className={styles.link}
                href={depositHref(row.depositId)}
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
                    onOpen(row.depositId);
                  })
                }
              >
                {row.title}
              </a>
            </td>
            <td className={styles.number}>{formatDate(row.depositDate)}</td>
            <td className={`${styles.number} ${styles.end}`}>{formatCOP(row.total)}</td>
            <td className={`${styles.number} ${styles.end} ${row.cash === 0 ? styles.muted : ''}`}>
              {formatCOP(row.cash)}
            </td>
            <td className={`${styles.number} ${styles.end} ${row.transfer === 0 ? styles.muted : ''}`}>
              {formatCOP(row.transfer)}
            </td>
            <td>{pillOf(row)}</td>
            <td>
              {row.hasReceipt ? (
                <Icon name="receipt" size={18} tone="current" label={t.receipt} />
              ) : (
                copy.ui.listRow.empty
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
