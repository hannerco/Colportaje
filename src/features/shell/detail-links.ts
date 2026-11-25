'use client';

import { useCallback } from 'react';
import { readStoredDetailWindowMode } from '@/ui/organisms/DetailWindow';
import { usePlatform, type Platform } from '@/ui/platform';
import { ROUTES } from './navigation';

/** Lo que se abre en una Ventana de detalle; cada tipo recuerda su forma (lateral, centrada o página). */
export type DetailKind = 'customer' | 'payment' | 'copy' | 'deposit';

const PAGE: Record<DetailKind, (id: string) => string> = {
  customer: ROUTES.customer,
  payment: ROUTES.payment,
  copy: ROUTES.copy,
  deposit: ROUTES.deposit,
};

const IN_LIST: Record<DetailKind, (id: string) => string> = {
  customer: ROUTES.customerInList,
  payment: ROUTES.paymentInList,
  copy: ROUTES.copyInList,
  deposit: ROUTES.depositInList,
};

/**
 * La dirección de un registro según la forma que su tipo recuerda (2026-11-25): «Página» (o el celular) → su página;
 * lateral o centrada → su lista con él abierto en la Ventana. Así un enlace desde otra pantalla (p. ej. un abono desde
 * la ficha del cliente) abre en la forma en que se dejó ese tipo.
 */
export const detailHref = (kind: DetailKind, id: string, platform: Platform): string =>
  platform === 'mobile' || readStoredDetailWindowMode(kind) === 'page' ? PAGE[kind](id) : IN_LIST[kind](id);

/** `detailHref` con la plataforma de esta pantalla: `const href = useDetailHref(); href('payment', id)`. */
export function useDetailHref() {
  const platform = usePlatform();
  return useCallback((kind: DetailKind, id: string) => detailHref(kind, id, platform), [platform]);
}
