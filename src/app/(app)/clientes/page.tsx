'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useMemo } from 'react';
import { copy } from '@/copy/es';
import type { CustomerListParams } from '@/domain/customer-list';
import {
  CustomerListScreen,
  customerListParamsFromUrl,
  customerListParamsToUrl,
  useCustomerList,
} from '@/features/customers';
import { ROUTES, useAppShell } from '@/features/shell';
import { readStoredDetailWindowMode } from '@/ui/organisms/DetailWindow';
import { usePlatform } from '@/ui/platform';
import { CustomerDetailContainer } from './customer-detail-container';

/** El cliente abierto en la Ventana de detalle va en la URL (`?cliente=id`): «atrás» la cierra. */
const OPEN = 'cliente';

/**
 * Contenedor de la lista de clientes (HU-PAN-CLI-01): la vista vive en la URL (R3) y los datos salen del back. En
 * escritorio, la ficha (HU-PAN-CLI-02) se abre en la Ventana de detalle o, si la forma recordada es «Página», en
 * `/clientes/[id]` (CA-3); en móvil, siempre en `/clientes/[id]`.
 */
function CustomersRoute() {
  const { nav, isOnline, offlineBanner } = useAppShell();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const platform = usePlatform();
  const params = useMemo(
    () => customerListParamsFromUrl(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const list = useCustomerList(params);
  const selectedId = searchParams.get(OPEN) ?? undefined;

  const urlFor = useCallback(
    (next: CustomerListParams, open: string | undefined) => {
      const query = customerListParamsToUrl(next);
      if (open) query.set(OPEN, open);
      const text = query.toString();
      return text ? `${pathname}?${text}` : pathname;
    },
    [pathname],
  );

  // R3: la vista se escribe en la URL sin agregar pasos al historial (escribir en el buscador no llena «atrás»). Con
  // `history.replaceState` (Next lo sincroniza con `useSearchParams`) no se pide la página al servidor: sin conexión,
  // `router.replace` fallaba y Next caía a una navegación completa que terminaba en la página de error del navegador.
  const replaceUrl = useCallback((url: string) => window.history.replaceState(null, '', url), []);
  const onParamsChange = useCallback(
    (next: CustomerListParams) => replaceUrl(urlFor(next, selectedId)),
    [replaceUrl, urlFor, selectedId],
  );
  const select = (id: string | undefined) => replaceUrl(urlFor(params, id));

  const rows = list.data?.rows ?? [];
  const index = rows.findIndex((row) => row.id === selectedId);

  return (
    <CustomerListScreen
      nav={nav}
      banner={offlineBanner}
      isOnline={isOnline}
      params={params}
      onParamsChange={onParamsChange}
      view={list.data}
      loading={list.isPending}
      error={list.isError}
      onRetry={() => void list.refetch()}
      selectedId={selectedId}
      customerHref={ROUTES.customer}
      onOpenCustomer={(id) =>
        platform === 'mobile' || readStoredDetailWindowMode('customer') === 'page'
          ? router.push(ROUTES.customer(id))
          : select(id)
      }
      onNewCustomer={(name) => router.push(name ? ROUTES.newCustomerNamed(name) : ROUTES.newCustomer)}
      detail={
        selectedId && platform === 'desktop' ? (
          <CustomerDetailContainer
            key={selectedId}
            customerId={selectedId}
            fallbackTitle={rows[index]?.name}
            window={{
              breadcrumb: { label: copy.customers.list.title, href: ROUTES.customers },
              onClose: () => select(undefined),
              onPrev: index > 0 ? () => select(rows[index - 1]!.id) : undefined,
              onNext: index >= 0 && index < rows.length - 1 ? () => select(rows[index + 1]!.id) : undefined,
              onModeChange: (mode) => {
                if (mode === 'page') router.push(ROUTES.customer(selectedId));
              },
            }}
          />
        ) : undefined
      }
    />
  );
}

export default function CustomersPage() {
  return (
    <Suspense>
      <CustomersRoute />
    </Suspense>
  );
}
