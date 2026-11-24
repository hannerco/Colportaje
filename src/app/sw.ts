/// <reference lib="webworker" />
// Service worker de la PWA (HU-BASE-06 R5, ADR-0003): precachea el esqueleto de la app para que abra
// sin conexión. Los datos sin conexión salen de la caché de TanStack Query en IndexedDB, no de aquí.
import { defaultCache } from '@serwist/turbopack/worker';
import { Serwist, type PrecacheEntry, type SerwistGlobalConfig } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Ronda 37: si se abre sin conexión una página que aún no está guardada, se muestra «Sin conexión» (con el logo) en
// vez del error del navegador. La página se guarda al instalar el service worker.
const OFFLINE_PAGE = '/sin-conexion';

const serwist = new Serwist({
  precacheEntries: [...(self.__SW_MANIFEST ?? []), { url: OFFLINE_PAGE, revision: 'marca-1' }],
  fallbacks: {
    entries: [{ url: OFFLINE_PAGE, matcher: ({ request }) => request.destination === 'document' }],
  },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
