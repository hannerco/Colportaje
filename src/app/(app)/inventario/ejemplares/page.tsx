'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useMemo } from 'react';
import type { CopiesListParams } from '@/domain/copies-list';
import {
  CopiesListScreen,
  copiesListParamsFromUrl,
  copiesListParamsToUrl,
  useCopiesList,
  useInStockSummary,
} from '@/features/inventory';
import { ROUTES, useAppShell } from '@/features/shell';

/**
 * Contenedor de la lista de ejemplares (HU-PAN-INV-02): la vista vive en la URL y los datos salen del back. Abrir una
 * fila lleva al Ejemplar (HU-PAN-INV-03).
 */
function CopiesRoute() {
  const { nav, isOnline, offlineBanner } = useAppShell();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useMemo(
    () => copiesListParamsFromUrl(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const list = useCopiesList(params);
  const summary = useInStockSummary();

  // La vista se escribe en la URL sin agregar pasos al historial y sin ir al servidor (también sin conexión).
  const onParamsChange = useCallback(
    (next: CopiesListParams) => {
      const text = copiesListParamsToUrl(next).toString();
      window.history.replaceState(null, '', text ? `${pathname}?${text}` : pathname);
    },
    [pathname],
  );

  return (
    <CopiesListScreen
      nav={nav}
      banner={offlineBanner}
      isOnline={isOnline}
      params={params}
      onParamsChange={onParamsChange}
      view={list.data}
      loading={list.isPending}
      error={list.isError}
      onRetry={() => void list.refetch()}
      copyHref={ROUTES.copy}
      inStockCount={summary.data?.booksTotal}
      onOpenInStock={() => router.push(ROUTES.inventory)}
    />
  );
}

export default function CopiesPage() {
  return (
    <Suspense>
      <CopiesRoute />
    </Suspense>
  );
}
