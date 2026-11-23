'use client';

import { copy } from '@/copy/es';
import { formatCOP } from '@/domain/money';
import type { PaymentRow } from '@/domain/customer-detail';
import type { PaymentHistoryEntry } from '@/domain/payment-history';
import { daysBetween, formatDate, type LocalDate } from '@/domain/time';
import { Button } from '@/ui/atoms/Button';
import { Icon } from '@/ui/icons';
import { usePlatform } from '@/ui/platform';
import { StatusPill } from '@/ui/atoms/StatusPill';
import { HistoryTimeline } from '@/ui/molecules/HistoryTimeline';
import type { BannerProps } from '@/ui/molecules/Banner';
import { DetailWindow, type DetailWindowProps } from '@/ui/organisms/DetailWindow';
import { EmptyState } from '@/ui/organisms/EmptyState';
import { Island } from '@/ui/organisms/Island';
import { DetailTemplate } from '@/ui/templates/DetailTemplate';
import { ChangeDueDateDialog } from '../../components/ChangeDueDateDialog';
import { CollectPaymentDialog, type CollectPaymentValues } from '../../components/CollectPaymentDialog';
import styles from './PaymentDetailScreen.module.css';

export type PaymentDetailForm = 'collect' | 'extend';

export type PaymentDetailScreenProps = {
  /** El abono y el cliente (de `useCustomerDetail`); sin valor mientras carga o si falló. */
  payment?: PaymentRow;
  customer?: { id: string; name: string; avatarEmoji: string | null; archived: boolean };
  /** Los demás abonos del cliente (la isla «Abonos de …»), con el abono abierto incluido. */
  payments?: readonly PaymentRow[];
  loading?: boolean;
  error?: boolean;
  /** El abono ya no existe. */
  notFound?: boolean;
  onRetry?: () => void;
  isOnline: boolean;
  window: Pick<DetailWindowProps, 'mode' | 'onModeChange' | 'onClose' | 'onPrev' | 'onNext' | 'breadcrumb'>;
  today: LocalDate;
  customerHref: (customerId: string) => string;
  paymentHref: (paymentId: string) => string;
  depositHref: (depositId: string) => string;
  /** El formulario abierto («Cobrar» o «Dar más plazo»): lo controla el contenedor para abrirlo desde la lista. */
  form: PaymentDetailForm | null;
  onFormChange: (form: PaymentDetailForm | null) => void;
  /** Cobra; si falla, que lance para que el formulario siga abierto (el contenedor ya avisó). */
  onCollect: (values: CollectPaymentValues) => Promise<void>;
  onReschedule: (date: LocalDate, confirmed: boolean, note?: string) => Promise<void>;
  /** #72: lo que le pasó al abono (`usePaymentHistory`), del más reciente al más antiguo. */
  history?: readonly PaymentHistoryEntry[];
  /** #72: el nombre del Abibono en que se entregó («Abibono – 25/10/2026»), para la franja. */
  depositTitle?: string;
};

const t = copy.payments.detail;

/** El texto de cada entrada del Historial (#72). */
const historyText = (entry: PaymentHistoryEntry): { text: string; note?: string } => {
  const h = t.historyEntry;
  switch (entry.kind) {
    case 'scheduled':
      return { text: h.scheduled(formatCOP(entry.amount), formatDate(entry.dueDate)) };
    case 'rescheduled':
      return {
        text: h.rescheduled(formatDate(entry.from), formatDate(entry.to)),
        note: entry.note ?? undefined,
      };
    case 'reduced':
      return { text: h.reduced(formatCOP(entry.from), formatCOP(entry.to)) };
    case 'canceled':
      return { text: h.canceled };
    case 'reopened':
      return { text: h.reopened };
    case 'collected':
      return { text: t.collected(formatCOP(entry.amount), t.data.methods[entry.method].toLowerCase()) };
    case 'delivered':
      return { text: h.delivered(entry.depositTitle) };
  }
};

/** La cuota «2 de 4»: la posición del abono entre los programados del cliente (por fecha original). */
export function installmentOf(
  payments: readonly PaymentRow[],
  paymentId: string,
): { index: number; total: number } | null {
  const scheduled = payments
    .filter((p) => p.kind === 'scheduled')
    .sort((a, b) =>
      (a.originalDueDate ?? '') < (b.originalDueDate ?? '')
        ? -1
        : (a.originalDueDate ?? '') > (b.originalDueDate ?? '')
          ? 1
          : a.paymentId < b.paymentId
            ? -1
            : 1,
    );
  const position = scheduled.findIndex((p) => p.paymentId === paymentId);
  return position < 0 ? null : { index: position + 1, total: scheduled.length };
}

/** La franja: la situación del abono (CA-1). */
export function paymentBanner(payment: PaymentRow, today: LocalDate): BannerProps | undefined {
  const b = t.banner;
  switch (payment.status) {
    case 'scheduled': {
      if (payment.isOverdue) return { tone: 'overdue', children: b.overdue(payment.overdueDays) };
      const days = payment.dueDate ? daysBetween(today, payment.dueDate) : null;
      if (days === null) return undefined;
      return { tone: 'neutral', children: days <= 0 ? b.dueToday : b.remaining(days) };
    }
    case 'collected':
    case 'delivered': {
      const tone = payment.status;
      if (!payment.paidAt) return undefined;
      const date = formatDate(payment.paidAt);
      if (payment.kind !== 'scheduled' || !payment.dueDate) return { tone, children: date };
      const late = daysBetween(payment.dueDate, payment.paidAt);
      return { tone, children: late > 0 ? b.late(date, late) : b.onTime(date) };
    }
    case 'canceled':
      return { tone: 'neutral', children: b.canceled };
  }
}

/**
 * Detalle de un abono (HU-PAN-DIN-02, diseño «6 · Detalle de un abono» y «8 · Abono: estados y acciones»): la franja
 * con su situación, la isla de identidad con «Cobrar», los datos (fecha acordada, valor, método y Abibono), los demás
 * abonos del cliente y el historial. «Dar más plazo» está en Más acciones. Lo entregado está bloqueado (candado, sin
 * acciones). Pantalla de presentación: datos y acciones por props.
 */
export function PaymentDetailScreen(props: PaymentDetailScreenProps) {
  const { payment, customer, isOnline, today } = props;
  const platform = usePlatform();

  if (!payment || !customer)
    return (
      <DetailWindow {...props.window} title={copy.ui.nav.items.money}>
        {props.notFound ? (
          <EmptyState kind="empty" title={t.notFound.title} text={t.notFound.text} />
        ) : props.error && !props.loading ? (
          <EmptyState
            kind="error"
            title={t.error.title}
            text={t.error.text}
            action={props.onRetry ? { label: copy.errors.retry, onClick: props.onRetry } : undefined}
          />
        ) : (
          <EmptyState kind="loading" rows={6} />
        )}
      </DetailWindow>
    );

  const siblings = props.payments ?? [payment];
  const installment = installmentOf(siblings, payment.paymentId);
  const locked = payment.status === 'delivered';
  const collected = payment.status === 'collected' || payment.status === 'delivered';
  const agreedAmount = payment.agreedAmount;
  const paidAmount = payment.paidAmount;

  const banner = paymentBanner(payment, today);
  const mobile = platform === 'mobile';
  const stripTone = ({ overdue: 'bad', neutral: 'neutral', collected: 'ok', delivered: 'accent' } as const)[
    (banner?.tone ?? 'neutral') as 'overdue' | 'neutral' | 'collected' | 'delivered'
  ];
  const firstName = customer.name.split(' ')[0] ?? customer.name;
  const shownAmount = collected ? paidAmount : agreedAmount;
  const history = (props.history ?? []).map((entry) => ({
    id: entry.id,
    date: entry.date,
    ...historyText(entry),
  }));

  return (
    <>
      <DetailTemplate
        window={{ ...props.window, title: t.title(customer.name) }}
        identity={{
          avatar: customer.avatarEmoji ? { kind: 'emoji', emoji: customer.avatarEmoji } : { kind: 'person' },
          title: customer.name,
          titleHref: props.customerHref(customer.id),
          strip: {
            tone: stripTone,
            children: (
              <>
                {/* El diseño: la Pastilla dice el estado («Por cobrar») y el texto, si está vencido. */}
                <StatusPill status={payment.status} locked={locked} size={mobile ? 'sm' : 'md'} />
                {banner && (
                  <span className={styles.stripText}>
                    {payment.isOverdue && <Icon name="alert" size={16} tone="current" />}
                    {banner.children}
                  </span>
                )}
                {payment.deposit?.status === 'confirmed' && (
                  <>
                    <span aria-hidden="true">·</span>
                    <a className={styles.stripLink} href={props.depositHref(payment.deposit.id)}>
                      <Icon name="locked" size={14} tone="current" />
                      {props.depositTitle ?? t.data.depositConfirmed}
                    </a>
                  </>
                )}
              </>
            ),
          },
          titleAddon: installment ? (
            <span
              className={styles.fraction}
              aria-label={t.installment(installment.index, installment.total)}
            >
              {installment.index}/{installment.total}
            </span>
          ) : undefined,
          aside: payment.dueDate ? (
            <span className={styles.dateChip}>
              <Icon name="calendar" size={16} tone="current" />
              <span className={styles.dateChipLabel}>{t.data.agreedDate}</span>
              <strong>{formatDate(payment.dueDate)}</strong>
            </span>
          ) : undefined,
          details: (
            <div className={styles.value}>
              <div className={styles.valueText}>
                <span className={styles.valueLabel}>
                  {collected ? t.data.paidAmount : t.data.agreedAmount}
                </span>
                <span className={styles.figure}>{shownAmount === null ? '—' : formatCOP(shownAmount)}</span>
                {collected && agreedAmount !== null && paidAmount !== null && agreedAmount !== paidAmount && (
                  <s className={styles.previous}>{formatCOP(agreedAmount)}</s>
                )}
              </div>
              {payment.can.collect || payment.can.reschedule ? (
                <div className={styles.actions}>
                  {payment.can.collect && (
                    <Button
                      icon="money"
                      state={isOnline ? 'normal' : 'disabled'}
                      onClick={() => props.onFormChange('collect')}
                    >
                      {t.collect}
                    </Button>
                  )}
                  {payment.can.reschedule && (
                    <Button
                      variant="secondary"
                      icon="calendar"
                      state={isOnline ? 'normal' : 'disabled'}
                      onClick={() => props.onFormChange('extend')}
                    >
                      {mobile ? t.extendShort : t.extend}
                    </Button>
                  )}
                </div>
              ) : (
                collected &&
                payment.method && (
                  <span className={styles.method}>
                    <Icon name={payment.method === 'cash' ? 'money' : 'transfer'} size={16} tone="current" />
                    {t.data.methods[payment.method]}
                  </span>
                )
              )}
            </div>
          ),
        }}
      >
        <Island title={t.customerPayments(firstName)} icon="calendar" count={siblings.length}>
          <ul className={styles.siblings}>
            {siblings.map((p) => (
              <li key={p.paymentId}>
                <a
                  className={styles.sibling}
                  href={props.paymentHref(p.paymentId)}
                  aria-current={p.paymentId === payment.paymentId ? 'true' : undefined}
                >
                  <span className={styles.siblingDate}>
                    <span className={p.isOverdue ? styles.overdue : undefined}>
                      {p.dueDate
                        ? formatDate(p.dueDate)
                        : p.paidAt
                          ? formatDate(p.paidAt)
                          : copy.ui.listRow.empty}
                    </span>
                    {p.isOverdue && <span className={styles.overdueAgo}>{t.overdueAgo(p.overdueDays)}</span>}
                  </span>
                  <span className={styles.siblingState}>
                    <StatusPill
                      status={p.status}
                      locked={p.status === 'delivered'}
                      size={mobile ? 'sm' : 'md'}
                    />
                  </span>
                  <span className={styles.siblingAmount}>
                    {formatCOP(
                      (p.status === 'collected' || p.status === 'delivered'
                        ? p.paidAmount
                        : p.agreedAmount) ?? 0,
                    )}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </Island>
        {history.length > 0 && (
          <Island title={t.history} icon="note">
            <HistoryTimeline items={history} />
          </Island>
        )}
      </DetailTemplate>
      {payment.can.collect && agreedAmount !== null && (
        <CollectPaymentDialog
          open={props.form === 'collect'}
          onOpenChange={(open) => props.onFormChange(open ? 'collect' : null)}
          customerName={customer.name}
          agreedAmount={agreedAmount}
          agreedDate={payment.dueDate}
          today={today}
          onConfirm={props.onCollect}
        />
      )}
      {payment.can.reschedule && payment.dueDate && installment && (
        <ChangeDueDateDialog
          open={props.form === 'extend'}
          onOpenChange={(open) => props.onFormChange(open ? 'extend' : null)}
          mode="reschedule"
          withNote
          subtitle={
            agreedAmount !== null
              ? `${customer.name} · ${copy.payments.detail.collectForm.subtitle(formatCOP(agreedAmount), formatDate(payment.dueDate))}`
              : customer.name
          }
          index={installment.index}
          total={installment.total}
          current={payment.dueDate}
          today={today}
          otherDates={siblings
            .filter((p) => p.paymentId !== payment.paymentId && p.dueDate)
            .map((p) => p.dueDate!)}
          onSave={props.onReschedule}
        />
      )}
    </>
  );
}
