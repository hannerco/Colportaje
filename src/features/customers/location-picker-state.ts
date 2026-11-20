// Estado del selector de ubicación (HU-PAN-CLI-06, diseño «8 · Elegir ubicación», ADR-0036, AF-109..111).
import { isApproximate, type MapPoint } from '@/domain/customer-location';

/** Lo que respondió el GPS del navegador. */
export type GpsState =
  | { readonly status: 'idle' }
  | { readonly status: 'searching' }
  | { readonly status: 'fixed'; readonly point: MapPoint; readonly accuracyMeters: number }
  | { readonly status: 'denied' }
  | { readonly status: 'unavailable' };

/**
 * Estados del lienzo: buscando, encontrada, aproximada (más de 50 m), negado, sin señal y `manual` (el pin está donde
 * lo dejó el usuario o en la ubicación guardada, sin precisión de GPS: «guardada»). Sin conexión es aparte.
 */
export type PickerStatus = 'searching' | 'found' | 'approximate' | 'denied' | 'noSignal' | 'manual';

/** Zoom con un punto conocido (calle y casas); la vista de Colombia trae el suyo. */
export const PICKER_POINT_ZOOM = 17;

/**
 * Dos centros a menos de esto (en grados, ~1 m) son el mismo: el mapa redondea a píxeles (un píxel mide ~1 m con el
 * zoom del selector), así que el centro puede quedar unos centímetros corrido sin que nadie lo haya movido.
 */
const SAME_POINT = 1e-5;

export const samePoint = (a: MapPoint, b: MapPoint) =>
  Math.abs(a.lat - b.lat) < SAME_POINT && Math.abs(a.lng - b.lng) < SAME_POINT;

/** El pin dejó de estar en el punto del GPS: el usuario movió el mapa. */
export const movedFromFix = (gps: GpsState, pin: MapPoint) =>
  gps.status === 'fixed' && !samePoint(gps.point, pin);

/** El estado que se pinta: el del GPS mientras el pin siga en su punto; si el usuario lo movió, `manual`. */
export const pickerStatus = (gps: GpsState, pin: MapPoint): PickerStatus => {
  switch (gps.status) {
    case 'searching':
      return 'searching';
    case 'denied':
      return 'denied';
    case 'unavailable':
      return 'noSignal';
    case 'fixed':
      if (movedFromFix(gps, pin)) return 'manual';
      return isApproximate(gps.accuracyMeters) ? 'approximate' : 'found';
    default:
      return 'manual';
  }
};

/** El punto que se guarda: el del GPS si el pin sigue en él (sin el redondeo del mapa); si no, el del pin. */
export const pickerPoint = (gps: GpsState, pin: MapPoint): MapPoint =>
  gps.status === 'fixed' && !movedFromFix(gps, pin) ? gps.point : pin;

/** La precisión que se guarda con el punto: la del GPS si el pin sigue en él; si se movió a mano, `null`. */
export const pickerAccuracy = (gps: GpsState, pin: MapPoint): number | null =>
  gps.status === 'fixed' && !movedFromFix(gps, pin) ? gps.accuracyMeters : null;

/** Coordenadas con 4 decimales, coma decimal y signo menos tipográfico: «6,2518, −75,5915». */
export const formatCoordinates = ({ lat, lng }: MapPoint): string => {
  const one = (value: number) => value.toFixed(4).replace('.', ',').replace('-', '−');
  return `${one(lat)}, ${one(lng)}`;
};

/** Seis decimales, los que guarda la base. */
export const roundCoordinate = (value: number) => Number(value.toFixed(6));
