import type { MapPoint } from '@/domain/customer-location';

/**
 * Último punto elegido en el selector de ubicación, guardado solo en este dispositivo y a nombre de cada
 * usuario (HU-CLI-06, AF-109). Nunca falla: si el almacenamiento no está disponible, no recuerda nada.
 */
export interface LastPickerPointStore {
  get(userId: string): MapPoint | null;
  set(userId: string, point: MapPoint): void;
  /** Al cerrar sesión a propósito (dato personal, puede usar el teléfono otra persona). */
  clear(): void;
}
