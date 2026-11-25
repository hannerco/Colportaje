import type { COP } from './money';
import type { Payment, PayMethod } from './payment';
import { toBogotaDate, type Instant, type LocalDate } from './time';

/** Una prórroga guardada (`payment_reschedule`, BR-PAY-06). */
export type PaymentRescheduleRecord = {
  readonly previousDueDate: LocalDate;
  readonly newDueDate: LocalDate;
  readonly changedAt: Instant;
  readonly note: string | null;
};

/**
 * Un recorte, cancelación, reapertura (`payment_event`, BR-PAY-13, BR-DEP-12) o corrección de un cobro (ronda 38:
 * valor, fecha y medio de pago de antes y de ahora).
 */
export type PaymentEventRecord = {
  readonly type: 'amount_reduced' | 'canceled' | 'reopened' | 'collect_corrected';
  readonly at: Instant;
  readonly previousAmount: COP | null;
  readonly newAmount: COP | null;
  readonly previousPaidAt?: LocalDate | null;
  readonly newPaidAt?: LocalDate | null;
  readonly previousMethod?: PayMethod | null;
  readonly newMethod?: PayMethod | null;
};

/** Lo que cambió al corregir un cobro: solo lo que cambió va en el Historial. */
export type CollectCorrection = {
  readonly amount?: { readonly from: COP; readonly to: COP };
  readonly paidAt?: { readonly from: LocalDate; readonly to: LocalDate };
  readonly method?: { readonly from: PayMethod; readonly to: PayMethod };
};

/** Una entrada del Historial del abono (#72, diseño «Detalle de un abono»). La pantalla arma el texto. */
export type PaymentHistoryEntry = { readonly id: string; readonly date: LocalDate } & (
  | { readonly kind: 'scheduled'; readonly amount: COP; readonly dueDate: LocalDate }
  | {
      readonly kind: 'rescheduled';
      readonly from: LocalDate;
      readonly to: LocalDate;
      readonly note: string | null;
    }
  | { readonly kind: 'reduced'; readonly from: COP; readonly to: COP }
  | { readonly kind: 'canceled' }
  | { readonly kind: 'reopened' }
  | { readonly kind: 'collected'; readonly amount: COP; readonly method: PayMethod }
  | ({ readonly kind: 'corrected' } & CollectCorrection)
  | { readonly kind: 'delivered'; readonly depositTitle: string }
);

type Input = {
  readonly payment: Pick<
    Payment,
    | 'kind'
    | 'status'
    | 'agreedAmount'
    | 'originalDueDate'
    | 'dueDate'
    | 'paidAmount'
    | 'paidAt'
    | 'method'
    | 'createdAt'
  >;
  /** En el orden en que pasaron. */
  readonly reschedules: readonly PaymentRescheduleRecord[];
  readonly events: readonly PaymentEventRecord[];
  /** El Abibono confirmado en que se entregó (si está entregado). */
  readonly deposit: { readonly title: string; readonly date: LocalDate } | null;
};

/**
 * Historial de un abono (#72): programado (con el valor y la fecha de entonces), cada prórroga con su nota, recortes,
 * cancelación y reapertura, cobrado y entregado. Del más reciente al más antiguo; en un mismo día, lo que pasó después
 * va primero.
 */
export function buildPaymentHistory({ payment, reschedules, events, deposit }: Input): PaymentHistoryEntry[] {
  const entries: PaymentHistoryEntry[] = [];
  if (payment.kind === 'scheduled') {
    const firstReduction = events.find((e) => e.type === 'amount_reduced' && e.previousAmount !== null);
    const firstDueDate = reschedules[0]?.previousDueDate ?? payment.originalDueDate ?? payment.dueDate;
    const amount = firstReduction?.previousAmount ?? payment.agreedAmount;
    if (firstDueDate && amount !== null)
      entries.push({
        id: 'scheduled',
        kind: 'scheduled',
        date: toBogotaDate(payment.createdAt),
        amount,
        dueDate: firstDueDate,
      });
  }
  const timed = [
    ...reschedules.map((r, i) => ({ at: r.changedAt, entry: rescheduled(r, i) })),
    ...events.map((e, i) => ({ at: e.at, entry: fromEvent(e, i) })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());
  for (const { at, entry } of timed) if (entry) entries.push({ ...entry, date: toBogotaDate(at) });
  const collected = payment.status === 'collected' || payment.status === 'delivered';
  // «Cobrado» muestra lo que se cobró la primera vez; las correcciones van aparte («Cobro corregido»).
  const firstCorrection = events.find((e) => e.type === 'collect_corrected');
  const paidAt = firstCorrection?.previousPaidAt ?? payment.paidAt;
  const paidAmount = firstCorrection?.previousAmount ?? payment.paidAmount;
  const method = firstCorrection?.previousMethod ?? payment.method;
  if (collected && paidAt && paidAmount !== null && method)
    entries.push({ id: 'collected', kind: 'collected', date: paidAt, amount: paidAmount, method });
  if (payment.status === 'delivered' && deposit)
    entries.push({
      id: 'delivered',
      kind: 'delivered',
      date: deposit.date,
      depositTitle: deposit.title,
    });
  // En un mismo día, lo que se agregó después pasó después: va primero.
  return entries
    .map((entry, order) => ({ entry, order }))
    .sort((a, b) =>
      a.entry.date === b.entry.date ? b.order - a.order : a.entry.date < b.entry.date ? 1 : -1,
    )
    .map(({ entry }) => entry);
}

const rescheduled = (r: PaymentRescheduleRecord, i: number) =>
  ({
    id: `rescheduled-${i}`,
    kind: 'rescheduled',
    from: r.previousDueDate,
    to: r.newDueDate,
    note: r.note,
  }) as const;

const fromEvent = (e: PaymentEventRecord, i: number) => {
  const id = `${e.type}-${i}`;
  if (e.type === 'canceled') return { id, kind: 'canceled' } as const;
  if (e.type === 'reopened') return { id, kind: 'reopened' } as const;
  if (e.type === 'collect_corrected') return corrected(e, id);
  if (e.previousAmount === null || e.newAmount === null) return null;
  return { id, kind: 'reduced', from: e.previousAmount, to: e.newAmount } as const;
};

/** Ronda 38: una corrección de cobro con solo lo que cambió (o nada, si no cambió nada). */
const corrected = (e: PaymentEventRecord, id: string) => {
  const change: { -readonly [K in keyof CollectCorrection]: CollectCorrection[K] } = {};
  if (e.previousAmount !== null && e.newAmount !== null && e.previousAmount !== e.newAmount)
    change.amount = { from: e.previousAmount, to: e.newAmount };
  if (e.previousPaidAt && e.newPaidAt && e.previousPaidAt !== e.newPaidAt)
    change.paidAt = { from: e.previousPaidAt, to: e.newPaidAt };
  if (e.previousMethod && e.newMethod && e.previousMethod !== e.newMethod)
    change.method = { from: e.previousMethod, to: e.newMethod };
  if (!change.amount && !change.paidAt && !change.method) return null;
  return { id, kind: 'corrected', ...change } as const;
};
