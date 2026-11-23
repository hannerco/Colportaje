'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useMemo } from 'react';
import { copy } from '@/copy/es';
import type { DepositsListParams } from '@/domain/deposits-list';
import { DEFAULT_PAYMENTS_LIST_PARAMS } from '@/domain/payments-list';
import {
  DepositsListScreen,
  depositsListParamsFromUrl,
  depositsListParamsToUrl,
  useDeposit,
  useDepositsList,
  useMoneySummary,
  usePaymentsList,
  type DepositDetailScreenProps,
} from '@/features/money';
import { ROUTES, useAppShell } from '@/features/shell';
import { readStoredDetailWindowMode } from '@/ui/organisms/DetailWindow';
import { usePlatform } from '@/ui/platform';
import { DepositDetailContainer } from './[id]/deposit-detail-container';
import { DepositEditorContainer, NEW_DEPOSIT } from './deposit-editor-container';

/** El Abibono abierto en la Ventana de detalle va en la URL (`?abibono=id` o `?abibono=nuevo`): «atrás» la cierra. */
const OPEN = 'abibono';

/** Un Abibono en la Ventana: el entregado en su detalle, el borrador (o el nuevo) en el editor, como su página. */
function DepositWindow({ id, window }: { id: string; window: DepositDetailScreenProps['window'] }) {
  const isNew = id === NEW_DEPOSIT;
  const deposit = useDeposit(isNew ? undefined : id);
  if (!isNew && deposit.data?.status === 'confirmed')
    return <DepositDetailContainer depositId={id} window={window} />;
  return <DepositEditorContainer depositId={isNew ? undefined : id} window={window} />;
}

/**
 * Contenedor de la lista de Abibonos (HU-PAN-DIN-03): la vista vive en la URL y todo sale de la misma lectura que
 * Dinero (funciona sin conexión). Abrir un Abibono (borrador: HU-PAN-DIN-04; entregado: HU-PAN-DIN-05) en escritorio lo
 * muestra en la Ventana de detalle con la forma recordada; si es «Página», o en el celular, va a su página (#29).
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
  const platform = usePlatform();
  const selectedId = searchParams.get(OPEN) ?? undefined;
  const inWindow = () => platform === 'desktop' && readStoredDetailWindowMode() !== 'page';

  const urlFor = useCallback(
    (next: DepositsListParams, open: string | undefined) => {
      const query = depositsListParamsToUrl(next);
      if (open) query.set(OPEN, open);
      const text = query.toString();
      return text ? `${pathname}?${text}` : pathname;
    },
    [pathname],
  );

  const onParamsChange = useCallback(
    (next: DepositsListParams) => window.history.replaceState(null, '', urlFor(next, selectedId)),
    [urlFor, selectedId],
  );
  const select = (id: string | undefined) => window.history.replaceState(null, '', urlFor(params, id));

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
      onDeliver={() => (inWindow() ? select(NEW_DEPOSIT) : router.push(ROUTES.newDeposit))}
      depositHref={ROUTES.deposit}
      backHref={ROUTES.deposits}
      selectedId={selectedId}
      onOpenDeposit={(id) => (inWindow() ? select(id) : router.push(ROUTES.deposit(id)))}
      detail={
        selectedId && platform === 'desktop' ? (
          <DepositWindow
            key={selectedId}
            id={selectedId}
            window={{
              breadcrumb: { label: copy.money.depositDetail.breadcrumb, href: ROUTES.deposits },
              onClose: () => select(undefined),
              onModeChange: (mode) => {
                if (mode === 'page')
                  router.push(selectedId === NEW_DEPOSIT ? ROUTES.newDeposit : ROUTES.deposit(selectedId));
              },
            }}
          />
        ) : undefined
      }
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
