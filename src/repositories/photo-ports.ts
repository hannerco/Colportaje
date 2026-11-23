import type { PhotoKind } from '@/domain/photo';
import type { AppError } from '@/domain/shared/errors';
import type { Result } from '@/domain/shared/result';
import type { Instant } from '@/domain/time';

/** Imagen ya leída. `source` es propio de cada implementación (p. ej. un ImageBitmap). */
export type DecodedImage = { readonly width: number; readonly height: number; readonly source: unknown };

/** Lee y codifica imágenes en el dispositivo (BR-PHO-01: la compresión es en el cliente). */
export interface ImageCodec {
  /** `null` si el archivo no es una imagen legible. */
  decode(file: Blob): Promise<DecodedImage | null>;
  /**
   * WebP con las dimensiones y la calidad (0–1) pedidas. Con `frame`, el lienzo mide eso y la imagen va centrada en
   * él; lo que sobra queda transparente (portadas cuadradas, #40).
   */
  encodeWebp(
    image: DecodedImage,
    size: { width: number; height: number },
    quality: number,
    frame?: { width: number; height: number },
  ): Promise<Blob>;
}

/** Archivos del bucket privado de fotos (ADR-0013). */
export interface StorageRepository {
  /** Subir de nuevo la misma ruta reemplaza el archivo, no lo duplica. Errores: `NETWORK_ERROR`, `FORBIDDEN`. */
  upload(path: string, blob: Blob): Promise<Result<void, AppError>>;
  /** URL temporal para ver una foto privada (R3). */
  signedUrl(path: string, seconds: number): Promise<Result<string, AppError>>;
  remove(paths: readonly string[]): Promise<Result<void, AppError>>;
}

export type NewPhoto = {
  readonly id: string;
  readonly kind: PhotoKind;
  readonly path: string;
  readonly thumbPath: string;
  readonly bytes: number;
  /** Cliente de la foto: obligatorio en `customer_info` y `customer_invoice` (HU-CLI-07). */
  readonly customerId?: string;
  /** Abibono del recibo: obligatorio en `deposit_receipt` (HU-DIN-04). */
  readonly leaderDepositId?: string;
};

/** Una foto guardada, tal como la necesita una lista (HU-CLI-07). */
export type StoredPhoto = {
  readonly id: string;
  readonly path: string;
  readonly thumbPath: string;
  readonly createdAt: Instant;
};

/** Filas de la tabla `photo`. Las HU dueñas amplían `NewPhoto` con su vínculo (cliente, factura, Abibono). */
export interface PhotoRepository {
  /**
   * Idempotente por `id` (AF-91). Con cliente: `NOT_FOUND` si no existe y `CUSTOMER_ARCHIVED` si está
   * archivado (HU-CLI-07). Con Abibono: `NOT_FOUND` si no existe (HU-DIN-04).
   */
  create(photo: NewPhoto): Promise<Result<void, AppError>>;
  /**
   * Borrado lógico; el archivo se conserva (BR-PHO-03). Con `kind`, solo borra una foto de ese tipo
   * (otra cualquiera da `NOT_FOUND`). Borrar de nuevo una ya borrada no falla. Un recibo de un Abibono
   * confirmado da `RECEIPT_LOCKED` (HU-DIN-04).
   */
  softDelete(id: string, options?: { kind?: PhotoKind }): Promise<Result<void, AppError>>;
  /** Fotos vigentes de un tipo de un cliente, la más reciente primero (HU-CLI-07). */
  listOfCustomer(customerId: string, kind: PhotoKind): Promise<Result<StoredPhoto[], AppError>>;
  /** Rutas de una foto vigente. Errores: `NOT_FOUND` (no existe, es ajena o está borrada). */
  getPaths(id: string): Promise<Result<{ path: string; thumbPath: string }, AppError>>;
  /** Bytes ocupados por las fotos del usuario, incluidas las borradas (BR-PHO-04). */
  totalBytes(): Promise<Result<number, AppError>>;
}
