import type { SummaryDeposit } from '@/domain/money-summary';
import type { ListPayment } from '@/domain/payments-list';
import type { AppError } from '@/domain/shared/errors';
import type { Result } from '@/domain/shared/result';

/** Dinero (HU-DIN-*). Cada HU de Dinero agrega aquí sus lecturas y acciones. */
export interface MoneyRepository {
  /**
   * Abonos no borrados de todos los clientes (también cancelados), con el Abibono en el que están. Sirve al
   * resumen (HU-DIN-02) y a la lista (HU-DIN-03). Errores: `NETWORK_ERROR`.
   */
  listPayments(): Promise<Result<ListPayment[], AppError>>;

  /** Abibonos no borrados (borradores y confirmados) con sus montos. Errores: `NETWORK_ERROR`. */
  listSummaryDeposits(): Promise<Result<SummaryDeposit[], AppError>>;
}
