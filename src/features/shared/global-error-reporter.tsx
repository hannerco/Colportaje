'use client';

import { useEffect } from 'react';
import { useToast } from '@/ui/molecules/Toast';
import { errorToast } from './error-report';

/**
 * #104: un error que ninguna pantalla atrapó (una promesa que falló sin que nadie la esperara) se registra y se avisa
 * con su código, en vez de quedar en silencio y que la app parezca trabada.
 */
export function GlobalErrorReporter() {
  const toast = useToast();
  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => toast.show(errorToast(event.reason));
    window.addEventListener('unhandledrejection', onRejection);
    return () => window.removeEventListener('unhandledrejection', onRejection);
  }, [toast]);
  return null;
}
