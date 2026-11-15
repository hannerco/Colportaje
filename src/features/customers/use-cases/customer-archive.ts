// Archivar y restaurar un cliente (HU-CLI-11, BR-CUS-09, ADR-0022). Archivar reemplaza a eliminar.
import { buildArchivePreview, type ArchivePreview } from '@/domain/customer-archive';
import type { AppError } from '@/domain/shared/errors';
import { ok, type Result } from '@/domain/shared/result';
import type { Connectivity, CustomerRepository } from '@/repositories';
import { runMutation } from '../../shared/run-mutation';

type Deps = { readonly customers: CustomerRepository; readonly connectivity: Connectivity };

/**
 * Vista previa para la confirmación: si se puede archivar, cuántos libros tiene vendidos y qué abonos por
 * cobrar se cancelarán. Errores: `NOT_FOUND`, `NETWORK_ERROR`.
 */
export async function getArchivePreview(
  deps: Pick<Deps, 'customers'>,
  customerId: string,
): Promise<Result<ArchivePreview, AppError>> {
  const data = await deps.customers.getAccountData(customerId);
  if (!data.ok) return data;
  return ok(buildArchivePreview(data.value.soldCopies.length, data.value.payments));
}

/**
 * Archiva: cancela sus abonos por cobrar (motivo `customer_archived`); los cobrados siguen en Dinero para
 * entregarlos. Ya archivado: no hace nada. Errores: `OFFLINE`, `CUSTOMER_HAS_BOOKS`, `NOT_FOUND`,
 * `NETWORK_ERROR`.
 */
export async function archiveCustomer(deps: Deps, customerId: string): Promise<Result<void, AppError>> {
  return runMutation(deps.connectivity, () => deps.customers.archive(customerId));
}

/** Restaura; los abonos cancelados siguen cancelados. Errores: `OFFLINE`, `CUSTOMER_NOT_ARCHIVED`, `NOT_FOUND`. */
export async function restoreCustomer(deps: Deps, customerId: string): Promise<Result<void, AppError>> {
  return runMutation(deps.connectivity, () => deps.customers.restore(customerId));
}
