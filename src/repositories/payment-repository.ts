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
   * Cuota inicial de la ficha nueva (una sola): 0 la borra; > 0 la crea con la fecha `paidOn` (hoy si no viene)
   * o actualiza su valor, su método y, si viene `paidOn`, su fecha (HU-ABO-02, HU-ABO-09). Errores:
   * `VALIDATION` (`paidAmount`, `paidOn`), `PAYMENT_LOCKED`, `CUSTOMER_ARCHIVED`, `NOT_FOUND`, `NETWORK_ERROR`.
   */
  setCreationDownPayment(input: {
    paymentId: string;
    customerId: string;
    amount: COP;
    method: PayMethod;
    paidOn?: LocalDate;
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

  /**
   * Prorroga un programado (HU-ABO-05): solo ese abono; la fecha original no cambia; deja su fila de
   * historial. Errores: `PAYMENT_NOT_SCHEDULED`, `DATE_NOT_LATER`,
   * `RESCHEDULE_NEEDS_CONFIRMATION` (`details.dates`), `CUSTOMER_ARCHIVED`, `NOT_FOUND`, `NETWORK_ERROR`.
   */
  reschedule(
    paymentId: string,
    input: { newDueDate: LocalDate; note?: string | null; confirmed?: boolean },
  ): Promise<
    Result<{ moved: { paymentId: string; previousDueDate: LocalDate; newDueDate: LocalDate }[] }, AppError>
  >;

  /**
   * Cobra un abono programado (HU-ABO-06): pasa a cobrado con el valor real (`null` = el acordado), la fecha
   * real y el método; conserva lo acordado. Devuelve el cliente, lo acordado y lo pagado. Errores:
   * `PAYMENT_NOT_SCHEDULED` (también si ya está cobrado), `VALIDATION` (`paidAmount`, `paidAt`),
   * `CUSTOMER_ARCHIVED`, `NOT_FOUND`, `NETWORK_ERROR`.
   */
  collect(
    paymentId: string,
    input: { paidAmount: COP | null; paidAt: LocalDate; method: PayMethod },
  ): Promise<Result<{ customerId: string; agreedAmount: COP; paidAmount: COP }, AppError>>;

  /**
   * Deshace el cobro de un abono programado (HU-ABO-10): vuelve a por cobrar y se borran su valor, fecha y método
   * reales. Errores: `INVALID_TRANSITION` (no está cobrado o no es programado), `PAYMENT_LOCKED` (está en un
   * Abibono), `CUSTOMER_ARCHIVED`, `NOT_FOUND`, `NETWORK_ERROR`.
   */
  uncollect(paymentId: string): Promise<Result<{ customerId: string }, AppError>>;
}
