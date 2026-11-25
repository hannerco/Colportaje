// Alerta de abonos que no cuadran (HU-ABO-07, BR-PAY-13, ADR-0033, OQ-30, OQ-36).
import type { COP } from './money';
import type { CancelReason, Payment } from './payment';
import { compareIds } from './text';
import type { Instant, LocalDate } from './time';

export const SCHEDULE_EXCESS_ERROR_CODES = {
  NO_EXCESS: 'NO_EXCESS',
} as const;

export type ExcessTrigger =
  | 'extra_payment'
  | 'overpayment'
  | 'return'
  | 'price_decrease'
  | 'edit_collected'
  | 'delete_collected'
  | 'form_edit'
  | 'review';

export type TrimOrder = 'nearest' | 'farthest';

/**
 * Tabla ÚNICA de disparadores (HU-ABO-07, BR-PAY-13, ADR-0033). La función SQL `resolve_schedule_excess`
 * aplica los mismos motivos; una prueba verifica que coincidan.
 */
export const EXCESS_TRIGGERS: Readonly<
  Record<ExcessTrigger, { presentation: 'modal' | 'banner'; order: TrimOrder; cancelReason: CancelReason }>
> = {
  extra_payment: { presentation: 'modal', order: 'nearest', cancelReason: 'overpaid' }, // AF-20
  overpayment: { presentation: 'modal', order: 'nearest', cancelReason: 'overpaid' }, // AF-21
  return: { presentation: 'modal', order: 'farthest', cancelReason: 'book_returned' }, // AF-05
  price_decrease: { presentation: 'modal', order: 'farthest', cancelReason: 'manual' }, // AF-29
  edit_collected: { presentation: 'banner', order: 'nearest', cancelReason: 'overpaid' },
  delete_collected: { presentation: 'banner', order: 'nearest', cancelReason: 'manual' }, // OQ-36
  form_edit: { presentation: 'banner', order: 'farthest', cancelReason: 'manual' }, // AF-32
  review: { presentation: 'modal', order: 'farthest', cancelReason: 'manual' },
};

export const EXCESS_TRIGGER_LIST = Object.keys(EXCESS_TRIGGERS) as readonly ExcessTrigger[];

/** Abono programado tal como lo necesita el recorte. */
export type ExcessPayment = {
  readonly paymentId: string;
  readonly dueDate: LocalDate;
  readonly agreedAmount: COP;
  /** Desempate entre abonos con la misma fecha (OQ-30). */
  readonly createdAt: Instant;
};

export type TrimStep =
  | { readonly paymentId: string; readonly action: 'cancel' }
  | { readonly paymentId: string; readonly action: 'reduce'; readonly newAmount: COP };

export type ExcessEvaluation = {
  readonly trigger: ExcessTrigger;
  readonly remaining: COP;
  readonly scheduledTotal: COP;
  readonly excess: COP;
  readonly presentation: 'modal' | 'banner';
  readonly suggestedOrder: TrimOrder;
  readonly cancelReason: CancelReason;
  /** "Dejar como está": desde la ronda 38 siempre (antes solo si el cliente aún debía algo, R5). */
  readonly canLeaveAsIs: boolean;
  /** Los programados, por fecha (más próximo primero), para la lista con casillas. */
  readonly payments: readonly { paymentId: string; dueDate: LocalDate; agreedAmount: COP }[];
  readonly suggestedPlan: readonly TrimStep[];
};

/** Más próximo = fecha ascendente; más lejano = descendente. Empates: creación y luego id, siempre ascendente (OQ-30). */
export const sortForTrim = (payments: readonly ExcessPayment[], order: TrimOrder): ExcessPayment[] =>
  [...payments].sort(
    (a, b) =>
      (a.dueDate === b.dueDate ? 0 : (a.dueDate < b.dueDate ? -1 : 1) * (order === 'nearest' ? 1 : -1)) ||
      a.createdAt.getTime() - b.createdAt.getTime() ||
      compareIds(a.paymentId, b.paymentId),
  );

/**
 * Recorte automático (R2): en el orden elegido, cancela abonos completos mientras quepan en el sobrante
 * y reduce el valor acordado del siguiente por lo que falte.
 */
export const trimPlan = (payments: readonly ExcessPayment[], excess: COP, order: TrimOrder): TrimStep[] => {
  const plan: TrimStep[] = [];
  let left = excess;
  for (const payment of sortForTrim(payments, order)) {
    if (left <= 0) break;
    if (payment.agreedAmount <= left) {
      plan.push({ paymentId: payment.paymentId, action: 'cancel' });
      left -= payment.agreedAmount;
    } else {
      plan.push({ paymentId: payment.paymentId, action: 'reduce', newAmount: payment.agreedAmount - left });
      left = 0;
    }
  }
  return plan;
};

/**
 * Evalúa el sobrante (R1): `excess = scheduledTotal − max(0, balance)`; `null` si no hay sobrante.
 * Lo "sin programar" (caso inverso) no alerta.
 */
export const evaluateScheduleExcess = (
  account: { readonly balance: COP },
  scheduledPayments: readonly ExcessPayment[],
  trigger: ExcessTrigger,
): ExcessEvaluation | null => {
  const remaining = Math.max(0, account.balance);
  const scheduledTotal = scheduledPayments.reduce((sum, p) => sum + p.agreedAmount, 0);
  const excess = scheduledTotal - remaining;
  if (excess <= 0) return null;
  const { presentation, order, cancelReason } = EXCESS_TRIGGERS[trigger];
  return {
    trigger,
    remaining,
    scheduledTotal,
    excess,
    presentation,
    suggestedOrder: order,
    cancelReason,
    // Ronda 38 (ADR-0052): «Dejar como está» siempre se ofrece, también con saldo 0 o a favor.
    canLeaveAsIs: true,
    payments: sortForTrim(scheduledPayments, 'nearest').map(({ paymentId, dueDate, agreedAmount }) => ({
      paymentId,
      dueDate,
      agreedAmount,
    })),
    suggestedPlan: trimPlan(scheduledPayments, excess, order),
  };
};

/** Los programados vigentes de una lista de abonos (sin cancelados, cobrados ni borrados). */
export const scheduledForExcess = (
  payments: readonly (Pick<Payment, 'id' | 'status' | 'dueDate' | 'agreedAmount' | 'createdAt'> & {
    readonly deletedAt?: Instant | null;
  })[],
): ExcessPayment[] =>
  payments.flatMap((p) =>
    p.status === 'scheduled' && !p.deletedAt && p.dueDate !== null && p.agreedAmount !== null
      ? [{ paymentId: p.id, dueDate: p.dueDate, agreedAmount: p.agreedAmount, createdAt: p.createdAt }]
      : [],
  );

/** Opción elegida en el modal. */
export type ExcessChoice =
  | { readonly action: 'auto_trim'; readonly order: TrimOrder }
  | { readonly action: 'cancel_selected'; readonly paymentIds: readonly string[] }
  | { readonly action: 'leave' };
