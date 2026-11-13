import type { Connectivity } from '@/repositories';

/** Conexión según el navegador. Fuera del navegador (servidor, pruebas) se asume conectado. */
export const browserConnectivity: Connectivity = {
  isOnline: () => (typeof navigator === 'undefined' ? true : navigator.onLine),
  subscribe(listener) {
    if (typeof window === 'undefined') return () => {};
    const onOnline = () => listener(true);
    const onOffline = () => listener(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  },
};
