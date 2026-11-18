'use client';

import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import { MOBILE_MEDIA_QUERY } from '../tokens/breakpoints';

/** Forma de la interfaz: barra inferior y hojas en móvil; barra lateral y ventanas en escritorio (I-36). */
export type Platform = 'mobile' | 'desktop';

const PlatformContext = createContext<Platform | null>(null);

/**
 * Fija la plataforma de lo que envuelve. Lo usan los marcos del Storybook (cada uno con la suya, para verlas lado
 * a lado) y, en la app, quien quiera forzarla. Sin proveedor, `usePlatform()` usa el punto de corte.
 */
export function PlatformProvider({ platform, children }: { platform: Platform; children: ReactNode }) {
  return <PlatformContext.Provider value={platform}>{children}</PlatformContext.Provider>;
}

const subscribe = (onChange: () => void) => {
  const query = window.matchMedia(MOBILE_MEDIA_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};
const fromViewport = (): Platform => (window.matchMedia(MOBILE_MEDIA_QUERY).matches ? 'mobile' : 'desktop');
// En el servidor no hay ancho de ventana: escritorio hasta que el navegador mida.
const onServer = (): Platform => 'desktop';

/**
 * La plataforma vigente: la del `PlatformProvider` más cercano o, si no hay, la del ancho de la ventana (móvil por
 * debajo de 768 px). Solo la usan los componentes que cambian de **forma**; los demás cambian por tokens (CSS).
 */
export function usePlatform(): Platform {
  const fixed = useContext(PlatformContext);
  const viewport = useSyncExternalStore(subscribe, fromViewport, onServer);
  return fixed ?? viewport;
}
