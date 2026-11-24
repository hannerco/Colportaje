'use client';

import { copy } from '@/copy/es';
import type { DepositView } from '@/domain/deposit-draft';
import { formatCOP } from '@/domain/money';
import { formatDate, type LocalDate } from '@/domain/time';
import { Button } from '@/ui/atoms/Button';
import { Logo } from '@/ui/atoms/Logo';
import { Icon } from '@/ui/icons';
import { EmptyState } from '@/ui/organisms/EmptyState';
import { DetailSkeleton } from '@/ui/templates/DetailTemplate';
import styles from './DepositReceiptScreen.module.css';

export type DepositReceiptScreenProps = {
  /** El Abibono entregado; sin valor mientras carga o si falló. */
  deposit?: DepositView;
  error?: boolean;
  onRetry?: () => void;
  /** Quien entrega (el nombre del perfil). */
  colportor: string;
  /** Fecha de hoy (Bogotá), para «Generado el…». */
  today: LocalDate;
  backHref: string;
  onPrint: () => void;
  onShare: () => void;
};

const t = copy.money.depositReceipt;
const methods = copy.customers.detail.payments.method;

/** La hoja del recibo: blanca también en tema oscuro, como el papel; al imprimir, solo tinta negra. */
export function DepositReceipt({
  deposit,
  colportor,
  today,
}: Pick<DepositReceiptScreenProps, 'colportor' | 'today'> & { deposit: DepositView }) {
  const { summary } = deposit;
  return (
    // `data-theme="light"`: la hoja es papel; en tema oscuro conserva los colores claros (también el logo).
    <article className={styles.paper} data-theme="light" aria-label={`${t.title} · ${deposit.displayTitle}`}>
      <header className={styles.head}>
        <span className={styles.screenLogo}>
          <Logo variant="logotype" size={26} />
        </span>
        <span className={styles.printLogo}>
          <Logo variant="mono" size={26} />
          <span className={styles.printName}>{copy.app.name}</span>
        </span>
        <div className={styles.headTitle}>
          <span className={styles.kicker}>{t.kicker}</span>
          <h1 className={styles.title}>{deposit.displayTitle}</h1>
        </div>
      </header>
      <dl className={styles.meta}>
        <div>
          <dt>{t.date}</dt>
          <dd>{formatDate(deposit.depositDate)}</dd>
        </div>
        <div>
          <dt>{t.colportor}</dt>
          <dd>{colportor}</dd>
        </div>
        <div>
          <dt>{t.status}</dt>
          <dd>{t.confirmed}</dd>
        </div>
      </dl>
      {deposit.payments.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">{t.customer}</th>
              <th scope="col">{t.paidAt}</th>
              <th scope="col">{t.method}</th>
              <th scope="col" className={styles.num}>
                {t.amount}
              </th>
            </tr>
          </thead>
          <tbody>
            {deposit.payments.map((p) => (
              <tr key={p.paymentId}>
                <td>{p.customerName}</td>
                <td>{formatDate(p.paidAt)}</td>
                <td>{methods[p.method]}</td>
                <td className={styles.num}>{formatCOP(p.paidAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className={styles.totals}>
        <Line label={t.expected} value={formatCOP(summary.expected)} />
        <Line label={t.cash} value={formatCOP(deposit.cash)} />
        <Line label={t.transfer} value={formatCOP(deposit.transfer)} />
        <hr className={styles.rule} />
        <Line label={t.total} value={formatCOP(summary.total)} strong />
        <Line label={t.difference} value={formatCOP(summary.difference)} />
      </div>
      {deposit.note && (
        <p className={styles.note}>
          <strong>{t.note}:</strong> {deposit.note}
        </p>
      )}
      <p className={styles.note}>{t.photos(deposit.receipts.length)}</p>
      <footer className={styles.foot}>
        <span>
          {copy.app.name} · {copy.app.tagline}
        </span>
        <span>{t.generated(formatDate(today))}</span>
      </footer>
    </article>
  );
}

function Line({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={styles.line} data-strong={strong || undefined}>
      <span>{label}</span>
      <span className={styles.num}>{value}</span>
    </div>
  );
}

/**
 * Recibo del Abibono (lienzo «Recibo del Abibono», ronda 37): la hoja con el logotipo, los datos, los abonos y el
 * cuadre, con «Imprimir o guardar PDF» y «Compartir». Al imprimir solo sale la hoja, en tinta negra.
 */
export function DepositReceiptScreen(props: DepositReceiptScreenProps) {
  const { deposit } = props;
  return (
    <main className={styles.page}>
      <div className={styles.toolbar}>
        <a className={styles.back} href={props.backHref}>
          <Icon name="back" size={20} tone="current" />
          {deposit?.displayTitle ?? copy.ui.nav.items.money}
        </a>
        <div className={styles.actions}>
          <Button
            variant="secondary"
            icon="share"
            onClick={props.onShare}
            state={deposit ? 'normal' : 'disabled'}
          >
            {t.share}
          </Button>
          <Button icon="receipt" onClick={props.onPrint} state={deposit ? 'normal' : 'disabled'}>
            {t.print}
          </Button>
        </div>
      </div>
      {deposit ? (
        <DepositReceipt deposit={deposit} colportor={props.colportor} today={props.today} />
      ) : props.error ? (
        <EmptyState
          kind="error"
          title={copy.money.depositDetail.error.title}
          text={copy.money.depositDetail.error.text}
          action={props.onRetry ? { label: copy.errors.retry, onClick: props.onRetry } : undefined}
        />
      ) : (
        <DetailSkeleton islands={[{ rows: 6, row: 'list' }]} />
      )}
    </main>
  );
}
