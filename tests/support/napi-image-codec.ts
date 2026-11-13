// Códec real (Skia vía @napi-rs/canvas) para probar la compresión en Node (HU-BASE-05 CA-1).
// La app usa el códec de canvas del navegador (src/adapters/browser/canvas-image-codec.ts).
import { createCanvas, loadImage, type Image } from '@napi-rs/canvas';
import type { DecodedImage, ImageCodec } from '@/repositories';

export const napiImageCodec: ImageCodec = {
  async decode(file) {
    try {
      const image = await loadImage(Buffer.from(await file.arrayBuffer()));
      return { width: image.width, height: image.height, source: image };
    } catch {
      return null;
    }
  },

  async encodeWebp(image: DecodedImage, size, quality) {
    const canvas = createCanvas(size.width, size.height);
    canvas.getContext('2d').drawImage(image.source as Image, 0, 0, size.width, size.height);
    const bytes = await canvas.encode('webp', Math.round(quality * 100));
    return new Blob([new Uint8Array(bytes)], { type: 'image/webp' });
  },
};

/** Imagen sintética parecida a una foto (degradado, formas y grano), como JPEG de alta calidad. */
export function photoLikeJpeg(width: number, height: number): Blob {
  const canvas = createCanvas(width, height);
  const g = canvas.getContext('2d');
  const gradient = g.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#3a6ea5');
  gradient.addColorStop(0.5, '#e8c07d');
  gradient.addColorStop(1, '#2f5d3a');
  g.fillStyle = gradient;
  g.fillRect(0, 0, width, height);
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 400; i++) {
    g.fillStyle = `hsla(${random() * 360}, 60%, ${30 + random() * 40}%, 0.6)`;
    g.beginPath();
    g.arc(random() * width, random() * height, 20 + random() * 200, 0, Math.PI * 2);
    g.fill();
  }
  const pixels = g.getImageData(0, 0, width, height);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const grain = (random() - 0.5) * 30;
    pixels.data[i] = (pixels.data[i] ?? 0) + grain;
    pixels.data[i + 1] = (pixels.data[i + 1] ?? 0) + grain;
    pixels.data[i + 2] = (pixels.data[i + 2] ?? 0) + grain;
  }
  g.putImageData(pixels, 0, 0);
  return new Blob([new Uint8Array(canvas.encodeSync('jpeg', 93))], { type: 'image/jpeg' });
}
