/// <reference lib="webworker" />
// Service worker de la PWA (HU-BASE-06 R5, ADR-0003): precachea el esqueleto de la app para que abra
// sin conexión. Los datos sin conexión salen de la caché de TanStack Query en IndexedDB, no de aquí.
import { defaultCache } from '@serwist/turbopack/worker';
import {
  NetworkOnly,
  Serwist,
  type PrecacheEntry,
  type SerwistGlobalConfig,
  type RuntimeCaching,
} from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Ronda 37: si se abre sin conexión una página que aún no está guardada, se muestra «Sin conexión» (con el logo) en
// vez del error del navegador. La página se guarda al instalar el service worker.
const OFFLINE_PAGE = '/sin-conexion';

// Los datos de la base (Supabase: consultas, sesión y funciones) van SIEMPRE a la red. La regla por defecto de otros
// dominios (`cross-origin`, NetworkFirst) guardaba sus respuestas 1 hora y, si la red tardaba más de 10 s, entregaba la
// copia vieja: un cambio hecho en el celular no aparecía en el computador. Sin conexión, los datos salen de la caché de
// TanStack Query (IndexedDB), que ya muestra lo guardado al instante mientras llega lo nuevo. Las fotos (Storage) siguen
// con la regla por defecto.
const SUPABASE_DATA = /^\/(rest|auth|functions)\/v1\//;
const supabaseData: RuntimeCaching = {
  matcher: ({ sameOrigin, url }) => !sameOrigin && SUPABASE_DATA.test(url.pathname),
  handler: new NetworkOnly(),
};

const serwist = new Serwist({
  precacheEntries: [...(self.__SW_MANIFEST ?? []), { url: OFFLINE_PAGE, revision: 'marca-1' }],
  fallbacks: {
    entries: [{ url: OFFLINE_PAGE, matcher: ({ request }) => request.destination === 'document' }],
  },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [supabaseData, ...defaultCache],
});

serwist.addEventListeners();
