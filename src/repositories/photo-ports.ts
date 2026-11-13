import type { PhotoKind } from '@/domain/photo';
import type { AppError } from '@/domain/shared/errors';
import type { Result } from '@/domain/shared/result';

/** Imagen ya leída. `source` es propio de cada implementación (p. ej. un ImageBitmap). */
export type DecodedImage = { readonly width: number; readonly height: number; readonly source: unknown };

/** Lee y codifica imágenes en el dispositivo (BR-PHO-01: la compresión es en el cliente). */
export interface ImageCodec {
  /** `null` si el archivo no es una imagen legible. */
  decode(file: Blob): Promise<DecodedImage | null>;
  /** WebP con las dimensiones y la calidad (0–1) pedidas. */
  encodeWebp(image: DecodedImage, size: { width: number; height: number }, quality: number): Promise<Blob>;
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
};

/** Filas de la tabla `photo`. Las HU dueñas amplían `NewPhoto` con su vínculo (cliente, factura, Abibono). */
export interface PhotoRepository {
  /** Idempotente por `id` (AF-91). */
  create(photo: NewPhoto): Promise<Result<void, AppError>>;
  /** Borrado lógico; el archivo se conserva (BR-PHO-03). */
  softDelete(id: string): Promise<Result<void, AppError>>;
  /** Bytes ocupados por las fotos del usuario, incluidas las borradas (BR-PHO-04). */
  totalBytes(): Promise<Result<number, AppError>>;
}
