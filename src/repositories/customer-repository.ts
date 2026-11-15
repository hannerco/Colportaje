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

/**
 * Lo que se perderá al descartar un cliente recién creado (HU-CLI-03): ejemplares vendidos, abonos (sin
 * cancelados), facturas y fotos de información; `blockedByDeposit` = algún abono está en un Abibono.
 */
export type DiscardSummary = {
  readonly books: number;
  readonly payments: number;
  readonly invoices: number;
  readonly photos: number;
  readonly blockedByDeposit: boolean;
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

  /** Resumen para la confirmación de "Descartar". Errores: `NOT_FOUND`, `NETWORK_ERROR`. */
  getDiscardSummary(customerId: string): Promise<Result<DiscardSummary, AppError>>;

  /**
   * Descarta el cliente en una transacción: libros a físico (`wrong_registration`) y cliente, abonos,
   * facturas y fotos con `deleted_at` (HU-CLI-03). Errores: `CUSTOMER_DISCARD_BLOCKED`, `NOT_FOUND` (también
   * si ya se descartó), `CUSTOMER_ARCHIVED`, `NETWORK_ERROR`.
   */
  discardNew(customerId: string): Promise<Result<void, AppError>>;
}
