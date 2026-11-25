'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { copy } from '@/copy/es';
import { formatCOP } from '@/domain/money';
import { todayBogota } from '@/domain/time';
import { useCustomerDetail } from '@/features/customers';
import { usePaymentCustomer, usePaymentHistory } from '@/features/money';
import {
  PaymentDetailScreen,
  type PaymentDetailScreenProps,
  useCollectPayment,
  useCorrectScheduledDate,
  useReschedulePayment,
  useUpdateCollectedPayment,
  useDeletePayment,
  useUndoCollectPayment,
  type PaymentDetailForm,
} from '@/features/payments';
import { useMoneySummary } from '@/features/money';
import { errorToast } from '@/features/shared/error-report';
import { ROUTES, useAppShell, useDetailHref } from '@/features/shell';
import { systemClock } from '@/lib/clock';
import { useToast } from '@/ui/molecules/Toast';

const t = copy.payments.detail;

type Props = {
  paymentId: string;
  /** La Ventana de detalle: forma, ruta, cerrar, anterior/siguiente y cambio de forma (los pone la lista o la página). */
  window: PaymentDetailScreenProps['window'];
  /** El formulario abierto al llegar (deslizar en la lista de Dinero lleva a Cobrar o Más plazo). */
  initialForm?: PaymentDetailForm | null;
  /**
   * A dónde lleva otro abono del cliente («Abonos de …»). La lista de Dinero lo da para quedarse en la Ventana con su
   * vista; sin valor, según la forma que recuerdan los abonos.
   */
  paymentHref?: (paymentId: string) => string;
};

/**
 * Abono (HU-PAN-DIN-02): el abono y su historial salen del detalle de su cliente. Cobrar muestra el Aviso «Abono cobrado
 * · Deshacer» (o «Cobrado $X · Faltan $Y · Programar» si fue parcial) y dar más plazo mueve solo esa fecha. Lo usan la
 * lista de Dinero (Ventana lateral o centrada en escritorio) y la página `/dinero/abonos/[id]` (#29).
 */
export function PaymentDetailContainer({ paymentId: id, window, initialForm = null, paymentHref }: Props) {
  const router = useRouter();
  const { isOnline } = useAppShell();
  const href = useDetailHref();
  const toast = useToast();
  const [today] = useState(() => todayBogota(systemClock));
  const [form, setForm] = useState<PaymentDetailForm | null>(initialForm);
  const owner = usePaymentCustomer(id);
  const customerId = owner.data?.customerId;
  const detail = useCustomerDetail(customerId);
  const history = usePaymentHistory(id);
  const { collectPayment } = useCollectPayment();
  const { reschedulePayment } = useReschedulePayment();
  const { correctScheduledDate } = useCorrectScheduledDate();
  const { updateCollectedPayment } = useUpdateCollectedPayment();
  const { undoCollectPayment } = useUndoCollectPayment();
  const { deletePayment } = useDeletePayment();
  const summary = useMoneySummary();

  const showError = (error: unknown) => toast.show(errorToast(error));
  const rows = detail.data ? [...detail.data.payments, ...detail.data.canceledPayments] : undefined;
  const payment = rows?.find((p) => p.paymentId === id);
  const customer = detail.data;

  const screen = (
    <PaymentDetailScreen
      payment={payment}
      customer={
        customer
          ? {
              id: customer.id,
              name: customer.name,
              avatarEmoji: customer.avatarEmoji,
              archived: customer.archived,
            }
          : undefined
      }
      payments={detail.data?.payments}
      history={history.data}
      depositTitle={history.data?.find((entry) => entry.kind === 'delivered')?.depositTitle}
      loading={owner.isPending || (Boolean(customerId) && detail.isPending)}
      error={owner.isError || detail.isError}
      notFound={owner.isSuccess && owner.data === null}
      onRetry={() => void detail.refetch()}
      isOnline={isOnline}
      window={window}
      today={today}
      customerHref={(customerId) => href('customer', customerId)}
      paymentHref={paymentHref ?? ((paymentId) => href('payment', paymentId))}
      depositHref={(depositId) => href('deposit', depositId)}
      form={form}
      onFormChange={setForm}
      onCollect={async (values) => {
        const result = await collectPayment({ paymentId: id, ...values });
        if (!result.ok) {
          showError(result.error);
          // Que el formulario no se cierre: lo escrito sigue ahí para corregir o reintentar.
          throw new Error(result.error.code);
        }
        const { shortfall } = result.value;
        if (shortfall !== null) {
          // CA-2 (BR-PAY-07): lo que faltó queda en el saldo; la app solo sugiere programarlo.
          toast.show({
            message: t.result.partial(formatCOP(values.paidAmount), formatCOP(shortfall)),
            tone: 'success',
            action: { label: t.result.program, onAction: () => router.push(ROUTES.customer(customerId!)) },
          });
          return;
        }
        // CA-3: «Abono cobrado · Deshacer» devuelve el abono a por cobrar.
        toast.show({
          message: t.result.collected,
          tone: 'success',
          action: {
            label: t.result.undo,
            onAction: async () => {
              const undone = await undoCollectPayment(id);
              if (!undone.ok) return showError(undone.error);
              toast.show({ message: t.result.undone, tone: 'success' });
            },
          },
        });
      }}
      toDeliverTotal={summary.data?.toDeliver.total ?? null}
      onCorrectCollection={async (patch) => {
        const before =
          payment?.paidAmount !== null &&
          payment?.paidAmount !== undefined &&
          payment.paidAt &&
          payment.method
            ? { paidAmount: payment.paidAmount, paidAt: payment.paidAt, method: payment.method }
            : null;
        const result = await updateCollectedPayment({ paymentId: id, patch });
        if (!result.ok) {
          showError(result.error);
          throw new Error(result.error.code);
        }
        toast.show({
          message: copy.payments.collection.correctDialog.done,
          tone: 'success',
          action: before
            ? {
                label: t.result.undo,
                // Deshacer: vuelve a dejar el cobro como estaba (queda otra corrección en el historial).
                onAction: async () => {
                  const undone = await updateCollectedPayment({ paymentId: id, patch: before });
                  if (!undone.ok) showError(undone.error);
                },
              }
            : undefined,
        });
      }}
      onDeleteCollection={async () => {
        if (!payment) return;
        const before =
          payment.paidAmount !== null && payment.paidAt && payment.method
            ? { paidAmount: payment.paidAmount, paidAt: payment.paidAt, method: payment.method }
            : null;
        // Un abono programado vuelve a «Por cobrar» (BR-PAY-17); la cuota inicial o un abono extra se borran.
        const scheduled = payment.kind === 'scheduled';
        const result = scheduled ? await undoCollectPayment(id) : await deletePayment(id);
        if (!result.ok) {
          showError(result.error);
          throw new Error(result.error.code);
        }
        toast.show({
          message: copy.payments.collection.removeDialog.done,
          tone: 'success',
          action:
            scheduled && before
              ? {
                  label: t.result.undo,
                  onAction: async () => {
                    const again = await collectPayment({ paymentId: id, ...before });
                    if (!again.ok) showError(again.error);
                  },
                }
              : undefined,
        });
        if (!scheduled) window.onClose();
      }}
      onChangeDate={async (date, reason, note) => {
        const result =
          reason === 'reschedule'
            ? await reschedulePayment({
                paymentId: id,
                newDueDate: date,
                currentDueDate: payment?.dueDate ?? undefined,
                note,
              })
            : await correctScheduledDate({ paymentId: id, dueDate: date });
        if (!result.ok) {
          showError(result.error);
          throw new Error(result.error.code);
        }
        toast.show({
          message:
            reason === 'reschedule'
              ? copy.payments.manual.done.rescheduled
              : copy.payments.manual.done.corrected,
          tone: 'success',
        });
      }}
    />
  );
  return screen;
}
