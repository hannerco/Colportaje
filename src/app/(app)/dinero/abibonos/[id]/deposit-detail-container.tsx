'use client';

import { useRouter } from 'next/navigation';
import { copy } from '@/copy/es';
import { newId } from '@/lib/ids';
import {
  DepositDetailScreen,
  useAddDepositReceipt,
  useDeposit,
  useReopenDeposit,
  useUpdateDepositNote,
} from '@/features/money';
import { AppFailure } from '@/features/shared/app-failure';
import { appErrorMessage } from '@/features/shared/app-error-message';
import { ROUTES, ShellScreenRoute, useAppShell } from '@/features/shell';
import { useToast } from '@/ui/molecules/Toast';
import { usePlatform } from '@/ui/platform';

const t = copy.money.depositDetail;

/**
 * Un Abibono entregado (HU-PAN-DIN-05): lo muestra tal como quedó, guarda la nota y los recibos nuevos y lo reabre con
 * un motivo. Al reabrir, la lectura se actualiza y la ruta pasa a mostrar su edición (HU-PAN-DIN-04).
 */
export function DepositDetailContainer({ depositId }: { depositId: string }) {
  const router = useRouter();
  const toast = useToast();
  const { isOnline } = useAppShell();
  const mobile = usePlatform() === 'mobile';
  const saved = useDeposit(depositId);
  const { updateDepositNote } = useUpdateDepositNote();
  const { reopenDeposit } = useReopenDeposit();
  const { addDepositReceipt } = useAddDepositReceipt();

  const showError = (error: unknown) =>
    toast.show({ message: appErrorMessage(error).message, tone: 'error' });

  const screen = (
    <DepositDetailScreen
      deposit={saved.data}
      loading={saved.isPending}
      error={saved.isError}
      notFound={saved.isError && saved.error instanceof AppFailure && saved.error.error.code === 'NOT_FOUND'}
      onRetry={() => void saved.refetch()}
      isOnline={isOnline}
      window={{
        mode: 'page',
        breadcrumb: { label: t.breadcrumb, href: ROUTES.deposits },
        onClose: () => router.push(ROUTES.deposits),
        onModeChange: (mode) => {
          if (mode !== 'page') router.push(ROUTES.deposits);
        },
      }}
      paymentHref={ROUTES.payment}
      onAddReceipt={async (file) => {
        const result = await addDepositReceipt({ depositId, photoId: newId(), file });
        if (!result.ok) {
          showError(result.error);
          return false;
        }
        return true;
      }}
      onSaveNote={async (note) => {
        const result = await updateDepositNote({ depositId, note });
        if (!result.ok) {
          showError(result.error);
          throw new Error(result.error.code);
        }
        toast.show({ message: t.noteSaved, tone: 'success' });
      }}
      onReopen={async (reason) => {
        const result = await reopenDeposit({ depositId, reason });
        if (!result.ok) {
          showError(result.error);
          throw new Error(result.error.code);
        }
        toast.show({ message: t.reopened, tone: 'success' });
      }}
    />
  );
  return mobile ? screen : <ShellScreenRoute>{screen}</ShellScreenRoute>;
}
