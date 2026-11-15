import type { LeaderDeposit } from '@/domain/deposit';
import type { DepositPayment, ValidDepositDraft } from '@/domain/deposit-draft';
import type { MoneyDeposit } from '@/domain/deposits-list';
import type { ListPayment } from '@/domain/payments-list';
import type { AppError } from '@/domain/shared/errors';
import type { Result } from '@/domain/shared/result';
import type { StoredPhoto } from './photo-ports';

/** Un Abibono con lo necesario para verlo (HU-DIN-04). */
export type DepositRecord = {
  readonly deposit: LeaderDeposit;
  /** Abonos vinculados, con el nombre de su cliente. */
  readonly payments: readonly DepositPayment[];
  /** Recibos vigentes (no borrados). */
  readonly receipts: readonly StoredPhoto[];
  /** Mayor número asignado del colportor (`null` si ninguno): da el nombre sugerido de un borrador. */
  readonly lastNumber: number | null;
};

/** Dinero (HU-DIN-*). Cada HU de Dinero agrega aquí sus lecturas y acciones. */
export interface MoneyRepository {
  /**
   * Abonos no borrados de todos los clientes (también cancelados), con el Abibono en el que están. Sirve al
   * resumen (HU-DIN-02) y a la lista (HU-DIN-03). Errores: `NETWORK_ERROR`.
   */
  listPayments(): Promise<Result<ListPayment[], AppError>>;

  /**
   * Abibonos no borrados (borradores y confirmados) con montos, número, título, fecha y si tienen recibo activo.
   * Sirve al resumen (HU-DIN-02), a la propuesta (HU-DIN-04) y a la lista (HU-DIN-06). Errores: `NETWORK_ERROR`.
   */
  listDeposits(): Promise<Result<MoneyDeposit[], AppError>>;

  /** Un Abibono del usuario; `null` si no existe (o es ajeno). Errores: `NETWORK_ERROR`. */
  getDeposit(depositId: string): Promise<Result<DepositRecord | null, AppError>>;

  /**
   * Crea o actualiza el borrador en una transacción (HU-DIN-04, R2). Idempotente por `depositId`.
   * Errores: `PAYMENT_NOT_AVAILABLE` (`details.paymentIds`), `DEPOSIT_NOT_DRAFT`, `VALIDATION` (`details.field`),
   * `CONFLICT` (id ajeno), `NETWORK_ERROR`.
   */
  saveDepositDraft(draft: ValidDepositDraft): Promise<Result<{ depositId: string }, AppError>>;

  /**
   * Borra físicamente el borrador y las filas de sus recibos; sus abonos quedan libres (R5). Devuelve las rutas
   * de los archivos de esos recibos para borrarlos del bucket. Uno que ya no existe devuelve `[]`.
   * Errores: `DEPOSIT_NOT_DRAFT`, `NETWORK_ERROR`.
   */
  deleteDepositDraft(depositId: string): Promise<Result<{ paths: string[] }, AppError>>;
}
