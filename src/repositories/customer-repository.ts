import type { CustomerAccountInput } from '@/domain/customer';
import type { CustomerRef } from '@/domain/copies-list';
import type { CustomerPatch, DuplicateCandidate } from '@/domain/customer-data';
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

  /**
   * Crea el cliente con su nombre (HU-CLI-02). Idempotente por `id`: reintentar no duplica ni pisa lo ya
   * escrito. Errores: `VALIDATION` (`field: name`), `CONFLICT` (el id es de otro), `NETWORK_ERROR`.
   */
  create(input: { readonly id: string; readonly name: string }): Promise<Result<{ id: string }, AppError>>;

  /**
   * Cambia solo los datos del parche (ya validado). Errores: `VALIDATION` (`details.field`),
   * `CUSTOMER_ARCHIVED`, `NOT_FOUND`, `NETWORK_ERROR`.
   */
  update(id: string, patch: CustomerPatch): Promise<Result<void, AppError>>;

  /** Clientes no borrados (incluidos archivados) para buscar posibles duplicados (BR-CUS-11). */
  listDuplicateCandidates(): Promise<Result<DuplicateCandidate[], AppError>>;

  /** Nombre y emoji de los clientes no borrados (incluidos archivados), para mostrarlos en otras listas. */
  listRefs(): Promise<Result<CustomerRef[], AppError>>;

  /** Nombre y emoji de estos clientes (los que existan y sean del usuario). */
  getRefs(ids: readonly string[]): Promise<Result<CustomerRef[], AppError>>;
}
