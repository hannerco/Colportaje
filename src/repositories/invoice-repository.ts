import type { Invoice } from '@/domain/invoice';
import type { AppError } from '@/domain/shared/errors';
import type { Result } from '@/domain/shared/result';
import type { LocalDate } from '@/domain/time';

/** Archivos de una foto ya subidos (HU-BASE-05). */
export type UploadedInvoicePhoto = {
  readonly photoId: string;
  readonly path: string;
  readonly thumbPath: string;
  readonly bytes: number;
};

/** Facturas del cliente (HU-CLI-08). Las escrituras pasan por funciones SQL. */
export interface InvoiceRepository {
  /** Facturas vigentes del cliente con sus fotos vigentes (sin orden: lo pone el dominio). */
  listOfCustomer(customerId: string): Promise<Result<Invoice[], AppError>>;

  /**
   * Crea la factura (fecha = hoy en Bogotá) con su primera foto, en una transacción. Idempotente por ids.
   * Errores: `CUSTOMER_ARCHIVED`, `NOT_FOUND`, `CONFLICT`, `NETWORK_ERROR`.
   */
  createWithPhoto(input: {
    invoiceId: string;
    customerId: string;
    photo: UploadedInvoicePhoto;
  }): Promise<Result<void, AppError>>;

  /** Agrega una foto. Idempotente por `photoId`. Errores: `CUSTOMER_ARCHIVED`, `NOT_FOUND`, `CONFLICT`, `NETWORK_ERROR`. */
  addPhoto(invoiceId: string, photo: UploadedInvoicePhoto): Promise<Result<void, AppError>>;

  /** N.º y fecha; clave ausente no cambia, `null` vacía. Errores: `VALIDATION`, `CUSTOMER_ARCHIVED`, `NOT_FOUND`. */
  update(
    invoiceId: string,
    patch: { number?: string | null; date?: LocalDate | null },
  ): Promise<Result<void, AppError>>;

  /** Borra (lógico) una foto; si era la última, también la factura. Errores: `NOT_FOUND`, `NETWORK_ERROR`. */
  deletePhoto(photoId: string): Promise<Result<{ invoiceDeleted: boolean }, AppError>>;
}
