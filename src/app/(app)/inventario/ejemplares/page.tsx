'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useMemo } from 'react';
import { copy } from '@/copy/es';
import type { CopiesListParams } from '@/domain/copies-list';
import {
  CopiesListScreen,
  copiesListParamsFromUrl,
  copiesListParamsToUrl,
  useCopiesList,
  useInStockSummary,
} from '@/features/inventory';
import { ROUTES, useAppShell } from '@/features/shell';
import { readStoredDetailWindowMode } from '@/ui/organisms/DetailWindow';
import { usePlatform } from '@/ui/platform';
import { CopyDetailContainer } from './copy-detail-container';

/** El ejemplar abierto en la Ventana de detalle va en la URL (`?ejemplar=id`): «atrás» la cierra. */
const OPEN = 'ejemplar';

/**
 * Contenedor de la lista de ejemplares (HU-PAN-INV-02): la vista vive en la URL y los datos salen del back. Abrir una
 * fila en escritorio abre el Ejemplar (HU-PAN-INV-03) en la Ventana de detalle con la forma recordada; si es «Página»,
 * o en el celular, va a su página (#29, igual que Clientes).
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
  const platform = usePlatform();
  const selectedId = searchParams.get(OPEN) ?? undefined;

  const urlFor = useCallback(
    (next: CopiesListParams, open: string | undefined) => {
      const query = copiesListParamsToUrl(next);
      if (open) query.set(OPEN, open);
      const text = query.toString();
      return text ? `${pathname}?${text}` : pathname;
    },
    [pathname],
  );

  // La vista se escribe en la URL sin agregar pasos al historial y sin ir al servidor (también sin conexión).
  const onParamsChange = useCallback(
    (next: CopiesListParams) => window.history.replaceState(null, '', urlFor(next, selectedId)),
    [urlFor, selectedId],
  );
  const select = (id: string | undefined) => window.history.replaceState(null, '', urlFor(params, id));

  const rows = list.data?.rows ?? [];
  const index = rows.findIndex((row) => row.copyId === selectedId);

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
      selectedId={selectedId}
      onOpenCopy={(id) =>
        platform === 'mobile' || readStoredDetailWindowMode() === 'page'
          ? router.push(ROUTES.copy(id))
          : select(id)
      }
      detail={
        selectedId && platform === 'desktop' ? (
          <CopyDetailContainer
            key={selectedId}
            copyId={selectedId}
            window={{
              breadcrumb: { label: copy.inventory.title, href: ROUTES.copies },
              onClose: () => select(undefined),
              onPrev: index > 0 ? () => select(rows[index - 1]!.copyId) : undefined,
              onNext:
                index >= 0 && index < rows.length - 1 ? () => select(rows[index + 1]!.copyId) : undefined,
              onModeChange: (mode) => {
                if (mode === 'page') router.push(ROUTES.copy(selectedId));
              },
            }}
            onDeleted={() => select(undefined)}
          />
        ) : undefined
      }
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
