import type { LocalDate } from '@/domain/time';

/** A qué va una foto pendiente. Crecer = otro `type` (p. ej. el recibo de un Abibono) y su paso en la bandeja. */
export type PendingPhotoTarget =
  | { readonly type: 'customer_info' }
  | {
      readonly type: 'customer_invoice';
      readonly invoiceId: string;
      /** La primera foto de una factura la crea (BR-CUS-17); las demás se le agregan. */
      readonly createsInvoice: boolean;
      /** N.º y fecha escritos antes de guardar: se ponen al crear la factura. */
      readonly number: string | null;
      readonly date: LocalDate | null;
    };

/**
 * Una foto que espera subirse (ADR-0054). Vive en el teléfono hasta que sube: sobrevive a cerrar la app, a quedarse sin
 * señal y a reiniciar el teléfono.
 */
export type PendingPhoto = {
  readonly photoId: string;
  /** Usuario que la tomó: solo se sube con su sesión. */
  readonly ownerId: string;
  readonly customerId: string;
  readonly target: PendingPhotoTarget;
  /** El archivo tal como salió de la cámara o la galería; se comprime al subirlo (BR-PHO-01). */
  readonly file: Blob;
  /** Orden de llegada: se suben en ese orden (la primera foto de una factura la crea). */
  readonly queuedAt: number;
  /** Código del error que impide subirla y que no se arregla esperando; `null` mientras espera su turno. */
  readonly failure: string | null;
};

/** Bandeja de salida de fotos, guardada en el dispositivo (ADR-0054). */
export interface PhotoOutbox {
  /** Agrega o reemplaza (por `photoId`). */
  put(photos: readonly PendingPhoto[]): Promise<void>;
  list(): Promise<readonly PendingPhoto[]>;
  remove(photoId: string): Promise<void>;
}
