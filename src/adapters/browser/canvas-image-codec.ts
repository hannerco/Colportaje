import type { DecodedImage, ImageCodec } from '@/repositories';

/**
 * Códec del navegador con `createImageBitmap` y canvas (BR-PHO-01).
 * Si el navegador no sabe codificar WebP, `toBlob` devuelve otro formato: se rechaza para no subir
 * algo que no sea WebP (el bucket solo acepta image/webp). Pendiente probar en iPhone real (SG-09, OQ-43).
 */
export const canvasImageCodec: ImageCodec = {
  async decode(file) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { width: bitmap.width, height: bitmap.height, source: bitmap };
    } catch {
      return null;
    }
  },

  async encodeWebp(image: DecodedImage, size, quality) {
    const bitmap = image.source as ImageBitmap;
    const blob =
      typeof OffscreenCanvas !== 'undefined'
        ? await encodeOffscreen(bitmap, size, quality)
        : await encodeWithElement(bitmap, size, quality);
    if (blob.type !== 'image/webp') throw new Error('Este navegador no codifica WebP');
    return blob;
  },
};

async function encodeOffscreen(
  bitmap: ImageBitmap,
  size: { width: number; height: number },
  quality: number,
) {
  const canvas = new OffscreenCanvas(size.width, size.height);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D no disponible');
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  return canvas.convertToBlob({ type: 'image/webp', quality });
}

function encodeWithElement(bitmap: ImageBitmap, size: { width: number; height: number }, quality: number) {
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D no disponible');
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo codificar'))),
      'image/webp',
      quality,
    ),
  );
}
