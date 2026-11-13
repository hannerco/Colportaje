import type { AppError } from '@/domain/shared/errors';
import type { Result } from '@/domain/shared/result';
import type { COP } from '@/domain/money';
import type { PaymentStatus, PayMethod } from '@/domain/payment';
import type { PlanMode } from '@/domain/payment-plan';
import type { ExcessChoice, ExcessTrigger } from '@/domain/schedule-excess';
import type { LocalDate } from '@/domain/time';

/** Abonos (HU-ABO-*). Cada HU de Abonos agrega aquí sus acciones. */
export interface PaymentRepository {
  /**
   * Aplica la opción elegida ante abonos que no cuadran (HU-ABO-07, función `resolve_schedule_excess`).
   * El servidor recalcula el sobrante sobre lo vigente. Errores: `NO_EXCESS`, `LEAVE_NOT_ALLOWED`,
   * `CONFLICT` (los programados cambiaron), `NOT_FOUND`, `VALIDATION`, `FORBIDDEN`, `NETWORK_ERROR`.
   */
  resolveScheduleExcess(
    customerId: string,
    choice: ExcessChoice,
    trigger: ExcessTrigger,
  ): Promise<Result<void, AppError>>;

  /**
   * Cuota inicial de la ficha nueva (una sola): 0 la borra; > 0 la crea con fecha de hoy o actualiza su valor
   * (HU-ABO-02). Errores: `VALIDATION`, `PAYMENT_LOCKED`, `CUSTOMER_ARCHIVED`, `NOT_FOUND`, `NETWORK_ERROR`.
   */
  setCreationDownPayment(input: {
    paymentId: string;
    customerId: string;
    amount: COP;
    method: PayMethod;
  }): Promise<Result<void, AppError>>;

  /**
   * Registra un cobro (otra cuota inicial o abono extra) en un cliente guardado. Idempotente por `paymentId`.
   * Errores: `VALIDATION`, `CUSTOMER_ARCHIVED`, `CONFLICT`, `NOT_FOUND`, `NETWORK_ERROR`.
   */
  registerCollected(input: {
    paymentId: string;
    customerId: string;
    kind: 'down_payment' | 'extra';
    paidAmount: COP;
    paidAt: LocalDate;
    method: PayMethod;
  }): Promise<Result<void, AppError>>;

  /** Corrige un cobro. Errores: `VALIDATION`, `PAYMENT_LOCKED`, `NOT_FOUND`, `NETWORK_ERROR`. */
  updateCollected(
    paymentId: string,
    patch: { paidAmount?: COP; paidAt?: LocalDate; method?: PayMethod },
  ): Promise<Result<{ customerId: string }, AppError>>;

  /**
   * Borra (lógico) un abono por cobrar o cobrado; lo quita de su Abibono borrador. Devuelve el cliente y el
   * estado que tenía. Errores: `PAYMENT_LOCKED`, `INVALID_TRANSITION`, `NOT_FOUND`, `NETWORK_ERROR`.
   */
  delete(paymentId: string): Promise<Result<{ customerId: string; previousStatus: PaymentStatus }, AppError>>;

  /**
   * Aplica un plan de abonos (HU-ABO-03). El servidor recalcula la base y exige que los abonos la sumen
   * exactamente. Idempotente por los ids. Errores: `PLAN_REQUIRES_BALANCE`, `PLAN_TOTAL_MISMATCH`,
   * `VALIDATION`, `CUSTOMER_ARCHIVED`, `CONFLICT`, `NOT_FOUND`, `NETWORK_ERROR`.
   */
  applyPlan(
    customerId: string,
    mode: PlanMode,
    items: readonly { paymentId: string; dueDate: LocalDate; amount: COP }[],
  ): Promise<Result<void, AppError>>;

  /**
   * Programa un abono suelto (HU-ABO-04). Idempotente por `paymentId`. Errores: `VALIDATION`,
   * `CUSTOMER_ARCHIVED`, `CONFLICT`, `NOT_FOUND`, `NETWORK_ERROR`.
   */
  scheduleSingle(input: {
    paymentId: string;
    customerId: string;
    agreedAmount: COP;
    dueDate: LocalDate;
  }): Promise<Result<void, AppError>>;

  /** Cambia el valor de un programado. Errores: `VALIDATION`, `PAYMENT_NOT_SCHEDULED`, `CUSTOMER_ARCHIVED`, `NOT_FOUND`. */
  updateScheduledAmount(
    paymentId: string,
    agreedAmount: COP,
  ): Promise<Result<{ customerId: string }, AppError>>;

  /** Corrige la fecha de un programado (y su fecha original), sin prórroga. Mismos errores. */
  correctScheduledDate(
    paymentId: string,
    dueDate: LocalDate,
  ): Promise<Result<{ customerId: string }, AppError>>;

  /** Cancela programados de un mismo cliente (motivo manual). Errores: `PAYMENT_NOT_SCHEDULED`, `VALIDATION`, `NOT_FOUND`. */
  cancelScheduled(paymentIds: readonly string[]): Promise<Result<{ customerId: string }, AppError>>;
}
