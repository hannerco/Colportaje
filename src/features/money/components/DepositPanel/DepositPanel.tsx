'use client';

import { useState, type ReactNode } from 'react';
import { copy } from '@/copy/es';
import type { DepositPayment } from '@/domain/deposit-draft';
import { formatCOP, type COP } from '@/domain/money';
import { formatDate } from '@/domain/time';
import { Icon } from '@/ui/icons';
import { Island } from '@/ui/organisms/Island';
import styles from './DepositPanel.module.css';

const t = copy.money.depositPanel;
const methods = copy.money.depositEditor.methods;

export const signedCOP = (amount: COP) =>
  amount === 0 ? formatCOP(0) : `${amount < 0 ? '−' : '+'}${formatCOP(Math.abs(amount))}`;

/** Cuántos abonos hay por medio (para «4 abonos» de cada tarjeta). */
export const depositCounts = (payments: readonly Pick<DepositPayment, 'method'>[]) => ({
  total: payments.length,
  cash: payments.filter((p) => p.method === 'cash').length,
  transfer: payments.filter((p) => p.method === 'transfer').length,
});

/**
 * Cabecera del Abibono (#71, diseño «AbibonoPanel»): ícono, nombre (o su campo), estado y fecha; debajo, el Total grande
 * con cuántos abonos lleva y, al lado, Efectivo y Transferencia con lo suyo.
 */
export function DepositHeader({
  title,
  status,
  date,
  total,
  cash,
  transfer,
  counts,
}: {
  /** El nombre: un `<h2>` o el campo para escribirlo. */
  title: ReactNode;
  /** La Pastilla (Entregado, Borrador) o nada. */
  status?: ReactNode;
  /** La fecha: un chip o el botón que la cambia. */
  date: ReactNode;
  total: COP;
  cash: COP;
  transfer: COP;
  counts: { total: number; cash: number; transfer: number };
}) {
  return (
    <Island>
      <div className={styles.head}>
        <span className={styles.badge} aria-hidden="true">
          <Icon name="money" tone="current" />
        </span>
        <div className={styles.title}>{title}</div>
        {status}
        <span className={styles.spacer} />
        {date}
      </div>
      <div className={styles.totals}>
        <div className={styles.total}>
          <div className={styles.totalHead}>
            <span>{t.total}</span>
            <span className={styles.chip}>{t.payments(counts.total)}</span>
          </div>
          <div className={styles.figure}>{formatCOP(total)}</div>
        </div>
        <div className={styles.split}>
          <MethodCard method="cash" amount={cash} count={counts.cash} />
          <MethodCard method="transfer" amount={transfer} count={counts.transfer} />
        </div>
      </div>
    </Island>
  );
}

function MethodCard({ method, amount, count }: { method: 'cash' | 'transfer'; amount: COP; count: number }) {
  return (
    <div className={styles.method}>
      <span className={styles.methodIcon} aria-hidden="true">
        <Icon name={method === 'cash' ? 'money' : 'transfer'} size={16} tone="current" />
      </span>
      <span className={styles.methodText}>
        <span>{methods[method]}</span>
        <span className={styles.muted}>{t.payments(count)}</span>
      </span>
      <span className={styles.methodAmount}>{formatCOP(amount)}</span>
    </div>
  );
}

/** La fecha del Abibono como chip (solo lectura). */
export function DateChip({ date }: { date: Parameters<typeof formatDate>[0] }) {
  return (
    <span className={styles.dateChip}>
      <Icon name="calendar" size={16} tone="current" />
      {formatDate(date)}
    </span>
  );
}

/**
 * Isla «Abonos» del Abibono (#71): Cliente · Fecha real · Método · Valor real. Al inicio de cada fila, la casilla para
 * incluirlo (borrador) o el candado (entregado). `headerEnd`: «Todos» / «Ninguno» en el borrador.
 */
export function DepositPaymentsIsland({
  payments,
  leading,
  href,
  headerEnd,
  caption,
  leadingLabel,
}: {
  payments: readonly DepositPayment[];
  /** El título (oculto) de la primera columna: «Bloqueado» o «Incluir». */
  leadingLabel: string;
  leading: (payment: DepositPayment) => ReactNode;
  /** Sin función, la fila no es enlace. */
  href?: (paymentId: string) => string;
  headerEnd?: ReactNode;
  /** Junto al título: cuántos hay o «3 de 5 seleccionados». */
  caption: string;
}) {
  return (
    <section className={styles.island} aria-label={t.paymentsTitle}>
      <div className={styles.islandHead}>
        <Icon name="collected" size={16} tone="current" />
        <h2 className={styles.islandTitle}>{t.paymentsTitle}</h2>
        <span className={styles.muted}>{caption}</span>
        <span className={styles.spacer} />
        {headerEnd}
      </div>
      <div role="table" aria-label={t.paymentsTitle} className={styles.table}>
        <div role="row" className={`${styles.row} ${styles.headRow}`}>
          <span role="columnheader" className={styles.lead}>
            <span className={styles.visuallyHidden}>{leadingLabel}</span>
          </span>
          <span role="columnheader">{t.columns.customer}</span>
          <span role="columnheader">{t.columns.paidAt}</span>
          <span role="columnheader">{t.columns.method}</span>
          <span role="columnheader" className={styles.end}>
            {t.columns.amount}
          </span>
        </div>
        {payments.map((p) => (
          <div role="row" key={p.paymentId} className={styles.row}>
            <span role="cell" className={styles.lead}>
              {leading(p)}
            </span>
            <span role="cell" className={styles.customer}>
              {href ? (
                <a className={styles.link} href={href(p.paymentId)}>
                  {p.customerName}
                </a>
              ) : (
                p.customerName
              )}
            </span>
            <span role="cell" className={styles.number}>
              {formatDate(p.paidAt)}
            </span>
            <span role="cell" className={styles.methodCell}>
              <Icon name={p.method === 'cash' ? 'money' : 'transfer'} size={16} tone="current" />
              {methods[p.method]}
            </span>
            <span role="cell" className={`${styles.number} ${styles.end} ${styles.strong}`}>
              {formatCOP(p.paidAmount)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Una isla pequeña con ícono y título (Lo que entregas, Recibo, Cuadre). */
export function PanelIsland({
  title,
  icon,
  children,
}: {
  title: string;
  icon: 'money' | 'receipt' | 'info';
  children: ReactNode;
}) {
  return (
    <section className={styles.island} aria-label={title}>
      <div className={`${styles.islandHead} ${styles.divided}`}>
        <Icon name={icon} size={16} tone="current" />
        <h2 className={styles.islandTitle}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

/** «Lo que entregas» en solo lectura (entregado). */
export function AmountsReadOnly({ cash, transfer }: { cash: COP; transfer: COP }) {
  return (
    <dl className={styles.lines}>
      {(['cash', 'transfer'] as const).map((method) => (
        <div key={method} className={styles.line}>
          <dt>
            <Icon name={method === 'cash' ? 'money' : 'transfer'} size={16} tone="current" />
            {methods[method]}
          </dt>
          <dd className={`${styles.number} ${styles.strong}`}>
            {formatCOP(method === 'cash' ? cash : transfer)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** «Cuadre»: Esperado y Diferencia, cada uno con su «Qué es» (#71). */
export function BalanceLines({ expected, difference }: { expected: COP; difference: COP }) {
  const [tip, setTip] = useState<'expected' | 'difference' | null>(null);
  const e = copy.money.depositEditor;
  const rows = [
    {
      id: 'expected' as const,
      label: e.expected,
      info: e.expectedInfo,
      value: formatCOP(expected),
      bad: false,
    },
    {
      id: 'difference' as const,
      label: e.difference,
      info: e.differenceInfo,
      value: `${signedCOP(difference)}${difference === 0 ? '' : ` · ${difference < 0 ? e.shortfall : e.surplus}`}`,
      bad: difference !== 0,
    },
  ];
  return (
    <>
      <dl className={styles.lines}>
        {rows.map((row) => (
          <div key={row.id} className={styles.line}>
            <dt>
              {row.label}
              <button
                type="button"
                className={styles.info}
                aria-label={row.info}
                aria-expanded={tip === row.id}
                onClick={() => setTip(tip === row.id ? null : row.id)}
              >
                <Icon name="info" size={14} tone="current" />
              </button>
            </dt>
            <dd className={`${styles.number} ${row.bad ? styles.bad : ''}`}>{row.value}</dd>
          </div>
        ))}
      </dl>
      {tip && (
        <p role="status" className={styles.muted}>
          {tip === 'expected' ? e.expectedTip : e.differenceTip}
        </p>
      )}
    </>
  );
}

/** La parte de abajo: a la izquierda Lo que entregas y Recibo; a la derecha el Cuadre. */
export function PanelColumns({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className={styles.columns}>
      <div className={styles.column}>{left}</div>
      <div className={styles.column}>{right}</div>
    </div>
  );
}

/** La barra de abajo con las acciones (Reabrir; Borrar borrador, Guardar borrador y Marcar como entregado). */
export function PanelFooter({ start, end }: { start?: ReactNode; end?: ReactNode }) {
  return (
    <div className={styles.footer}>
      {start}
      <span className={styles.spacer} />
      {end}
    </div>
  );
}

export const panelStyles = styles;
