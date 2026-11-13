import type { CustomerAccountInput } from '@/domain/customer';
import type { Payment } from '@/domain/payment';
import type { AppError } from '@/domain/shared/errors';
import type { Result } from '@/domain/shared/result';

/** Lo que hace falta para derivar la cuenta de un cliente, con sus abonos completos (sin borrados). */
export type CustomerAccountData = Omit<CustomerAccountInput, 'payments'> & {
  readonly payments: readonly Payment[];
};

/** Clientes (HU-CLI-*). Cada HU de Clientes agrega aquí sus lecturas y acciones. */
export interface CustomerRepository {
  /**
   * Datos para `computeCustomerAccount`: el cliente, sus ejemplares vendidos y sus abonos, sin borrados.
   * Errores: `NOT_FOUND` (no existe, no es del usuario o está borrado), `NETWORK_ERROR`.
   */
  getAccountData(customerId: string): Promise<Result<CustomerAccountData, AppError>>;
}
