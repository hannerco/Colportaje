'use client';

import { useSyncExternalStore } from 'react';

// Modo administrador (BR-USR-04, #42): un conmutador de la interfaz en Ajustes, solo para quien tiene el rol admin.
// Apagado, Admin no aparece en la navegación. Es una preferencia de este dispositivo; la autorización real sigue en el
// servidor (RLS). Encendido por defecto.

const KEY = 'colportor.admin-mode';
const listeners = new Set<() => void>();

const read = () => {
  try {
    return window.localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
};

export function setAdminMode(on: boolean) {
  try {
    if (on) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, 'off');
  } catch {
    // Sin almacenamiento: no se recuerda.
  }
  listeners.forEach((listener) => listener());
}

/** `true` si el modo administrador está encendido en este dispositivo. */
export function useAdminMode(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    read,
    () => true,
  );
}
