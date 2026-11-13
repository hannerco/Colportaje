import type { Connectivity } from '@/repositories';

/** Conexión según el navegador. Fuera del navegador (servidor, pruebas) se asume conectado. */
export const browserConnectivity: Connectivity = {
  isOnline: () => (typeof navigator === 'undefined' ? true : navigator.onLine),
};
