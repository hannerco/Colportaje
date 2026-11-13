import type { COP } from './money';
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
