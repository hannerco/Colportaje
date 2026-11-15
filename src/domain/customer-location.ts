// Ubicación del cliente y "Abrir en Maps" (HU-CLI-06, BR-CUS-08, ADR-0036, SECURITY.md).
import { businessConfig } from './config/business-config';
import { isValidMapsUrl } from './customer-data';
import { validationError, type AppError } from './shared/errors';
import { err, ok, type Result } from './shared/result';

/** Coordenadas con la precisión del GPS al capturarlas (`null` = sin GPS, el pin se ubicó a mano). */
export type CustomerLocation = {
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracyMeters: number | null;
};

export type MapPoint = { readonly lat: number; readonly lng: number };

/** Punto inicial del selector; `zoom` solo en la vista de Colombia (sin punto conocido). */
export type PickerCenter = MapPoint & { readonly zoom: number | null };

export const APPROXIMATE_ACCURACY_METERS = businessConfig.location.approximateAccuracyMeters;

const inRange = (value: unknown, limit: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= -limit && value <= limit;

/**
 * R1: latitud −90..90 y longitud −180..180 (las dos van juntas: este objeto siempre trae ambas; quitar la
 * ubicación es otra acción); la precisión, entero ≥ 0 o `null`. Error: `VALIDATION` con `field`.
 */
export const validateLocation = (input: CustomerLocation): Result<CustomerLocation, AppError> => {
  if (!inRange(input.latitude, 90)) return err(validationError('latitude'));
  if (!inRange(input.longitude, 180)) return err(validationError('longitude'));
  const accuracy = input.accuracyMeters;
  if (accuracy !== null && !(Number.isInteger(accuracy) && accuracy >= 0))
    return err(validationError('accuracyMeters'));
  return ok({ latitude: input.latitude, longitude: input.longitude, accuracyMeters: accuracy });
};

/** "Ubicación aproximada": precisión peor que `location.approximateAccuracyMeters` (50 m). */
export const isApproximate = (accuracyMeters: number | null): boolean =>
  accuracyMeters !== null && accuracyMeters > APPROXIMATE_ACCURACY_METERS;

/** Número con a lo sumo 6 decimales (los que guarda la base) y sin notación científica. */
const coordinate = (value: number): string => String(Number(value.toFixed(6)));

const SEARCH_URL = 'https://www.google.com/maps/search/?api=1&query=';

/**
 * Enlace de "Abrir en Maps" (R2): coordenadas → enlace pegado (validado) → búsqueda por la dirección en
 * texto → `null` (el botón no aparece). El de coordenadas se arma solo con números (R3).
 */
export const mapsLinkFor = (customer: {
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly mapsUrl: string | null;
  readonly address: string | null;
}): string | null => {
  const { latitude, longitude } = customer;
  if (inRange(latitude, 90) && inRange(longitude, 180))
    return `${SEARCH_URL}${coordinate(latitude)},${coordinate(longitude)}`;
  if (customer.mapsUrl && isValidMapsUrl(customer.mapsUrl)) return customer.mapsUrl;
  const address = customer.address?.trim();
  if (address) return `${SEARCH_URL}${encodeURIComponent(address)}`;
  return null;
};

/**
 * Centro inicial del selector: la ubicación guardada del cliente ("Cambiar"); si no hay, el último punto
 * elegido en este dispositivo; si no hay, la vista de Colombia (AF-109). El GPS, si responde, lo mueve el front.
 */
export const getInitialPickerCenter = ({
  customerLocation,
  lastChosenPoint,
}: {
  readonly customerLocation: Pick<CustomerLocation, 'latitude' | 'longitude'> | null;
  readonly lastChosenPoint: MapPoint | null;
}): PickerCenter => {
  if (customerLocation)
    return { lat: customerLocation.latitude, lng: customerLocation.longitude, zoom: null };
  if (lastChosenPoint) return { ...lastChosenPoint, zoom: null };
  return { ...businessConfig.location.defaultCenter };
};
