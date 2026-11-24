'use client';

import type { ToastOptions } from '@/ui/molecules/Toast';
import { copy } from '@/copy/es';
import { appErrorMessage } from './app-error-message';
import { AppFailure } from './app-failure';

/** Dónde se registran los errores del navegador: el servidor de la app los escribe en los registros de Vercel. */
export const ERROR_REPORT_URL = '/api/errores';

const codeOf = (error: unknown): string => {
  const appError = error instanceof AppFailure ? error.error : error;
  if (
    typeof appError === 'object' &&
    appError !== null &&
    'code' in appError &&
    typeof appError.code === 'string'
  )
    return appError.code;
  return 'UNEXPECTED';
};

/** Referencia corta y legible (sin 0/O ni 1/I) para que el colportor la dicte: «K7Q2». */
const newRef = (): string => {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
};

/**
 * #104: registra un error con su código y una referencia corta, y devuelve ambos para mostrarlos. Va al servidor de la
 * app (que lo escribe en los registros de Vercel, Logs) sin datos de clientes: el código, dónde pasó y cuándo. Si no hay
 * red, se pierde el registro pero el usuario igual ve el código.
 */
export function reportError(error: unknown, where?: string): { code: string; ref: string } {
  const code = codeOf(error);
  const ref = newRef();
  if (typeof window !== 'undefined') {
    const body = JSON.stringify({
      ref,
      code,
      where: where ?? window.location.pathname,
      message: error instanceof Error ? error.message.slice(0, 300) : undefined,
      online: navigator.onLine,
      at: new Date().toISOString(),
    });
    try {
      if (!navigator.sendBeacon?.(ERROR_REPORT_URL, new Blob([body], { type: 'application/json' })))
        void fetch(ERROR_REPORT_URL, { method: 'POST', body, keepalive: true }).catch(() => undefined);
    } catch {
      // Registrar un error nunca debe romper la pantalla.
    }
  }
  return { code, ref };
}

/**
 * #104: el aviso de un error, igual en toda la app: qué pasó (en palabras del colportor) y, debajo, el código y la
 * referencia para reportarlo. Lo registra al mostrarlo.
 */
export function errorToast(error: unknown, extra?: Pick<ToastOptions, 'action'>): ToastOptions {
  const { code, ref } = reportError(error);
  return {
    message: appErrorMessage(error).message,
    detail: copy.errors.reference(code, ref),
    tone: 'error',
    ...extra,
  };
}
