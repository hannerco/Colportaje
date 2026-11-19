import { isValidCOP, type COP } from './money';
import { appError, validationError, type AppError } from './shared/errors';
import { err, ok, type Result } from './shared/result';
import { daysBetween, type Instant, type LocalDate } from './time';

/** Tipos de abono (enum `payment_kind`). */
export type PaymentKind = 'down_payment' | 'scheduled' | 'extra';

/** Estados del abono (BR-PAY-02). "Vencido" no es un estado: es una marca derivada (BR-PAY-08). */
export type PaymentStatus = 'scheduled' | 'collected' | 'delivered' | 'canceled';

export type PayMethod = 'cash' | 'transfer';

export type CancelReason = 'book_returned' | 'overpaid' | 'manual' | 'customer_archived';

/** Abono de un cliente (contrato de HU-ABO-01; esa HU agrega sus reglas y su tabla). */
export type Payment = {
  readonly id: string;
  readonly customerId: string;
  readonly kind: PaymentKind;
  readonly status: PaymentStatus;
  readonly originalDueDate: LocalDate | null;
  readonly dueDate: LocalDate | null;
  readonly paidAt: LocalDate | null;
  readonly agreedAmount: COP | null;
  readonly paidAmount: COP | null;
  readonly method: PayMethod | null;
  readonly canceledAt: Instant | null;
  readonly cancelReason: CancelReason | null;
  readonly createdAt: Instant;
};

/** BR-PAY-08: un abono por cobrar con fecha acordada anterior a hoy está vencido. */
export const isOverdue = (payment: Pick<Payment, 'status' | 'dueDate'>, today: LocalDate): boolean =>
  payment.status === 'scheduled' && payment.dueDate !== null && payment.dueDate < today;

/** Días de vencido ("Vencido · hace N días"); 0 si no está vencido. */
export const overdueDays = (payment: Pick<Payment, 'status' | 'dueDate'>, today: LocalDate): number =>
  isOverdue(payment, today) ? daysBetween(payment.dueDate!, today) : 0;

export const PAYMENT_ERROR_CODES = { INVALID_TRANSITION: 'INVALID_TRANSITION' } as const;

export type PaymentAction =
  | {
      readonly type: 'collect';
      readonly paidAmount: COP;
      readonly paidAt: LocalDate;
      readonly method: PayMethod;
      /** Para validar que la fecha real no sea futura (R6). */
      readonly today: LocalDate;
    }
  | { readonly type: 'cancel'; readonly at: Instant; readonly reason: CancelReason }
  | { readonly type: 'deliver' }
  | { readonly type: 'reopen' }
  /** Deshacer un cobro (HU-ABO-10): vuelve a por cobrar y borra lo real; solo un abono programado. */
  | { readonly type: 'uncollect' };

export type PaymentActionType = PaymentAction['type'];

/**
 * Tabla ÚNICA de transiciones (HU-ABO-01, BR-PAY-02, DOMAIN-MODEL). La base aplica la misma tabla
 * en un trigger; una prueba verifica que coincidan.
 */
export const PAYMENT_TRANSITIONS: Readonly<
  Record<PaymentActionType, { from: PaymentStatus; to: PaymentStatus }>
> = {
  collect: { from: 'scheduled', to: 'collected' }, // BR-PAY-05
  cancel: { from: 'scheduled', to: 'canceled' }, // BR-PAY-13, BR-CUS-09
  deliver: { from: 'collected', to: 'delivered' }, // confirmar Abibono (BR-DEP-09)
  reopen: { from: 'delivered', to: 'collected' }, // reabrir Abibono (BR-DEP-12)
  uncollect: { from: 'collected', to: 'scheduled' }, // deshacer un cobro (HU-ABO-10)
};

export const PAYMENT_ACTIONS = Object.keys(PAYMENT_TRANSITIONS) as readonly PaymentActionType[];

export const canTransitionPayment = (from: PaymentStatus, action: PaymentActionType): boolean =>
  PAYMENT_TRANSITIONS[action].from === from;

/** Aplica una acción si la tabla la permite; si no, `INVALID_TRANSITION`. */
export function applyPaymentAction(payment: Payment, action: PaymentAction): Result<Payment, AppError> {
  if (!canTransitionPayment(payment.status, action.type)) {
    return err(
      appError(PAYMENT_ERROR_CODES.INVALID_TRANSITION, { from: payment.status, action: action.type }),
    );
  }
  switch (action.type) {
    case 'collect':
      // R2: valor real > 0; R6: la fecha real no es futura.
      if (!isValidCOP(action.paidAmount) || action.paidAmount === 0)
        return err(validationError('paidAmount'));
      if (action.paidAt > action.today) return err(validationError('paidAt'));
      return ok({
        ...payment,
        status: 'collected',
        paidAmount: action.paidAmount,
        paidAt: action.paidAt,
        method: action.method,
      });
    case 'cancel':
      return ok({ ...payment, status: 'canceled', canceledAt: action.at, cancelReason: action.reason }); // R3
    case 'deliver':
      return ok({ ...payment, status: 'delivered' });
    case 'reopen':
      return ok({ ...payment, status: 'collected' });
    case 'uncollect':
      // La cuota inicial y el abono extra nacen cobrados: no se deshacen.
      if (payment.kind !== 'scheduled')
        return err(
          appError(PAYMENT_ERROR_CODES.INVALID_TRANSITION, { from: payment.status, action: action.type }),
        );
      return ok({ ...payment, status: 'scheduled', paidAmount: null, paidAt: null, method: null });
  }
}

/**
 * Valor y fecha "acordados" para mostrar (ADR-0046): un programado muestra los suyos; la cuota inicial
 * y el abono extra, que nacen cobrados, muestran su valor y fecha reales. No se guarda.
 */
export const displayAgreed = (
  payment: Pick<Payment, 'kind' | 'agreedAmount' | 'dueDate' | 'paidAmount' | 'paidAt'>,
): { amount: COP; date: LocalDate | null } =>
  payment.kind === 'scheduled'
    ? { amount: payment.agreedAmount ?? 0, date: payment.dueDate }
    : { amount: payment.paidAmount ?? 0, date: payment.paidAt };

/** Monto que cuenta en Dinero (ADR-0046, BR-DEP-14): real si cobrado o entregado, acordado si por cobrar, 0 si cancelado. */
export const moneyAmount = (payment: Pick<Payment, 'status' | 'agreedAmount' | 'paidAmount'>): COP => {
  switch (payment.status) {
    case 'collected':
    case 'delivered':
      return payment.paidAmount ?? 0;
    case 'scheduled':
      return payment.agreedAmount ?? 0;
    case 'canceled':
      return 0;
  }
};
