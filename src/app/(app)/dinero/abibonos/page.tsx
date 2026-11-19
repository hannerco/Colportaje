'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useMemo } from 'react';
import type { DepositsListParams } from '@/domain/deposits-list';
import { DEFAULT_PAYMENTS_LIST_PARAMS } from '@/domain/payments-list';
import {
  DepositsListScreen,
  depositsListParamsFromUrl,
  depositsListParamsToUrl,
  useDepositsList,
  useMoneySummary,
  usePaymentsList,
} from '@/features/money';
import { ROUTES, useAppShell } from '@/features/shell';

/**
 * Contenedor de la lista de Abibonos (HU-PAN-DIN-03): la vista vive en la URL y todo sale de la misma lectura que
 * Dinero (funciona sin conexión). Abrir un Abibono lo lleva a su pantalla (borrador: HU-PAN-DIN-04; entregado:
 * HU-PAN-DIN-05).
 */
function DepositsRoute() {
  const { nav, isOnline, offlineBanner } = useAppShell();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useMemo(
    () => depositsListParamsFromUrl(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const list = useDepositsList(params);
  const summary = useMoneySummary();
  const payments = usePaymentsList(DEFAULT_PAYMENTS_LIST_PARAMS);

  const onParamsChange = useCallback(
    (next: DepositsListParams) => {
      const text = depositsListParamsToUrl(next).toString();
      window.history.replaceState(null, '', text ? `${pathname}?${text}` : pathname);
    },
    [pathname],
  );

  return (
    <DepositsListScreen
      nav={nav}
      banner={offlineBanner}
      isOnline={isOnline}
      params={params}
      onParamsChange={onParamsChange}
      view={list.data}
      summary={summary.data}
      loading={list.isPending}
      error={list.isError}
      onRetry={() => void list.refetch()}
      paymentsCount={payments.data?.counts.all}
      onOpenPayments={() => router.push(ROUTES.money)}
      onDeliver={() => router.push(ROUTES.newDeposit)}
      depositHref={ROUTES.deposit}
      backHref={ROUTES.deposits}
    />
  );
}

export default function DepositsPage() {
  return (
    <Suspense>
      <DepositsRoute />
    </Suspense>
  );
}
