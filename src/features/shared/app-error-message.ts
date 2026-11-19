'use client';

import { useMemo } from 'react';
import { copy } from '@/copy/es';
import type { AppError } from '@/domain/shared/errors';
import { AppFailure } from './app-failure';

export type AppErrorMessage = {
  /** El texto para el usuario (`copy.errors.codes`). */
  readonly message: string;
  /** Si tiene sentido ofrecer «Reintentar» (solo fallos de red). */
  readonly retryable: boolean;
  /** El campo afectado (`details.field`), para mostrar el error junto a él en vez de en un Aviso. */
  readonly field?: string;
};

const MESSAGES: Readonly<Record<string, string>> = copy.errors.codes;

const asAppError = (error: unknown): AppError | null => {
  if (error instanceof AppFailure) return error.error;
  if (typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string')
    return error as AppError;
  return null;
};

/**
 * Traduce un error del back a texto (HU-PAN-BASE-01): acepta un `AppError` (de un `Result`), el `AppFailure` de una
 * lectura (`query.error`) o cualquier otra cosa lanzada (texto genérico, reintentable).
 */
export const appErrorMessage = (error: unknown): AppErrorMessage => {
  const appError = asAppError(error);
  if (!appError) return { message: copy.errors.unknown, retryable: true };
  const field = appError.details?.field;
  return {
    message: MESSAGES[appError.code] ?? copy.errors.unknown,
    retryable: appError.retryable,
    ...(typeof field === 'string' ? { field } : {}),
  };
};

/** `appErrorMessage` para pantallas: `null` si no hay error. Lo usan en el Aviso («Reintentar») o en el Campo. */
export function useAppErrorMessage(error: unknown): AppErrorMessage | null {
  return useMemo(() => (error === null || error === undefined ? null : appErrorMessage(error)), [error]);
}
