import { describe, expect, it } from 'vitest';
import { PLATFORM_SCRIPT } from './platform-script';

/** Corre el script con una ventana falsa de `width` px; devuelve el atributo y cómo cambiar el ancho. */
const run = (width: number) => {
  const attributes: Record<string, string> = {};
  let listener: (() => void) | undefined;
  let current = width;
  const query = {
    get matches() {
      return current <= 767;
    },
    addEventListener: (_type: string, fn: () => void) => (listener = fn),
  };
  const window = { matchMedia: (q: string) => (q === '(max-width: 767px)' ? query : null) };
  const document = { documentElement: { setAttribute: (k: string, v: string) => (attributes[k] = v) } };
  new Function('window', 'document', PLATFORM_SCRIPT)(window, document);
  return {
    platform: () => attributes['data-platform'],
    resize: (next: number) => {
      current = next;
      listener?.();
    },
  };
};

describe('PLATFORM_SCRIPT (HU-PAN-BASE-01, I-36)', () => {
  it('fija la plataforma antes de pintar: móvil por debajo de 768 px', () => {
    expect(run(390).platform()).toBe('mobile');
    expect(run(767).platform()).toBe('mobile');
    expect(run(768).platform()).toBe('desktop');
    expect(run(1440).platform()).toBe('desktop');
  });

  it('R1: de 800 a 700 px pasa a móvil sin recargar (y vuelve)', () => {
    const page = run(800);
    expect(page.platform()).toBe('desktop');
    page.resize(700);
    expect(page.platform()).toBe('mobile');
    page.resize(800);
    expect(page.platform()).toBe('desktop');
  });
});
