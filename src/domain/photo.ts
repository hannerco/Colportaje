/** Tipos de foto (enum `photo_kind`). */
export type PhotoKind = 'customer_info' | 'customer_invoice' | 'deposit_receipt';

export const PHOTO_ERROR_CODES = {
  /** El archivo no es una imagen que se pueda leer (HU-BASE-05). */
  IMAGE_UNREADABLE: 'IMAGE_UNREADABLE',
  /** El dispositivo no pudo codificar la imagen en WebP (p. ej. un navegador sin soporte). */
  IMAGE_ENCODING_FAILED: 'IMAGE_ENCODING_FAILED',
} as const;

/** BR-PHO-02: `{owner_id}/{kind}/{photo_id}.webp` y su miniatura `{photo_id}.thumb.webp`. */
export const photoPaths = (
  ownerId: string,
  kind: PhotoKind,
  photoId: string,
): { path: string; thumbPath: string } => ({
  path: `${ownerId}/${kind}/${photoId}.webp`,
  thumbPath: `${ownerId}/${kind}/${photoId}.thumb.webp`,
});

/** Dimensiones que caben en `maxLongSide` sin deformar ni agrandar (BR-PHO-01). */
export const fitWithin = (
  width: number,
  height: number,
  maxLongSide: number,
): { width: number; height: number } => {
  const longSide = Math.max(width, height);
  if (longSide <= maxLongSide) return { width, height };
  const scale = maxLongSide / longSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};
