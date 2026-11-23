'use client';

import { useLayoutEffect, type RefObject } from 'react';

/**
 * Indicador que se desliza (#37, #38): coloca en `container` las variables `--indicator-x`, `--indicator-y`,
 * `--indicator-w` y `--indicator-h` con la posición de la opción activa (`activeSelector`), y marca `data-indicator`
 * cuando ya está en su sitio para que la transición solo corra al cambiar de opción, no al aparecer. Se recoloca si
 * cambia el tamaño (letra, ancho de la pantalla). El contenedor debe tener `position: relative`.
 */
type Box = { x: number; y: number; w: number; h: number };

/** Última posición de cada indicador con memoria: al cambiar de módulo la navegación se vuelve a pintar (#38). */
const remembered = new Map<string, Box>();

export function useSlidingIndicator(
  container: RefObject<HTMLElement | null>,
  activeSelector: string,
  activeKey: unknown,
  /** Con nombre, el indicador sale de donde quedó la vez anterior (la barra lateral entre páginas). */
  memory?: string,
) {
  useLayoutEffect(() => {
    const root = container.current;
    if (!root) return;
    const set = (box: Box) => {
      const style = root.style;
      style.setProperty('--indicator-x', `${box.x}px`);
      style.setProperty('--indicator-y', `${box.y}px`);
      style.setProperty('--indicator-w', `${box.w}px`);
      style.setProperty('--indicator-h', `${box.h}px`);
    };
    const measure = (): Box | null => {
      const active = root.querySelector<HTMLElement>(activeSelector);
      return active
        ? { x: active.offsetLeft, y: active.offsetTop, w: active.offsetWidth, h: active.offsetHeight }
        : null;
    };
    const place = () => {
      const box = measure();
      if (!box) {
        root.removeAttribute('data-indicator');
        return;
      }
      set(box);
      if (memory) remembered.set(memory, box);
    };
    const previous = memory ? remembered.get(memory) : undefined;
    const target = measure();
    let frame: number;
    if (previous && target && root.getAttribute('data-indicator') !== 'ready') {
      // Nueva página: aparece donde estaba y se desliza a la opción activa.
      set(previous);
      root.setAttribute('data-indicator', 'ready');
      frame = requestAnimationFrame(place);
    } else {
      place();
      // La primera vez aparece en su sitio; desde el siguiente cuadro, los cambios se animan.
      frame = requestAnimationFrame(() => root.setAttribute('data-indicator', 'ready'));
    }
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place);
    observer?.observe(root);
    root.querySelectorAll<HTMLElement>(':scope > *').forEach((child) => observer?.observe(child));
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [container, activeSelector, activeKey, memory]);
}
