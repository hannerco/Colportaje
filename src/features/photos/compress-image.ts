import { businessConfig } from '@/domain/config/business-config';
import { fitWithin, PHOTO_ERROR_CODES } from '@/domain/photo';
import { appError, type AppError } from '@/domain/shared/errors';
import { err, ok, type Result } from '@/domain/shared/result';
import type { DecodedImage, ImageCodec } from '@/repositories';

export type CompressedPhoto = {
  readonly full: Blob;
  readonly thumb: Blob;
  readonly fullBytes: number;
  readonly thumbBytes: number;
};

type PhotoSettings = Pick<
  typeof businessConfig.photos,
  'maxLongSidePx' | 'targetBytes' | 'thumbnailMaxLongSidePx' | 'thumbnailTargetBytes'
>;

// Calidad WebP: se empieza alta y se baja de a poco hasta quedar bajo el objetivo (o llegar al mínimo).
const QUALITY_START = 0.82;
const QUALITY_MIN = 0.42;
const QUALITY_STEP = 0.1;

async function encodeUnder(
  codec: ImageCodec,
  image: DecodedImage,
  maxLongSide: number,
  targetBytes: number,
  square = false,
): Promise<Blob> {
  const size = fitWithin(image.width, image.height, maxLongSide);
  // #40: un lienzo cuadrado del lado mayor; la imagen centrada y lo demás transparente.
  const side = Math.max(size.width, size.height);
  const frame = square ? { width: side, height: side } : undefined;
  let quality = QUALITY_START;
  let blob = await codec.encodeWebp(image, size, quality, frame);
  while (blob.size > targetBytes && quality - QUALITY_STEP >= QUALITY_MIN) {
    quality -= QUALITY_STEP;
    blob = await codec.encodeWebp(image, size, quality, frame);
  }
  return blob;
}

/**
 * Portada de un título (#40): cuadrada de 600 × 600 (~60 KB) y miniatura de 160 × 160 (~8 KB), con el libro entero
 * centrado sobre fondo transparente. Errores: `IMAGE_UNREADABLE`, `IMAGE_ENCODING_FAILED`.
 */
export async function compressCover(
  codec: ImageCodec,
  file: Blob,
  settings: typeof businessConfig.covers = businessConfig.covers,
): Promise<Result<CompressedPhoto, AppError>> {
  const image = await codec.decode(file);
  if (!image) return err(appError(PHOTO_ERROR_CODES.IMAGE_UNREADABLE));
  try {
    const full = await encodeUnder(codec, image, settings.sidePx, settings.targetBytes, true);
    const thumb = await encodeUnder(
      codec,
      image,
      settings.thumbnailSidePx,
      settings.thumbnailTargetBytes,
      true,
    );
    return ok({ full, thumb, fullBytes: full.size, thumbBytes: thumb.size });
  } catch {
    return err(appError(PHOTO_ERROR_CODES.IMAGE_ENCODING_FAILED));
  }
}

/**
 * BR-PHO-01: WebP con lado mayor ≤ 1.280 px y objetivo ~150 KB, más una miniatura de ~15 KB.
 * Nunca se sube el original (R1). Errores: `IMAGE_UNREADABLE`, `IMAGE_ENCODING_FAILED`.
 */
export async function compressImage(
  codec: ImageCodec,
  file: Blob,
  settings: PhotoSettings = businessConfig.photos,
): Promise<Result<CompressedPhoto, AppError>> {
  const image = await codec.decode(file);
  if (!image) return err(appError(PHOTO_ERROR_CODES.IMAGE_UNREADABLE));
  try {
    const full = await encodeUnder(codec, image, settings.maxLongSidePx, settings.targetBytes);
    const thumb = await encodeUnder(
      codec,
      image,
      settings.thumbnailMaxLongSidePx,
      settings.thumbnailTargetBytes,
    );
    return ok({ full, thumb, fullBytes: full.size, thumbBytes: thumb.size });
  } catch {
    return err(appError(PHOTO_ERROR_CODES.IMAGE_ENCODING_FAILED));
  }
}
