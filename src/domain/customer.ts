// Cliente y su cuenta derivada (HU-CLI-01, BR-CUS-04, ADR-0005). Nada de esto se guarda (BR-GEN-03).
import type { COP } from './money';
import { isOverdue, type Payment } from './payment';
import { toBogotaDate, type Instant, type LocalDate } from './time';

/** Estado del cliente (BR-CUS-13). `null` en un prospecto. */
export type PaymentStanding = 'overdue' | 'current' | 'settled';

/** Abono tal como lo necesita la cuenta. `deletedAt` permite descartar los borrados (R2). */
export type AccountPayment = Pick<
  Payment,
  'status' | 'agreedAmount' | 'paidAmount' | 'dueDate' | 'paidAt'
> & {
  readonly deletedAt?: Instant | null;
};

/** Ejemplar **vendido** (y no borrado) del cliente. */
export type SoldCopy = { readonly agreedPrice: COP; readonly soldAt: Instant };

/** Canje de saldo a favor (minibook con origen `client_credit`). Llega con el módulo Minibooks; hoy, vacío. */
export type CreditEntry = { readonly amount: COP };

export type CustomerAccountInput = {
  readonly customer: { readonly createdAt: Instant };
  readonly soldCopies: readonly SoldCopy[];
  readonly payments: readonly AccountPayment[];
  readonly creditEntries?: readonly CreditEntry[];
};

export type CustomerAccount = {
  readonly debt: COP;
  readonly paidTotal: COP;
  readonly creditApplied: COP;
  /** `debt − paidTotal + creditApplied` (ADR-0033). Negativo = saldo a favor. */
  readonly balance: COP;
  readonly credit: COP;
  readonly remaining: COP;
  readonly scheduledTotal: COP;
  readonly unscheduled: COP;
  readonly excess: COP;
  readonly isProspect: boolean;
  readonly standing: PaymentStanding | null;
  /** "Abonado el N %" (BR-CUS-10): entero, hacia abajo, tope 100 (INTERPRETACIONES I-11). */
  readonly paidPct: number;
  readonly firstSaleAt: Instant | null;
  readonly lastSaleAt: Instant | null;
  readonly customerSince: LocalDate;
  readonly lastPaymentAt: LocalDate | null;
  readonly nextDueDate: LocalDate | null;
  readonly hasOverdue: boolean;
  readonly notices: { readonly noBook: boolean; readonly excess: boolean };
};

const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);

const minOf = <T extends string | number>(values: readonly T[]): T | null =>
  values.length === 0 ? null : values.reduce((a, b) => (b < a ? b : a));

const maxOf = <T extends string | number>(values: readonly T[]): T | null =>
  values.length === 0 ? null : values.reduce((a, b) => (b > a ? b : a));

/** Calcula toda la cuenta de un cliente. Puro y determinista: `today` se inyecta (R4). */
export function computeCustomerAccount(input: CustomerAccountInput, today: LocalDate): CustomerAccount {
  // R2: cancelados y borrados no cuentan en nada.
  const payments = input.payments.filter((p) => !p.deletedAt && p.status !== 'canceled');
  const paid = payments.filter((p) => p.status === 'collected' || p.status === 'delivered');
  const pending = payments.filter((p) => p.status === 'scheduled');

  // BR-CUS-04
  const debt = sum(input.soldCopies.map((c) => c.agreedPrice));
  const paidTotal = sum(paid.map((p) => p.paidAmount ?? 0));
  const creditApplied = sum((input.creditEntries ?? []).map((c) => c.amount));
  const balance = debt - paidTotal + creditApplied;
  const credit = Math.max(0, -balance); // BR-CUS-06
  const remaining = Math.max(0, balance);
  const scheduledTotal = sum(pending.map((p) => p.agreedAmount ?? 0));
  const unscheduled = Math.max(0, remaining - scheduledTotal);
  const excess = Math.max(0, scheduledTotal - remaining); // BR-PAY-13

  const isProspect = input.soldCopies.length === 0; // BR-CUS-02, ADR-0006
  const hasOverdue = pending.some((p) => isOverdue(p, today)); // BR-PAY-08

  // BR-CUS-13: Saldado gana siempre a Vencido.
  const standing: PaymentStanding | null = isProspect
    ? null
    : balance <= 0
      ? 'settled'
      : hasOverdue
        ? 'overdue'
        : 'current';

  const saleTimes = input.soldCopies.map((c) => c.soldAt.getTime());
  const firstSaleMs = minOf(saleTimes);
  const lastSaleMs = maxOf(saleTimes);
  const firstSaleAt = firstSaleMs === null ? null : new Date(firstSaleMs);

  return {
    debt,
    paidTotal,
    creditApplied,
    balance,
    credit,
    remaining,
    scheduledTotal,
    unscheduled,
    excess,
    isProspect,
    standing,
    paidPct: debt === 0 ? 0 : Math.min(100, Math.floor((paidTotal * 100) / debt)),
    firstSaleAt,
    lastSaleAt: lastSaleMs === null ? null : new Date(lastSaleMs),
    customerSince: toBogotaDate(firstSaleAt ?? input.customer.createdAt),
    lastPaymentAt: maxOf(paid.flatMap((p) => (p.paidAt ? [p.paidAt] : []))),
    nextDueDate: minOf(pending.flatMap((p) => (p.dueDate ? [p.dueDate] : []))),
    hasOverdue,
    notices: {
      noBook: isProspect && payments.length > 0, // BR-PAY-14
      excess: excess > 0, // BR-PAY-13
    },
  };
}
