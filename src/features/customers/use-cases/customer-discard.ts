// Descartar un cliente recién creado (HU-CLI-03, BR-CUS-14, AF-112, ADR-0038).
// Solo existe durante la creación: el front decide cuándo llamar (la base no guarda si se está creando).
import type { AppError } from '@/domain/shared/errors';
import type { Result } from '@/domain/shared/result';
import type { Connectivity, CustomerRepository, DiscardSummary } from '@/repositories';
import { runMutation } from '../../shared/run-mutation';

/**
 * Cantidades para la confirmación ("Se quitarán 2 libros y 1 abono"; todo en 0: "Se quitará este cliente").
 * Con `blockedByDeposit` el descarte se rechazará. Errores: `NOT_FOUND`, `NETWORK_ERROR`.
 */
export async function getDiscardSummary(
  deps: { readonly customers: CustomerRepository },
  customerId: string,
): Promise<Result<DiscardSummary, AppError>> {
  return deps.customers.getDiscardSummary(customerId);
}

/**
 * Descarta el cliente, todo o nada: sus libros vuelven a físico sin contar como devolución
 * (`wrong_registration`) y el cliente, sus abonos, facturas y fotos quedan borrados (lógico).
 * Errores: `OFFLINE` (sin intentar), `CUSTOMER_DISCARD_BLOCKED` (un abono ya está en un Abibono; no cambia
 * nada), `NOT_FOUND` (también si ya se descartó, p. ej. en un reintento tras un fallo de red),
 * `CUSTOMER_ARCHIVED`, `NETWORK_ERROR`.
 */
export async function discardNewCustomer(
  deps: { readonly customers: CustomerRepository; readonly connectivity: Connectivity },
  customerId: string,
): Promise<Result<void, AppError>> {
  return runMutation(deps.connectivity, () => deps.customers.discardNew(customerId));
}
