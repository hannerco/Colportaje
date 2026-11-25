'use client';

import { useEffect } from 'react';

type ClickLike = Pick<
  MouseEvent,
  'defaultPrevented' | 'button' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'target'
>;
type AnchorLike = Pick<HTMLAnchorElement, 'href' | 'target' | 'hasAttribute'>;

/** ¿Este clic en un enlace debe navegar dentro de la app (sin recargar)? Devuelve la ruta, o `null`. */
export const internalHrefOf = (event: ClickLike, origin: string): string | null => {
  if (event.defaultPrevented || event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  const target = event.target as { closest?: (selector: string) => AnchorLike | null } | null;
  const anchor = target?.closest?.('a[href]') ?? null;
  if (!anchor) return null;
  if ((anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return null;
  const url = new URL(anchor.href, origin);
  if (url.origin !== origin || url.pathname.startsWith('/api/')) return null;
  return `${url.pathname}${url.search}${url.hash}`;
};

/**
 * Enlaces internos sin recargar (2026-11-25): un `<a href>` de la app (fila de una lista, un abono de «Abonos de …»,
 * el nombre de un cliente) navega como la barra de navegación, sin volver a cargar toda la página. Antes recargaba:
 * era más lento, perdía la Ventana abierta y volvía a registrar el service worker. Clic con ⌘/Ctrl, en otra pestaña,
 * descargas, otros sitios y las pantallas que ya manejan el clic (p. ej. abrir en la Ventana) siguen como siempre.
 */
export function useClientSideLinks(navigate: (href: string) => void) {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const href = internalHrefOf(event, window.location.origin);
      if (href === null) return;
      event.preventDefault();
      navigate(href);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [navigate]);
}
