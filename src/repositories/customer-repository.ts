import type { AccountPayment, CustomerAccountInput } from '@/domain/customer';
import type { CustomerRef } from '@/domain/copies-list';
import type { CustomerPatch, DuplicateCandidate } from '@/domain/customer-data';
import type { CustomerDetailInput } from '@/domain/customer-detail';
import type { CustomerListCustomer } from '@/domain/customer-list';
import type { CustomerLocation } from '@/domain/customer-location';
import type { NewCustomerDraft } from '@/domain/new-customer';
import type { Payment } from '@/domain/payment';
import type { AppError } from '@/domain/shared/errors';
import type { Result } from '@/domain/shared/result';

/** Lo que hace falta para derivar la cuenta de un cliente, con sus abonos completos (sin borrados). */
export type CustomerAccountData = Omit<CustomerAccountInput, 'payments'> & {
  readonly payments: readonly Payment[];
};

/** Todo lo de la lista de clientes (HU-CLI-04), sin borrados; los títulos se leen aparte. */
export type CustomerListData = {
  readonly customers: readonly CustomerListCustomer[];
  /** Ejemplares vendidos (no borrados) de cualquier cliente. */
  readonly soldCopies: readonly {
    readonly copyId: string;
    readonly customerId: string;
    readonly titleId: string;
    readonly agreedPrice: number;
    readonly soldAt: Date;
  }[];
  /** Abonos no borrados de cualquier cliente. */
  readonly payments: readonly (AccountPayment & { readonly customerId: string })[];
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
   * Todo lo de la ficha (HU-CLI-12): el cliente, sus ejemplares vendidos con título y sus abonos (también
   * cancelados) con su Abibono y cuántas prórrogas tuvieron. Errores: `NOT_FOUND`, `NETWORK_ERROR`.
   */
  getDetailData(customerId: string): Promise<Result<CustomerDetailInput, AppError>>;

  /**
   * Crea el cliente con su nombre (HU-CLI-02). Idempotente por `id`: reintentar no duplica ni pisa lo ya
   * escrito. Errores: `VALIDATION` (`field: name`), `CONFLICT` (el id es de otro), `NETWORK_ERROR`.
   */
  create(input: { readonly id: string; readonly name: string }): Promise<Result<{ id: string }, AppError>>;

  /**
   * Guarda un cliente nuevo con todo lo que se le puso (ronda 35, #57): datos, libros vendidos, cuota inicial y plan,
   * en una sola transacción. Reintentar con el mismo id no duplica. Errores: `VALIDATION`, `COPY_NOT_IN_STOCK` (otro
   * dispositivo ya lo vendió), `CONFLICT`, `NETWORK_ERROR`.
   */
  saveNew(draft: NewCustomerDraft): Promise<Result<{ id: string }, AppError>>;

  /**
   * Cambia solo los datos del parche (ya validado). Errores: `VALIDATION` (`details.field`),
   * `CUSTOMER_ARCHIVED`, `NOT_FOUND`, `NETWORK_ERROR`.
   */
  update(id: string, patch: CustomerPatch): Promise<Result<void, AppError>>;

  /**
   * Guarda (ya validada) o quita (`null`: coordenadas y precisión vacías) la ubicación; mueve la última
   * modificación (HU-CLI-06). Errores: `VALIDATION` (`details.field`), `CUSTOMER_ARCHIVED`, `NOT_FOUND`,
   * `NETWORK_ERROR`.
   */
  setLocation(id: string, location: CustomerLocation | null): Promise<Result<void, AppError>>;

  /**
   * Archiva (HU-CLI-11): cancela sus programados con motivo `customer_archived` y fija `archived_at`, en una
   * transacción. Ya archivado: no hace nada. Errores: `CUSTOMER_HAS_BOOKS`, `NOT_FOUND`, `NETWORK_ERROR`.
   */
  archive(id: string): Promise<Result<void, AppError>>;

  /** Restaura (los cancelados siguen cancelados). Errores: `CUSTOMER_NOT_ARCHIVED`, `NOT_FOUND`, `NETWORK_ERROR`. */
  restore(id: string): Promise<Result<void, AppError>>;

  /** Clientes no borrados (incluidos archivados) para buscar posibles duplicados (BR-CUS-11). */
  listDuplicateCandidates(): Promise<Result<DuplicateCandidate[], AppError>>;

  /** Nombre y emoji de los clientes no borrados (incluidos archivados), para mostrarlos en otras listas. */
  listRefs(): Promise<Result<CustomerRef[], AppError>>;

  /** Nombre y emoji de estos clientes (los que existan y sean del usuario). */
  getRefs(ids: readonly string[]): Promise<Result<CustomerRef[], AppError>>;

  /**
   * Todos los clientes no borrados (incluidos archivados y prospectos) con sus ejemplares vendidos y abonos,
   * para calcular la lista en el teléfono (HU-CLI-04, ARCHITECTURE §5). Errores: `NETWORK_ERROR`.
   */
  listForCustomerList(): Promise<Result<CustomerListData, AppError>>;

  /** Resumen para la confirmación de "Descartar". Errores: `NOT_FOUND`, `NETWORK_ERROR`. */
  getDiscardSummary(customerId: string): Promise<Result<DiscardSummary, AppError>>;

  /**
   * Descarta el cliente en una transacción: libros a físico (`wrong_registration`) y cliente, abonos,
   * facturas y fotos con `deleted_at` (HU-CLI-03). Errores: `CUSTOMER_DISCARD_BLOCKED`, `NOT_FOUND` (también
   * si ya se descartó), `CUSTOMER_ARCHIVED`, `NETWORK_ERROR`.
   */
  discardNew(customerId: string): Promise<Result<void, AppError>>;
}
