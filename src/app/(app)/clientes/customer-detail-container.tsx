'use client';

import { useState } from 'react';
import { copy } from '@/copy/es';
import {
  CustomerDetailScreen,
  useArchiveCustomer,
  useArchivePreview,
  useCustomerDetail,
  useRestoreCustomer,
  type CustomerDetailScreenProps,
} from '@/features/customers';
import { appErrorMessage } from '@/features/shared/app-error-message';
import { ROUTES, useAppShell } from '@/features/shell';
import { useToast } from '@/ui/molecules/Toast';

type Props = {
  customerId: string;
  /** Título mientras carga (el nombre de la fila de la lista). */
  fallbackTitle?: string;
  window: CustomerDetailScreenProps['window'];
};

/** Contenedor de la ficha de cliente (HU-PAN-CLI-02): lo usan la lista (ventana) y `/clientes/[id]` (página). */
export function CustomerDetailContainer({ customerId, fallbackTitle, window }: Props) {
  const { isOnline } = useAppShell();
  const detail = useCustomerDetail(customerId);
  const [wantsPreview, setWantsPreview] = useState(false);
  const preview = useArchivePreview(wantsPreview ? customerId : null);
  const { archiveCustomer } = useArchiveCustomer();
  const { restoreCustomer } = useRestoreCustomer();
  const toast = useToast();

  return (
    <CustomerDetailScreen
      detail={detail.data}
      loading={detail.isPending}
      error={detail.isError}
      onRetry={() => void detail.refetch()}
      fallbackTitle={fallbackTitle}
      isOnline={isOnline}
      window={window}
      copyHref={ROUTES.copy}
      archivePreview={preview.data}
      onOpenArchive={() => setWantsPreview(true)}
      onArchive={async () => {
        const result = await archiveCustomer(customerId);
        setWantsPreview(false);
        // CA-4: «Cliente archivado»; la ficha muestra «Restaurar» al refrescarse.
        toast.show(
          result.ok
            ? { message: copy.customers.detail.archive.done, tone: 'success' }
            : { message: appErrorMessage(result.error).message, tone: 'error' },
        );
      }}
      onRestore={async () => {
        const result = await restoreCustomer(customerId);
        toast.show(
          result.ok
            ? { message: copy.customers.detail.archive.restored, tone: 'success' }
            : { message: appErrorMessage(result.error).message, tone: 'error' },
        );
      }}
    />
  );
}
