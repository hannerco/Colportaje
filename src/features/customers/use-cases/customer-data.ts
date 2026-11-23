// Crear y editar un cliente (ficha viva) y buscar posibles duplicados (HU-CLI-02).
import {
  findPossibleDuplicates,
  validateCustomerName,
  validateCustomerPatch,
  type CustomerPatch,
  type PossibleDuplicate,
} from '@/domain/customer-data';
import { validateNewCustomer, type NewCustomerDraft } from '@/domain/new-customer';
import type { AppError } from '@/domain/shared/errors';
import { ok, type Result } from '@/domain/shared/result';
import type { Connectivity, CustomerRepository } from '@/repositories';
import { runMutation } from '../../shared/run-mutation';

export type CustomerDataDeps = {
  readonly customers: CustomerRepository;
  readonly connectivity: Connectivity;
};

/**
 * Crea el cliente en cuanto tiene nombre (BR-CUS-14, AF-108). Idempotente por `id` (CA-7).
 * Errores: `OFFLINE` (sin intentar), `VALIDATION` (`field: name`), `CONFLICT`, `NETWORK_ERROR`.
 */
export async function createCustomer(
  deps: CustomerDataDeps,
  input: { readonly id: string; readonly name: string },
): Promise<Result<{ id: string }, AppError>> {
  return runMutation(deps.connectivity, async () => {
    const name = validateCustomerName(input.name);
    if (!name.ok) return name;
    return deps.customers.create({ id: input.id, name: name.value });
  });
}

/**
 * Guarda un dato de la ficha (cada uno por separado). Errores: `OFFLINE`, `VALIDATION` (`details.field`:
 * `name`, `avatarEmoji`, `mapsUrl`), `CUSTOMER_ARCHIVED`, `NOT_FOUND`, `NETWORK_ERROR`.
 */
export async function updateCustomer(
  deps: CustomerDataDeps,
  id: string,
  patch: CustomerPatch,
): Promise<Result<void, AppError>> {
  return runMutation(deps.connectivity, async () => {
    const valid = validateCustomerPatch(patch);
    if (!valid.ok) return valid;
    if (Object.keys(valid.value).length === 0) return ok(undefined);
    return deps.customers.update(id, valid.value);
  });
}

/** Posibles duplicados para el aviso no bloqueante (BR-CUS-11, AF-70). */
export async function loadPossibleDuplicates(
  deps: Pick<CustomerDataDeps, 'customers'>,
  query: {
    readonly name?: string | null;
    readonly phone?: string | null;
    readonly excludeId?: string | null;
  },
): Promise<Result<PossibleDuplicate[], AppError>> {
  const candidates = await deps.customers.listDuplicateCandidates();
  if (!candidates.ok) return candidates;
  return ok(findPossibleDuplicates(candidates.value, query));
}

/**
 * Guarda un cliente nuevo con todo lo que se le puso (ronda 35, #57): solo entonces existe. Errores: `OFFLINE`,
 * `VALIDATION` (`name`), `COPY_NOT_IN_STOCK`, `CONFLICT`, `NETWORK_ERROR`.
 */
export async function saveNewCustomer(
  deps: CustomerDataDeps,
  draft: NewCustomerDraft,
): Promise<Result<{ id: string }, AppError>> {
  return runMutation(deps.connectivity, async () => {
    const valid = validateNewCustomer(draft);
    if (!valid.ok) return valid;
    return deps.customers.saveNew(valid.value);
  });
}
