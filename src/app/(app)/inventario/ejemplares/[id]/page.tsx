'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { copy } from '@/copy/es';
import { todayBogota } from '@/domain/time';
import {
  CopyDetailScreen,
  useAgreedPrice,
  useCopyDetail,
  useCopyIssueActions,
  useDeleteCopy,
  useReturnToLeader,
  useUpdateReceivedDate,
} from '@/features/inventory';
import { appErrorMessage } from '@/features/shared/app-error-message';
import { ROUTES, ShellScreenRoute, useAppShell } from '@/features/shell';
import { systemClock } from '@/lib/clock';
import { useToast } from '@/ui/molecules/Toast';
import { usePlatform } from '@/ui/platform';

const t = copy.inventory.detail;

/**
 * Ejemplar como página (HU-PAN-INV-03): en escritorio, la forma «Página» con la ruta «Inventario / ejemplar» y la
 * navegación; en móvil, pantalla completa con Volver. Eliminar vuelve a la lista con el Aviso «Deshacer».
 */
export default function CopyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isOnline } = useAppShell();
  const mobile = usePlatform() === 'mobile';
  const toast = useToast();
  const [today] = useState(() => todayBogota(systemClock));
  const detail = useCopyDetail(id);
  const { updateAgreedPrice, restorePublicPrice } = useAgreedPrice();
  const { updateReceivedDate } = useUpdateReceivedDate();
  const { flagCopy, undoResolveCopyIssue } = useCopyIssueActions();
  const { deleteCopy, undoDeleteCopy } = useDeleteCopy();
  const { undoReturnToLeader } = useReturnToLeader();

  const showError = (error: unknown) =>
    toast.show({ message: appErrorMessage(error).message, tone: 'error' });
  const copyName = detail.data ? t.title(detail.data.titleName, detail.data.number) : '';

  const screen = (
    <CopyDetailScreen
      detail={detail.data}
      loading={detail.isPending}
      error={detail.isError}
      onRetry={() => void detail.refetch()}
      isOnline={isOnline}
      window={{
        mode: 'page',
        breadcrumb: { label: copy.inventory.title, href: ROUTES.copies },
        onClose: () => router.push(ROUTES.copies),
        onModeChange: (mode) => {
          if (mode !== 'page') router.push(ROUTES.copies);
        },
      }}
      today={today}
      customerHref={ROUTES.customer}
      onChangePrice={async (price) => {
        const result = await updateAgreedPrice({ copyId: id, price });
        if (!result.ok) return showError(result.error);
        toast.show({ message: t.done.priceSaved, tone: 'success' });
      }}
      onRestorePrice={async () => {
        const result = await restorePublicPrice(id);
        if (!result.ok) return showError(result.error);
        toast.show({ message: t.done.priceRestored, tone: 'success' });
      }}
      onChangeReceived={async (date) => {
        const result = await updateReceivedDate({ copyId: id, date });
        if (!result.ok) return showError(result.error);
        toast.show({ message: t.done.receivedSaved, tone: 'success' });
      }}
      onFlag={async (note) => {
        const result = await flagCopy({ copyId: id, note });
        if (!result.ok) return showError(result.error);
        toast.show({ message: t.done.flagged(copyName), tone: 'success' });
      }}
      onDelete={async (note) => {
        const result = await deleteCopy({ copyId: id, note });
        if (!result.ok) return showError(result.error);
        // CA-2: el Aviso con «Deshacer» devuelve el ejemplar a su estado anterior.
        toast.show({
          message: t.done.deleted(copyName),
          tone: 'success',
          action: {
            label: t.undo,
            onAction: async () => {
              const undone = await undoDeleteCopy(id);
              if (!undone.ok) showError(undone.error);
            },
          },
        });
        router.push(ROUTES.copies);
      }}
      onUndoResolution={async () => {
        const result = await undoResolveCopyIssue(id);
        if (!result.ok) showError(result.error);
      }}
      onUndoReturn={async (note) => {
        const result = await undoReturnToLeader({ copyId: id, note });
        if (!result.ok) showError(result.error);
      }}
    />
  );
  return mobile ? screen : <ShellScreenRoute>{screen}</ShellScreenRoute>;
}
