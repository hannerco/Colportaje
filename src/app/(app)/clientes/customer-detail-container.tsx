'use client';

import { useRef, useState } from 'react';
import { copy } from '@/copy/es';
import {
  CustomerDetailScreen,
  mapTiles,
  useAddCustomerInfoPhoto,
  useAddInvoicePhoto,
  useCreateInvoiceWithPhoto,
  useUpdateInvoice,
  useDeleteInvoicePhoto,
  type InvoicePatch,
  useArchiveCustomer,
  useClearCustomerLocation,
  useSetCustomerLocation,
  useArchivePreview,
  useCustomerDetail,
  useRestoreCustomer,
  useUpdateCustomer,
  useUpdateSoldAt,
  SchedulePaymentsDialog,
  type CustomerDetailScreenProps,
  usePhotoUrlResolver,
} from '@/features/customers';
import { appErrorMessage } from '@/features/shared/app-error-message';
import { ROUTES, useAppShell } from '@/features/shell';
import { todayBogota } from '@/domain/time';
import {
  CollectPaymentDialog,
  useApplyPaymentPlan,
  useCollectPayment,
  useReschedulePayment,
  useScheduleSinglePayment,
  useUndoCollectPayment,
} from '@/features/payments';
import { formatCOP } from '@/domain/money';
import { withPaymentIds } from '@/domain/payment-plan';
import { systemClock } from '@/lib/clock';
import { newId } from '@/lib/ids';
import { useToast } from '@/ui/molecules/Toast';
import { AddBookContainer } from './add-book-container';
import { LocationPickerContainer } from './location-picker-container';

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
  const [addingBook, setAddingBook] = useState(false);
  const preview = useArchivePreview(wantsPreview ? customerId : null);
  const { archiveCustomer } = useArchiveCustomer();
  const { restoreCustomer } = useRestoreCustomer();
  const toast = useToast();
  const photoUrl = usePhotoUrlResolver();
  const { reschedulePayment } = useReschedulePayment();
  const [today] = useState(() => todayBogota(systemClock));
  const [tiles] = useState(mapTiles);
  const [choosingLocation, setChoosingLocation] = useState(false);
  const { setCustomerLocation } = useSetCustomerLocation();
  const { clearCustomerLocation } = useClearCustomerLocation();
  const { addCustomerInfoPhoto } = useAddCustomerInfoPhoto();
  const { createInvoiceWithPhoto } = useCreateInvoiceWithPhoto();
  const { addInvoicePhoto } = useAddInvoicePhoto();
  const { updateInvoice } = useUpdateInvoice();
  const { deleteInvoicePhoto } = useDeleteInvoicePhoto();
  // #61: el N.º y la fecha de una factura se ven al escribirlos y se guardan solos un momento después.
  const [invoiceEdits, setInvoiceEdits] = useState<Record<string, InvoicePatch>>({});
  const invoiceTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const { updateCustomer } = useUpdateCustomer();
  const { updateSoldAt } = useUpdateSoldAt();
  const { collectPayment } = useCollectPayment();
  const { undoCollectPayment } = useUndoCollectPayment();
  const { applyPaymentPlan } = useApplyPaymentPlan();
  const { scheduleSinglePayment } = useScheduleSinglePayment();
  /** #35: el abono que se está cobrando desde la ficha, y si «Programar abono» está abierto. */
  const [collecting, setCollecting] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const collectingRow = detail.data?.payments.find((p) => p.paymentId === collecting);
  const r = copy.payments.detail.result;
  const s = copy.customers.detail.payments.scheduleForm;
  const showError = (error: unknown) =>
    toast.show({ message: appErrorMessage(error).message, tone: 'error' });

  return (
    <>
      <CustomerDetailScreen
        photoUrl={photoUrl}
        detail={
          detail.data && {
            ...detail.data,
            invoices: detail.data.invoices.map((invoice) => ({
              ...invoice,
              ...(invoiceEdits[invoice.invoiceId] as Partial<typeof invoice>),
            })),
          }
        }
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
        onAddBook={() => setAddingBook(true)}
        today={today}
        onReschedule={async (paymentId, newDueDate, confirmed) => {
          const current = detail.data?.payments.find((p) => p.paymentId === paymentId)?.dueDate ?? undefined;
          const result = await reschedulePayment({
            paymentId,
            newDueDate,
            currentDueDate: current,
            confirmed,
          });
          if (!result.ok) toast.show({ message: appErrorMessage(result.error).message, tone: 'error' });
        }}
        tiles={tiles}
        onChooseLocation={() => setChoosingLocation(true)}
        onRemoveLocation={async () => {
          const result = await clearCustomerLocation(customerId);
          toast.show(
            result.ok
              ? { message: copy.customers.location.removed, tone: 'success' }
              : { message: appErrorMessage(result.error).message, tone: 'error' },
          );
        }}
        onAddPhoto={async (file) => {
          const result = await addCustomerInfoPhoto({ photoId: newId(), customerId, file });
          if (!result.ok) showError(result.error);
        }}
        invoiceActions={{
          onCreate: async (file) => {
            const result = await createInvoiceWithPhoto({
              invoiceId: newId(),
              photoId: newId(),
              customerId,
              file,
            });
            if (!result.ok) showError(result.error);
          },
          onAddPhoto: async (invoiceId, file) => {
            const result = await addInvoicePhoto({ invoiceId, photoId: newId(), file });
            if (!result.ok) showError(result.error);
          },
          onReplacePhoto: async (invoiceId, photoId, file) => {
            // Primero la nueva y luego quitar la anterior: así la factura nunca queda sin foto (BR-CUS-17).
            const added = await addInvoicePhoto({ invoiceId, photoId: newId(), file });
            if (!added.ok) return showError(added.error);
            const removed = await deleteInvoicePhoto(photoId);
            if (!removed.ok) return showError(removed.error);
            toast.show({ message: copy.customers.photos.replaced, tone: 'success' });
          },
          onRemovePhoto: async (photoId) => {
            const removed = await deleteInvoicePhoto(photoId);
            if (!removed.ok) return showError(removed.error);
            toast.show({ message: copy.customers.photos.removed, tone: 'success' });
          },
          onChange: (invoiceId, patch) => {
            const next = { ...invoiceEdits[invoiceId], ...patch };
            setInvoiceEdits((current) => ({ ...current, [invoiceId]: next }));
            clearTimeout(invoiceTimers.current.get(invoiceId));
            invoiceTimers.current.set(
              invoiceId,
              setTimeout(async () => {
                const result = await updateInvoice({ invoiceId, patch: next });
                if (!result.ok) return showError(result.error);
                setInvoiceEdits((current) => {
                  const rest = { ...current };
                  delete rest[invoiceId];
                  return rest;
                });
              }, 600),
            );
          },
        }}
        onEditData={async (patch) => {
          const result = await updateCustomer({ id: customerId, patch });
          if (!result.ok) {
            showError(result.error);
            throw new Error(result.error.code);
          }
          toast.show({ message: copy.customers.edit.saved, tone: 'success' });
        }}
        onAvatarChange={async (avatarEmoji) => {
          const result = await updateCustomer({ id: customerId, patch: { avatarEmoji } });
          if (!result.ok) showError(result.error);
        }}
        onChangeSoldOn={async (copyId, soldOn) => {
          const result = await updateSoldAt({ copyId, soldOn });
          if (!result.ok) {
            showError(result.error);
            throw new Error(result.error.code);
          }
          toast.show({ message: copy.payments.soldDate.saved, tone: 'success' });
        }}
        onCollect={setCollecting}
        onSchedule={() => setScheduling(true)}
        onRestore={async () => {
          const result = await restoreCustomer(customerId);
          toast.show(
            result.ok
              ? { message: copy.customers.detail.archive.restored, tone: 'success' }
              : { message: appErrorMessage(result.error).message, tone: 'error' },
          );
        }}
      />
      {collectingRow && detail.data && (
        <CollectPaymentDialog
          open
          onOpenChange={(open) => !open && setCollecting(null)}
          customerName={detail.data.name}
          agreedAmount={collectingRow.agreedAmount ?? 0}
          agreedDate={collectingRow.dueDate}
          today={today}
          onConfirm={async (values) => {
            const paymentId = collectingRow.paymentId;
            const result = await collectPayment({ paymentId, ...values });
            if (!result.ok) {
              showError(result.error);
              throw new Error(result.error.code);
            }
            setCollecting(null);
            const { shortfall } = result.value;
            if (shortfall !== null) {
              toast.show({
                message: r.partial(formatCOP(values.paidAmount), formatCOP(shortfall)),
                tone: 'success',
              });
              return;
            }
            toast.show({
              message: r.collected,
              tone: 'success',
              action: {
                label: r.undo,
                onAction: async () => {
                  const undone = await undoCollectPayment(paymentId);
                  if (!undone.ok) return showError(undone.error);
                  toast.show({ message: r.undone, tone: 'success' });
                },
              },
            });
          }}
        />
      )}
      {detail.data && (
        <SchedulePaymentsDialog
          open={scheduling}
          onOpenChange={setScheduling}
          unscheduled={detail.data.account.unscheduled}
          today={today}
          onApplyPlan={async (items) => {
            const result = await applyPaymentPlan({
              customerId,
              mode: 'unscheduled_only',
              items: withPaymentIds(items, newId),
            });
            if (!result.ok) {
              showError(result.error);
              throw new Error(result.error.code);
            }
            toast.show({ message: s.done, tone: 'success' });
          }}
          onScheduleSingle={async ({ dueDate, amount }) => {
            const result = await scheduleSinglePayment({
              paymentId: newId(),
              customerId,
              dueDate,
              agreedAmount: amount,
            });
            if (!result.ok) {
              showError(result.error);
              throw new Error(result.error.code);
            }
            toast.show({ message: s.doneSingle, tone: 'success' });
          }}
        />
      )}
      {addingBook && detail.data && !detail.data.archived && (
        <AddBookContainer
          customerId={customerId}
          books={detail.data.books}
          onClose={() => setAddingBook(false)}
        />
      )}
      {choosingLocation && detail.data && !detail.data.archived && (
        <LocationPickerContainer
          saved={detail.data.location}
          onConfirm={async (location) => {
            const result = await setCustomerLocation({ customerId, location });
            if (!result.ok) showError(result.error);
            return result.ok;
          }}
          onClose={() => setChoosingLocation(false)}
        />
      )}
    </>
  );
}
