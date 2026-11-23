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

  async encodeWebp(image: DecodedImage, size, quality, frame = size) {
    const bitmap = image.source as ImageBitmap;
    const blob =
      typeof OffscreenCanvas !== 'undefined'
        ? await encodeOffscreen(bitmap, size, quality, frame)
        : await encodeWithElement(bitmap, size, quality, frame);
    if (blob.type !== 'image/webp') throw new Error('Este navegador no codifica WebP');
    return blob;
  },
};

type Size = { width: number; height: number };

/** La imagen centrada en el lienzo (`frame`); sin pintar el fondo, lo que sobra queda transparente. */
const offset = (size: Size, frame: Size) => ({
  x: Math.round((frame.width - size.width) / 2),
  y: Math.round((frame.height - size.height) / 2),
});

async function encodeOffscreen(bitmap: ImageBitmap, size: Size, quality: number, frame: Size) {
  const canvas = new OffscreenCanvas(frame.width, frame.height);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D no disponible');
  const { x, y } = offset(size, frame);
  context.drawImage(bitmap, x, y, size.width, size.height);
  return canvas.convertToBlob({ type: 'image/webp', quality });
}

function encodeWithElement(bitmap: ImageBitmap, size: Size, quality: number, frame: Size) {
  const canvas = document.createElement('canvas');
  canvas.width = frame.width;
  canvas.height = frame.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D no disponible');
  const { x, y } = offset(size, frame);
  context.drawImage(bitmap, x, y, size.width, size.height);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo codificar'))),
      'image/webp',
      quality,
    ),
  );
}
