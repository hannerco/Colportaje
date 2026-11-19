'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useMemo, useState } from 'react';
import { copy } from '@/copy/es';
import type { CustomerListParams } from '@/domain/customer-list';
import {
  CustomerListScreen,
  customerListParamsFromUrl,
  customerListParamsToUrl,
  useCustomerList,
} from '@/features/customers';
import { ROUTES, useAppShell } from '@/features/shell';
import { DetailWindow } from '@/ui/organisms/DetailWindow';
import { usePlatform } from '@/ui/platform';

/** Contenedor de la lista de clientes (HU-PAN-CLI-01): la vista vive en la URL (R3) y los datos salen del back. */
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
  const [selectedId, setSelectedId] = useState<string>();

  // R3: la vista se escribe en la URL sin agregar pasos al historial (escribir en el buscador no llena «atrás»).
  const onParamsChange = useCallback(
    (next: CustomerListParams) => {
      const query = customerListParamsToUrl(next).toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  const rows = list.data?.rows ?? [];
  const index = rows.findIndex((row) => row.id === selectedId);
  const open = index >= 0 ? rows[index] : undefined;

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
      selectedId={open?.id}
      customerHref={ROUTES.customer}
      onOpenCustomer={(id) => (platform === 'mobile' ? router.push(ROUTES.customer(id)) : setSelectedId(id))}
      onNewCustomer={(name) => router.push(name ? ROUTES.newCustomerNamed(name) : ROUTES.newCustomer)}
      detail={
        open ? (
          // La ficha (contenido) llega con HU-PAN-CLI-02; la ventana ya se abre en la forma recordada.
          <DetailWindow
            title={open.name}
            breadcrumb={{ label: copy.customers.list.title, href: ROUTES.customers }}
            onClose={() => setSelectedId(undefined)}
            onPrev={index > 0 ? () => setSelectedId(rows[index - 1]!.id) : undefined}
            onNext={index < rows.length - 1 ? () => setSelectedId(rows[index + 1]!.id) : undefined}
            onModeChange={(mode) => {
              if (mode === 'page') router.push(ROUTES.customer(open.id));
            }}
          >
            {null}
          </DetailWindow>
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
