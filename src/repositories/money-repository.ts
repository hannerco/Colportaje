import type { SummaryDeposit, SummaryPayment } from '@/domain/money-summary';
import type { AppError } from '@/domain/shared/errors';
import type { Result } from '@/domain/shared/result';

/** Dinero (HU-DIN-*). Cada HU de Dinero agrega aquí sus lecturas y acciones. */
export interface MoneyRepository {
  /** Abonos no borrados de todos los clientes, con su método (HU-DIN-02). Errores: `NETWORK_ERROR`. */
  listSummaryPayments(): Promise<Result<(SummaryPayment & { readonly customerId: string })[], AppError>>;

  /** Abibonos no borrados (borradores y confirmados) con sus montos. Errores: `NETWORK_ERROR`. */
  listSummaryDeposits(): Promise<Result<SummaryDeposit[], AppError>>;
}
