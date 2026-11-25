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
  useUndoCollectPayment,
  type PaymentDetailForm,
} from '@/features/payments';
import { errorToast } from '@/features/shared/error-report';
import { ROUTES, useAppShell } from '@/features/shell';
import { systemClock } from '@/lib/clock';
import { useToast } from '@/ui/molecules/Toast';

const t = copy.payments.detail;

type Props = {
  paymentId: string;
  /** La Ventana de detalle: forma, ruta, cerrar, anterior/siguiente y cambio de forma (los pone la lista o la página). */
  window: PaymentDetailScreenProps['window'];
  /** El formulario abierto al llegar (deslizar en la lista de Dinero lleva a Cobrar o Más plazo). */
  initialForm?: PaymentDetailForm | null;
};

/**
 * Abono (HU-PAN-DIN-02): el abono y su historial salen del detalle de su cliente. Cobrar muestra el Aviso «Abono cobrado
 * · Deshacer» (o «Cobrado $X · Faltan $Y · Programar» si fue parcial) y dar más plazo mueve solo esa fecha. Lo usan la
 * lista de Dinero (Ventana lateral o centrada en escritorio) y la página `/dinero/abonos/[id]` (#29).
 */
export function PaymentDetailContainer({ paymentId: id, window, initialForm = null }: Props) {
  const router = useRouter();
  const { isOnline } = useAppShell();
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
  const { undoCollectPayment } = useUndoCollectPayment();

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
      customerHref={ROUTES.customer}
      paymentHref={ROUTES.payment}
      depositHref={ROUTES.deposit}
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
