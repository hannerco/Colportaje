import type { Connectivity } from '@/repositories';

/** Conexión controlable para pruebas: `setOnline(false)` simula cortar la red. */
export function fakeConnectivity(initial = true): Connectivity & { setOnline(online: boolean): void } {
  let online = initial;
  const listeners = new Set<(online: boolean) => void>();
  return {
    isOnline: () => online,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setOnline(next) {
      online = next;
      listeners.forEach((listener) => listener(next));
    },
  };
}
