import type { DecodedImage, ImageCodec } from '@/repositories';

/**
 * Códec del navegador con `createImageBitmap` y canvas (BR-PHO-01).
 * WebP cuando el navegador sabe codificarlo. Safari del iPhone no sabe (#55, OQ-43): `toBlob` devuelve PNG; entonces
 * se usa JPEG con la misma calidad, o PNG si la imagen lleva fondo transparente (portadas cuadradas, `frame`).
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

  async encodeImage(image: DecodedImage, size, quality, frame) {
    const bitmap = image.source as ImageBitmap;
    const encode = (type: string) =>
      typeof OffscreenCanvas !== 'undefined'
        ? encodeOffscreen(bitmap, size, quality, frame ?? size, type)
        : encodeWithElement(bitmap, size, quality, frame ?? size, type);
    const webp = await encode('image/webp');
    if (webp.type === 'image/webp') return webp;
    // Sin WebP: lo transparente (el relleno de una portada) solo se conserva en PNG.
    const fallback = await encode(frame ? 'image/png' : 'image/jpeg');
    if (fallback.type !== 'image/jpeg' && fallback.type !== 'image/png')
      throw new Error('Este navegador no codifica imágenes');
    return fallback;
  },
};

type Size = { width: number; height: number };

/** La imagen centrada en el lienzo (`frame`); sin pintar el fondo, lo que sobra queda transparente. */
const offset = (size: Size, frame: Size) => ({
  x: Math.round((frame.width - size.width) / 2),
  y: Math.round((frame.height - size.height) / 2),
});

async function encodeOffscreen(bitmap: ImageBitmap, size: Size, quality: number, frame: Size, type: string) {
  const canvas = new OffscreenCanvas(frame.width, frame.height);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D no disponible');
  const { x, y } = offset(size, frame);
  context.drawImage(bitmap, x, y, size.width, size.height);
  return canvas.convertToBlob({ type, quality });
}

function encodeWithElement(bitmap: ImageBitmap, size: Size, quality: number, frame: Size, type: string) {
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
      type,
      quality,
    ),
  );
}
