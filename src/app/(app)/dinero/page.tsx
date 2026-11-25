'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useMemo, useState } from 'react';
import { copy } from '@/copy/es';
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
import { ROUTES, useAppShell, useDetailHref } from '@/features/shell';
import { readStoredDetailWindowMode } from '@/ui/organisms/DetailWindow';
import { usePlatform } from '@/ui/platform';
import { PaymentDetailContainer } from './abonos/payment-detail-container';

/** El abono abierto en la Ventana de detalle va en la URL (`?abono=id`): «atrás» la cierra. */
const OPEN = 'abono';

/**
 * Contenedor de Dinero: resumen y abonos de clientes (HU-PAN-DIN-01). La vista vive en la URL y todo sale de la misma
 * lectura (funciona sin conexión). «Entregar al líder» abre Nuevo Abibono (HU-PAN-DIN-04); una fila abre el abono
 * (HU-PAN-DIN-02): en escritorio, en la Ventana de detalle con la forma recordada; si es «Página», o en el celular, en
 * su página (#29, igual que Clientes).
 */
function MoneyRoute() {
  const { nav, isOnline, offlineBanner } = useAppShell();
  const href = useDetailHref();
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
  const platform = usePlatform();
  const selectedId = searchParams.get(OPEN) ?? undefined;
  /** #70: «Cobrar» en la tabla abre el abono en la Ventana con el formulario de cobro ya abierto. */
  const [collectOnOpen, setCollectOnOpen] = useState<string | null>(null);

  const urlFor = useCallback(
    (next: PaymentsListParams, open: string | undefined) => {
      const query = paymentsListParamsToUrl(next);
      if (open) query.set(OPEN, open);
      const text = query.toString();
      return text ? `${pathname}?${text}` : pathname;
    },
    [pathname],
  );

  // La vista se escribe en la URL sin agregar pasos al historial y sin ir al servidor (también sin conexión).
  const onParamsChange = useCallback(
    (next: PaymentsListParams) => window.history.replaceState(null, '', urlFor(next, selectedId)),
    [urlFor, selectedId],
  );
  const select = (id: string | undefined) => window.history.replaceState(null, '', urlFor(params, id));

  const rows = list.data?.rows ?? [];
  const index = rows.findIndex((row) => row.paymentId === selectedId);

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
      onCollectPayment={(id) => {
        if (platform === 'mobile' || readStoredDetailWindowMode('payment') === 'page')
          return router.push(`${ROUTES.payment(id)}?accion=cobrar`);
        setCollectOnOpen(id);
        select(id);
      }}
      onExtendPayment={(id) => router.push(`${ROUTES.payment(id)}?accion=plazo`)}
      customerHref={(customerId) => href('customer', customerId)}
      backHref={ROUTES.money}
      selectedId={selectedId}
      onOpenPayment={(id) =>
        platform === 'mobile' || readStoredDetailWindowMode('payment') === 'page'
          ? router.push(ROUTES.payment(id))
          : select(id)
      }
      detail={
        selectedId && platform === 'desktop' ? (
          <PaymentDetailContainer
            key={`${selectedId}-${collectOnOpen === selectedId}`}
            paymentId={selectedId}
            initialForm={collectOnOpen === selectedId ? 'collect' : null}
            // «Abonos de …»: pasar a otro abono se queda en la Ventana, con la misma vista de la lista.
            paymentHref={(paymentId) => urlFor(params, paymentId)}
            window={{
              breadcrumb: { label: copy.ui.nav.items.money, href: ROUTES.money },
              onClose: () => {
                setCollectOnOpen(null);
                select(undefined);
              },
              onPrev: index > 0 ? () => select(rows[index - 1]!.paymentId) : undefined,
              onNext:
                index >= 0 && index < rows.length - 1 ? () => select(rows[index + 1]!.paymentId) : undefined,
              onModeChange: (mode) => {
                if (mode === 'page') router.push(ROUTES.payment(selectedId));
              },
            }}
          />
        ) : undefined
      }
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
