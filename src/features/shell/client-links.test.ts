import { describe, expect, it } from 'vitest';
import { internalHrefOf } from './client-links';

const ORIGIN = 'http://localhost:3000';

/** Un clic dentro de un enlace (o fuera de uno, con `href: null`). */
const click = (
  href: string | null,
  anchor: { target?: string; download?: boolean } = {},
  event: Partial<Record<'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'defaultPrevented', boolean>> = {},
) => ({
  button: 0,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  defaultPrevented: false,
  ...event,
  target: {
    closest: () =>
      href === null
        ? null
        : {
            href: new URL(href, ORIGIN).href,
            target: anchor.target ?? '',
            hasAttribute: (name: string) => name === 'download' && Boolean(anchor.download),
          },
  } as unknown as EventTarget,
});

describe('enlaces internos sin recargar (2026-11-25)', () => {
  it('un enlace de la app navega dentro, con la búsqueda y el ancla', () => {
    expect(internalHrefOf(click('/dinero?abono=p2#x'), ORIGIN)).toBe('/dinero?abono=p2#x');
  });

  it('con ⌘/Ctrl, en otra pestaña, descargas, otro sitio o la API, lo maneja el navegador', () => {
    expect(internalHrefOf(click('/clientes', {}, { metaKey: true }), ORIGIN)).toBeNull();
    expect(internalHrefOf(click('/clientes', { target: '_blank' }), ORIGIN)).toBeNull();
    expect(internalHrefOf(click('/recibo.pdf', { download: true }), ORIGIN)).toBeNull();
    expect(internalHrefOf(click('https://wa.me/57300'), ORIGIN)).toBeNull();
    expect(internalHrefOf(click('/api/errores'), ORIGIN)).toBeNull();
  });

  it('si la pantalla ya manejó el clic (p. ej. abrir en la Ventana), no se toca', () => {
    expect(internalHrefOf(click('/dinero/abonos/p2', {}, { defaultPrevented: true }), ORIGIN)).toBeNull();
  });

  it('fuera de un enlace, nada', () => {
    expect(internalHrefOf(click(null), ORIGIN)).toBeNull();
  });
});
