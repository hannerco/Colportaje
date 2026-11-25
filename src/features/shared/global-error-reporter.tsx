'use client';

import { useEffect } from 'react';
import { useToast } from '@/ui/molecules/Toast';
import { errorToast, reportError } from './error-report';

/**
 * 2026-11-25: no poder registrar el service worker (p. ej. en las vistas previas de Vercel, que lo redirigen por la
 * protección) no impide usar la app: solo quita el modo sin conexión. Se registra, pero no se avisa como un error.
 */
export const isServiceWorkerRegistrationFailure = (reason: unknown): boolean => {
  const message = reason instanceof Error ? reason.message : typeof reason === 'string' ? reason : '';
  return /ServiceWorker/i.test(message) && /regist/i.test(message);
};

/**
 * #104: un error que ninguna pantalla atrapó (una promesa que falló sin que nadie la esperara) se registra y se avisa
 * con su código, en vez de quedar en silencio y que la app parezca trabada.
 */
export function GlobalErrorReporter() {
  const toast = useToast();
  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      if (isServiceWorkerRegistrationFailure(event.reason)) {
        reportError(event.reason);
        return;
      }
      toast.show(errorToast(event.reason));
    };
    window.addEventListener('unhandledrejection', onRejection);
    return () => window.removeEventListener('unhandledrejection', onRejection);
  }, [toast]);
  return null;
}
