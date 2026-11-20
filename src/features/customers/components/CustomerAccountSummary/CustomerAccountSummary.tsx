import type { CSSProperties } from 'react';
import { copy } from '@/copy/es';
import type { CustomerAccount } from '@/domain/customer';
import { formatCOP } from '@/domain/money';
import { formatDate, type LocalDate } from '@/domain/time';
import { Icon } from '@/ui/icons';
import styles from './CustomerAccountSummary.module.css';

export type CustomerAccountSummaryProps = {
  /** La cuenta del cliente (`useCustomerDetail(id).data.account`). */
  account: Pick<
    CustomerAccount,
    'balance' | 'paidTotal' | 'debt' | 'credit' | 'unscheduled' | 'paidPct' | 'isProspect'
  >;
  /** La fecha acordada del abono vencido más antiguo, o `null` si no hay vencidos. */
  overdueSince: LocalDate | null;
  className?: string;
};

const t = copy.customers.detail.account;

/**
 * Cuenta del cliente en su ficha (HU-PAN-CLI-02, BR-CUS-10; diseño «2 · Ficha de cliente», bloque Saldo): saldo
 * pendiente en grande, la barra «Abonado el N %», abonado y deuda total, saldo a favor y sin programar si los hay, y
 * el aviso del abono vencido. Pieza del módulo: la biblioteca aún no tiene una barra de avance.
 */
export function CustomerAccountSummary({ account, overdueSince, className }: CustomerAccountSummaryProps) {
  const extra = [
    ...(account.credit > 0 ? [{ label: t.credit, amount: account.credit }] : []),
    ...(account.unscheduled > 0 ? [{ label: t.unscheduled, amount: account.unscheduled }] : []),
  ];
  return (
    <div className={[styles.summary, className].filter(Boolean).join(' ')}>
      <div>
        <div className={styles.label}>{t.balance}</div>
        <div className={styles.figure}>{formatCOP(Math.max(account.balance, 0))}</div>
      </div>
      {!account.isProspect && (
        <>
          <div
            role="img"
            aria-label={t.paidPct(account.paidPct)}
            className={styles.track}
            style={{ '--paid': `${account.paidPct}%` } as CSSProperties}
          >
            <span className={styles.fill} />
          </div>
          <div className={styles.pair}>
            <span>
              {t.paid} <span className={styles.amount}>{formatCOP(account.paidTotal)}</span>
            </span>
            <span>
              {t.debt} <span className={styles.amount}>{formatCOP(account.debt)}</span>
            </span>
          </div>
        </>
      )}
      {extra.length > 0 && (
        <dl className={styles.extra}>
          {extra.map((row) => (
            <div key={row.label} className={styles.extraRow}>
              <dt>{row.label}</dt>
              <dd className={styles.amount}>{formatCOP(row.amount)}</dd>
            </div>
          ))}
        </dl>
      )}
      {overdueSince && (
        <p className={styles.overdue}>
          <Icon name="alert" size={18} tone="current" />
          {t.overdueSince(formatDate(overdueSince))}
        </p>
      )}
    </div>
  );
}
