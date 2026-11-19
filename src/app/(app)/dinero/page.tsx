'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useMemo } from 'react';
import type { PaymentsListParams } from '@/domain/payments-list';
import {
  DEFAULT_DEPOSITS_LIST_PARAMS,
  MoneyScreen,
  paymentsListParamsFromUrl,
  paymentsListParamsToUrl,
  useDepositsList,
  useMoneySummary,
  usePaymentsList,
  useUnscheduledCustomers,
} from '@/features/money';
import { ROUTES, useAppShell } from '@/features/shell';

/**
 * Contenedor de Dinero: resumen y abonos de clientes (HU-PAN-DIN-01). La vista vive en la URL y todo sale de la misma
 * lectura (funciona sin conexión). «Entregar al líder» abre Nuevo Abibono (HU-PAN-DIN-04); una fila abre el abono
 * (HU-PAN-DIN-02).
 */
function MoneyRoute() {
  const { nav, isOnline, offlineBanner } = useAppShell();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useMemo(
    () => paymentsListParamsFromUrl(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const list = usePaymentsList(params);
  const summary = useMoneySummary();
  const unscheduled = useUnscheduledCustomers();
  const deposits = useDepositsList(DEFAULT_DEPOSITS_LIST_PARAMS);

  // La vista se escribe en la URL sin agregar pasos al historial y sin ir al servidor (también sin conexión).
  const onParamsChange = useCallback(
    (next: PaymentsListParams) => {
      const text = paymentsListParamsToUrl(next).toString();
      window.history.replaceState(null, '', text ? `${pathname}?${text}` : pathname);
    },
    [pathname],
  );

  return (
    <MoneyScreen
      nav={nav}
      banner={offlineBanner}
      isOnline={isOnline}
      params={params}
      onParamsChange={onParamsChange}
      view={list.data}
      summary={summary.data}
      unscheduled={unscheduled.data}
      loading={list.isPending}
      error={list.isError}
      onRetry={() => void list.refetch()}
      depositsCount={deposits.data?.count}
      onOpenDeposits={() => router.push(ROUTES.deposits)}
      onDeliver={() => router.push(ROUTES.newDeposit)}
      paymentHref={ROUTES.payment}
      onCollectPayment={(id) => router.push(`${ROUTES.payment(id)}?accion=cobrar`)}
      onExtendPayment={(id) => router.push(`${ROUTES.payment(id)}?accion=plazo`)}
      customerHref={ROUTES.customer}
      backHref={ROUTES.money}
    />
  );
}

export default function MoneyPage() {
  return (
    <Suspense>
      <MoneyRoute />
    </Suspense>
  );
}
