import { afterEach, describe, expect, it, vi } from 'vitest';
import { canvasImageCodec } from './canvas-image-codec';

/** Un lienzo falso que, como Safari del iPhone, no sabe WebP: devuelve PNG cuando se le pide WebP (#55). */
function fakeCanvas(supportsWebp: boolean) {
  class FakeOffscreenCanvas {
    constructor(
      public width: number,
      public height: number,
    ) {}
    getContext() {
      return { drawImage: vi.fn() };
    }
    async convertToBlob({ type }: { type: string }) {
      const produced = type === 'image/webp' && !supportsWebp ? 'image/png' : type;
      return new Blob([new Uint8Array(4)], { type: produced });
    }
  }
  vi.stubGlobal('OffscreenCanvas', FakeOffscreenCanvas);
}

const image = { width: 800, height: 600, source: {} };
const size = { width: 800, height: 600 };

afterEach(() => vi.unstubAllGlobals());

describe('canvasImageCodec.encodeImage (#55)', () => {
  it('con WebP, entrega WebP', async () => {
    fakeCanvas(true);
    expect((await canvasImageCodec.encodeImage(image, size, 0.8)).type).toBe('image/webp');
  });

  it('en un iPhone (sin WebP), una foto sale en JPEG', async () => {
    fakeCanvas(false);
    expect((await canvasImageCodec.encodeImage(image, size, 0.8)).type).toBe('image/jpeg');
  });

  it('en un iPhone, una portada con fondo transparente sale en PNG', async () => {
    fakeCanvas(false);
    const blob = await canvasImageCodec.encodeImage(image, size, 0.8, { width: 800, height: 800 });
    expect(blob.type).toBe('image/png');
  });
});
