'use client';

import { useState } from 'react';
import { copy } from '@/copy/es';
import { todayBogota } from '@/domain/time';
import {
  CopyDetailScreen,
  type CopyDetailScreenProps,
  useAgreedPrice,
  useCopyDetail,
  useCopyIssueActions,
  useDeleteCopy,
  useReturnToLeader,
  useUpdateReceivedDate,
} from '@/features/inventory';
import { useUpdateSoldAt } from '@/features/customers';
import { appErrorMessage } from '@/features/shared/app-error-message';
import { ROUTES, useAppShell } from '@/features/shell';
import { systemClock } from '@/lib/clock';
import { useToast } from '@/ui/molecules/Toast';

const t = copy.inventory.detail;

type Props = {
  copyId: string;
  /** La Ventana de detalle: forma, ruta, cerrar, anterior/siguiente y cambio de forma (los pone la lista o la página). */
  window: CopyDetailScreenProps['window'];
  /** Tras eliminar el ejemplar (el Aviso con «Deshacer» ya se mostró): la lista cierra la Ventana, la página vuelve. */
  onDeleted: () => void;
};

/**
 * Ejemplar (HU-PAN-INV-03) con sus datos y acciones. Lo usan la lista de ejemplares (Ventana lateral o centrada en
 * escritorio) y la página `/inventario/ejemplares/[id]` (forma «Página» y móvil), como la ficha de cliente (#29).
 */
export function CopyDetailContainer({ copyId: id, window, onDeleted }: Props) {
  const { isOnline } = useAppShell();
  const toast = useToast();
  const [today] = useState(() => todayBogota(systemClock));
  const detail = useCopyDetail(id);
  const { updateAgreedPrice, restorePublicPrice } = useAgreedPrice();
  const { updateReceivedDate } = useUpdateReceivedDate();
  const { flagCopy, undoResolveCopyIssue } = useCopyIssueActions();
  const { deleteCopy, undoDeleteCopy } = useDeleteCopy();
  const { undoReturnToLeader } = useReturnToLeader();
  const { updateSoldAt } = useUpdateSoldAt();

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
      window={window}
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
      onChangeSoldOn={async (date) => {
        const result = await updateSoldAt({ copyId: id, soldOn: date });
        if (!result.ok) {
          showError(result.error);
          throw new Error(result.error.code);
        }
        toast.show({ message: copy.payments.soldDate.saved, tone: 'success' });
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
        onDeleted();
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
  return screen;
}
