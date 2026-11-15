// Ubicación del cliente (HU-CLI-06, BR-CUS-08, ADR-0036). El mapa, el pin y el GPS son del front.
import {
  getInitialPickerCenter,
  validateLocation,
  type CustomerLocation,
  type MapPoint,
  type PickerCenter,
} from '@/domain/customer-location';
import type { AppError } from '@/domain/shared/errors';
import { ok, type Result } from '@/domain/shared/result';
import type { AuthRepository, Connectivity, CustomerRepository, LastPickerPointStore } from '@/repositories';
import { runMutation } from '../../shared/run-mutation';

export type CustomerLocationDeps = {
  readonly customers: CustomerRepository;
  readonly connectivity: Connectivity;
  readonly auth: AuthRepository;
  readonly lastPickerPoint: LastPickerPointStore;
};

/**
 * Guarda la ubicación confirmada en el selector y la recuerda en el dispositivo como último punto elegido.
 * Errores: `OFFLINE` (sin intentar), `VALIDATION` (`field`: `latitude`, `longitude`, `accuracyMeters`),
 * `CUSTOMER_ARCHIVED`, `NOT_FOUND`, `NETWORK_ERROR`.
 */
export async function setCustomerLocation(
  deps: CustomerLocationDeps,
  customerId: string,
  input: CustomerLocation,
): Promise<Result<void, AppError>> {
  return runMutation(deps.connectivity, async () => {
    const valid = validateLocation(input);
    if (!valid.ok) return valid;
    const saved = await deps.customers.setLocation(customerId, valid.value);
    if (!saved.ok) return saved;
    await rememberLastChosenPoint(deps, { lat: valid.value.latitude, lng: valid.value.longitude });
    return ok(undefined);
  });
}

/** "Quitar": coordenadas y precisión vacías. Errores: `OFFLINE`, `CUSTOMER_ARCHIVED`, `NOT_FOUND`, `NETWORK_ERROR`. */
export async function clearCustomerLocation(
  deps: Pick<CustomerLocationDeps, 'customers' | 'connectivity'>,
  customerId: string,
): Promise<Result<void, AppError>> {
  return runMutation(deps.connectivity, () => deps.customers.setLocation(customerId, null));
}

/** Recuerda el punto en este dispositivo, a nombre del usuario actual (sin sesión no recuerda nada). */
export async function rememberLastChosenPoint(
  deps: Pick<CustomerLocationDeps, 'auth' | 'lastPickerPoint'>,
  point: MapPoint,
): Promise<void> {
  const userId = await deps.auth.getCurrentUserId();
  if (userId) deps.lastPickerPoint.set(userId, point);
}

/**
 * Centro inicial del selector: la ubicación del cliente; si no hay, el último punto elegido en este
 * dispositivo por este usuario; si no hay, Colombia. Funciona sin conexión.
 */
export async function loadInitialPickerCenter(
  deps: Pick<CustomerLocationDeps, 'auth' | 'lastPickerPoint'>,
  customerLocation: Pick<CustomerLocation, 'latitude' | 'longitude'> | null,
): Promise<PickerCenter> {
  const userId = await deps.auth.getCurrentUserId();
  const lastChosenPoint = userId ? deps.lastPickerPoint.get(userId) : null;
  return getInitialPickerCenter({ customerLocation, lastChosenPoint });
}
