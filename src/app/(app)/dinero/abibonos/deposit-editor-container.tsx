'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { copy } from '@/copy/es';
import type { DepositPayment, StagedReceipt } from '@/domain/deposit-draft';
import {
  DepositEditorScreen,
  useAddDepositReceipt,
  useConfirmDeposit,
  useDeleteDepositDraft,
  useDeleteDepositReceipt,
  useDeposit,
  useNewDepositProposal,
  useSaveDepositDraft,
  type DepositEditorScreenProps,
  type DepositEditorValues,
} from '@/features/money';
import { AppFailure } from '@/features/shared/app-failure';
import { appErrorMessage } from '@/features/shared/app-error-message';
import { ROUTES, ShellScreenRoute, useAppShell } from '@/features/shell';
import { newId } from '@/lib/ids';
import { useToast } from '@/ui/molecules/Toast';
import { usePlatform } from '@/ui/platform';

const t = copy.money.depositEditor;

type StagedWithPreview = { photoId: string; thumbUrl: string; staged: StagedReceipt };

/**
 * Contenedor de Nuevo Abibono y de un borrador (HU-PAN-DIN-04). `depositId` vacío = la propuesta precargada con todo lo
 * cobrado libre (no se escribe nada hasta guardar o confirmar; los recibos subidos viajan como `stagedReceipts`, R7);
 * con `depositId`, el borrador guardado (los recibos se crean en el momento). Confirmar y guardar vuelven a la lista.
 */
export function DepositEditorContainer({ depositId }: { depositId?: string }) {
  const router = useRouter();
  const toast = useToast();
  const { isOnline } = useAppShell();
  const mobile = usePlatform() === 'mobile';
  const proposal = useNewDepositProposal();
  const saved = useDeposit(depositId);
  const { saveDepositDraft } = useSaveDepositDraft();
  const { confirmDeposit } = useConfirmDeposit();
  const { addDepositReceipt } = useAddDepositReceipt();
  const { deleteDepositReceipt } = useDeleteDepositReceipt();
  const { deleteDepositDraft } = useDeleteDepositDraft();
  const [staged, setStaged] = useState<StagedWithPreview[]>([]);

  const showError = (error: unknown) =>
    toast.show({ message: appErrorMessage(error).message, tone: 'error' });
  const view = saved.data;
  const draftOpen = Boolean(depositId);

  // Los abonos que se pueden marcar: los libres y, en un borrador, los que ya lleva.
  const free = proposal.data?.available ?? [];
  const linked = view?.payments ?? [];
  const payments: readonly DepositPayment[] = draftOpen
    ? [...linked, ...free.filter((p) => !linked.some((l) => l.paymentId === p.paymentId))]
    : free;

  const initial: DepositEditorScreenProps['initial'] = draftOpen
    ? view && {
        title: view.title,
        displayTitle: view.displayTitle,
        depositDate: view.depositDate,
        selectedIds: view.payments.map((p) => p.paymentId),
        cash: view.cash,
        transfer: view.transfer,
        note: view.note,
      }
    : proposal.data && {
        title: null,
        displayTitle: proposal.data.displayTitle,
        depositDate: proposal.data.depositDate,
        selectedIds: proposal.data.selectedIds,
        cash: proposal.data.cash,
        transfer: proposal.data.transfer,
        note: null,
      };
  const id = depositId ?? proposal.data?.depositId ?? '';

  const input = (values: DepositEditorValues) => ({
    depositId: id,
    title: values.title,
    depositDate: values.depositDate,
    paymentIds: values.paymentIds,
    cash: values.cash,
    transfer: values.transfer,
    note: values.note,
    stagedReceipts: draftOpen ? [] : staged.map((s) => s.staged),
  });

  // La pantalla guarda lo que escribes: se reinicia solo si cambia el Abibono abierto o lo cobrado libre (p. ej. tras
  // borrar un borrador, cuando la lectura se actualiza).
  const editorKey = `${depositId ?? 'new'}:${initial ? 'ready' : 'loading'}:${
    draftOpen ? '' : (proposal.data?.selectedIds.join(',') ?? '')
  }:${draftOpen ? '' : (proposal.data?.expected ?? '')}`;

  const screen = (
    // El estado de lo escrito se reinicia si cambia el Abibono abierto.
    <DepositEditorScreen
      key={editorKey}
      mode={draftOpen ? 'draft' : 'new'}
      payments={payments}
      initial={initial}
      receipts={
        draftOpen ? (view?.receipts ?? []) : staged.map((s) => ({ photoId: s.photoId, thumbUrl: s.thumbUrl }))
      }
      loading={draftOpen ? saved.isPending : proposal.isPending}
      error={draftOpen ? saved.isError : proposal.isError}
      notFound={
        draftOpen &&
        saved.isError &&
        saved.error instanceof AppFailure &&
        saved.error.error.code === 'NOT_FOUND'
      }
      onRetry={() => void (draftOpen ? saved.refetch() : proposal.refetch())}
      isOnline={isOnline}
      window={{
        mode: 'page',
        breadcrumb: { label: t.breadcrumb, href: ROUTES.deposits },
        onClose: () => router.push(ROUTES.deposits),
        onModeChange: (mode) => {
          if (mode !== 'page') router.push(ROUTES.deposits);
        },
      }}
      canDelete={view?.can.delete}
      onAddReceipt={async (file) => {
        const photoId = newId();
        const result = await addDepositReceipt({ depositId: id, photoId, file });
        if (!result.ok) {
          showError(result.error);
          return false;
        }
        if (result.value.staged)
          setStaged((current) => [
            ...current,
            { photoId, thumbUrl: URL.createObjectURL(file), staged: result.value.staged! },
          ]);
        return true;
      }}
      onRemoveReceipt={async (photoId) => {
        if (!draftOpen) {
          // Una propuesta sin guardar: solo se quita de la lista (el archivo subido queda sin usar).
          setStaged((current) => current.filter((s) => s.photoId !== photoId));
          return;
        }
        const result = await deleteDepositReceipt(photoId);
        if (!result.ok) showError(result.error);
      }}
      onSaveDraft={async (values) => {
        const result = await saveDepositDraft(input(values));
        if (!result.ok) {
          showError(result.error);
          throw new Error(result.error.code);
        }
        toast.show({ message: t.result.saved, tone: 'success' });
        router.push(ROUTES.deposits);
      }}
      onConfirm={async (values) => {
        const result = await confirmDeposit(input(values));
        if (!result.ok) {
          showError(result.error);
          throw new Error(result.error.code);
        }
        // CA-5: el Abibono queda «Entregado» y Dinero muestra Por entregar $0.
        toast.show({ message: t.result.confirmed, tone: 'success' });
        router.push(ROUTES.deposits);
      }}
      onDelete={async () => {
        const result = await deleteDepositDraft(id);
        if (!result.ok) {
          showError(result.error);
          // Que el diálogo no se cierre: el borrador sigue ahí.
          throw new Error(result.error.code);
        }
        toast.show({ message: t.result.deleted, tone: 'success' });
        router.push(ROUTES.deposits);
      }}
    />
  );
  return mobile ? screen : <ShellScreenRoute>{screen}</ShellScreenRoute>;
}
