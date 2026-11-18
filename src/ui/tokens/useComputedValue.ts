'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Valor calculado de una propiedad CSS (p. ej. un token `--color-accent` o `font-size`) en el elemento del `ref`,
 * tal como lo resuelve el navegador en su tema y plataforma. Lo usan las páginas de Fundamentos para mostrar el
 * valor real de cada token en cada marco.
 */
export function useComputedValue<T extends HTMLElement>(property: string) {
  const ref = useRef<T>(null);
  const [value, setValue] = useState('');
  // Se lee al montar: los marcos del Storybook se vuelven a montar al cambiar Tema, Plataforma o Letra.
  useEffect(() => {
    if (ref.current) setValue(getComputedStyle(ref.current).getPropertyValue(property).trim());
  }, [property]);
  return [ref, value] as const;
}
