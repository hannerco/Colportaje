'use client';

import { useLayoutEffect, type RefObject } from 'react';

/**
 * Indicador que se desliza (#37, #38): coloca en `container` las variables `--indicator-x`, `--indicator-y`,
 * `--indicator-w` y `--indicator-h` con la posición de la opción activa (`activeSelector`), y marca `data-indicator`
 * cuando ya está en su sitio para que la transición solo corra al cambiar de opción, no al aparecer. Se recoloca si
 * cambia el tamaño (letra, ancho de la pantalla). El contenedor debe tener `position: relative`.
 */
type Box = { x: number; y: number; w: number; h: number };

/**
 * Última posición de cada indicador con memoria: al cambiar de módulo la navegación se vuelve a pintar (#38). Se guarda
 * también en la sesión del navegador (#78): si la página se recarga al navegar, el indicador igual sale de donde estaba.
 */
const remembered = new Map<string, Box>();
const STORAGE_KEY = 'colportor:indicators';

const recall = (key: string): Box | undefined => {
  const inMemory = remembered.get(key);
  if (inMemory) return inMemory;
  try {
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, Box>;
    return stored[key];
  } catch {
    return undefined;
  }
};

const remember = (key: string, box: Box) => {
  remembered.set(key, box);
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(remembered)));
  } catch {
    // Sin almacenamiento (ventana privada): basta con la memoria de esta página.
  }
};

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
      if (memory) remember(memory, box);
    };
    const previous = memory ? recall(memory) : undefined;
    let frame: number;
    if (previous && root.getAttribute('data-indicator') !== 'ready') {
      // Nueva página (#78, «como en WhatsApp»): aparece donde estaba y se desliza hasta la opción activa. La posición de
      // antes se pone y se calcula SIN transición, antes de medir nada (#98: medir primero dejaba calculada la esquina
      // de arriba y el indicador salía de ahí); luego se activa la transición y se mueve a la opción activa.
      set(previous);
      void root.getBoundingClientRect();
      root.setAttribute('data-indicator', 'ready');
      void root.getBoundingClientRect();
      place();
      frame = 0;
    } else {
      place();
      // La primera vez aparece en su sitio; desde el siguiente cuadro, los cambios se animan.
      frame = requestAnimationFrame(() => root.setAttribute('data-indicator', 'ready'));
    }
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place);
    observer?.observe(root);
    root.querySelectorAll<HTMLElement>(':scope > *').forEach((child) => observer?.observe(child));
    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [container, activeSelector, activeKey, memory]);
}
