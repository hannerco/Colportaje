'use client';

import { copy } from '@/copy/es';
import { formatCOP } from '@/domain/money';
import type { PaymentRow } from '@/domain/customer-detail';
import { daysBetween, formatDate, type LocalDate } from '@/domain/time';
import { Button } from '@/ui/atoms/Button';
import { StatusPill } from '@/ui/atoms/StatusPill';
import { DataList, DataRow } from '@/ui/molecules/DataRow';
import { HistoryTimeline } from '@/ui/molecules/HistoryTimeline';
import { Menu } from '@/ui/molecules/Menu';
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
};

const t = copy.payments.detail;

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
  const shownStatus = payment.isOverdue ? 'overdue' : payment.status;
  const collected = payment.status === 'collected' || payment.status === 'delivered';
  const agreedAmount = payment.agreedAmount;
  const paidAmount = payment.paidAmount;

  const moreActions = payment.can.reschedule ? (
    <Menu
      trigger={
        <Button variant="tertiary" iconOnly icon="more">
          {t.moreActions}
        </Button>
      }
      title={t.moreActions}
      items={[{ id: 'extend', label: t.extend, icon: 'calendar' as const, disabled: !isOnline }]}
      onSelect={() => props.onFormChange('extend')}
    />
  ) : undefined;

  const history =
    collected && payment.paidAt && paidAmount !== null && payment.method
      ? [
          {
            id: 'collected',
            text: t.collected(formatCOP(paidAmount), t.data.methods[payment.method].toLowerCase()),
            date: payment.paidAt,
          },
        ]
      : [];

  return (
    <>
      <DetailTemplate
        window={{ ...props.window, title: t.title(customer.name), moreActions }}
        banner={paymentBanner(payment, today)}
        identity={{
          avatar: customer.avatarEmoji ? { kind: 'emoji', emoji: customer.avatarEmoji } : { kind: 'person' },
          title: customer.name,
          status: shownStatus,
          statusLocked: locked,
          subtitle: installment ? (
            <span aria-label={t.installment(installment.index, installment.total)}>
              {installment.index}/{installment.total}
            </span>
          ) : undefined,
          primaryAction: payment.can.collect
            ? {
                label: t.collect,
                icon: 'check',
                onClick: () => props.onFormChange('collect'),
                disabled: !isOnline,
              }
            : undefined,
        }}
      >
        <Island>
          <DataList>
            <DataRow
              kind="link"
              label={t.data.kind[payment.kind]}
              icon="person"
              divider={false}
              href={props.customerHref(customer.id)}
              value={customer.name}
            />
            {payment.dueDate && (
              <DataRow
                label={t.data.agreedDate}
                value={formatDate(payment.dueDate)}
                previous={
                  payment.originalDueDate && payment.originalDueDate !== payment.dueDate
                    ? formatDate(payment.originalDueDate)
                    : undefined
                }
              />
            )}
            {collected ? (
              <>
                {paidAmount !== null && (
                  <DataRow
                    kind="amount"
                    label={t.data.paidAmount}
                    value={formatCOP(paidAmount)}
                    previous={
                      agreedAmount !== null && agreedAmount !== paidAmount
                        ? formatCOP(agreedAmount)
                        : undefined
                    }
                  />
                )}
                {payment.paidAt && <DataRow label={t.data.paidAt} value={formatDate(payment.paidAt)} />}
                {payment.method && <DataRow label={t.data.method} value={t.data.methods[payment.method]} />}
              </>
            ) : (
              agreedAmount !== null && (
                <DataRow kind="amount" label={t.data.agreedAmount} value={formatCOP(agreedAmount)} />
              )
            )}
            {payment.deposit && (
              <DataRow
                kind="link"
                label={t.data.deposit}
                href={props.depositHref(payment.deposit.id)}
                value={payment.deposit.status === 'confirmed' ? t.data.depositConfirmed : t.data.depositDraft}
              />
            )}
          </DataList>
        </Island>
        <Island title={t.customerPayments(customer.name.split(' ')[0] ?? customer.name)} icon="calendar">
          <ul className={styles.siblings}>
            {siblings.map((p) => (
              <li key={p.paymentId}>
                <a
                  className={styles.sibling}
                  href={props.paymentHref(p.paymentId)}
                  aria-current={p.paymentId === payment.paymentId ? 'true' : undefined}
                >
                  <span className={styles.siblingDate}>
                    {p.dueDate
                      ? formatDate(p.dueDate)
                      : p.paidAt
                        ? formatDate(p.paidAt)
                        : copy.ui.listRow.empty}
                  </span>
                  <StatusPill status={p.isOverdue ? 'overdue' : p.status} shape="text" />
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
