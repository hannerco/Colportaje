'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { copy } from '@/copy/es';
import { formatCOP } from '@/domain/money';
import { todayBogota } from '@/domain/time';
import { useCustomerDetail } from '@/features/customers';
import { usePaymentCustomer } from '@/features/money';
import {
  PaymentDetailScreen,
  useCollectPayment,
  useReschedulePayment,
  useUndoCollectPayment,
  type PaymentDetailForm,
} from '@/features/payments';
import { appErrorMessage } from '@/features/shared/app-error-message';
import { ROUTES, ShellScreenRoute, useAppShell } from '@/features/shell';
import { systemClock } from '@/lib/clock';
import { useToast } from '@/ui/molecules/Toast';
import { usePlatform } from '@/ui/platform';

const t = copy.payments.detail;
/** `?accion=cobrar|plazo`: la lista de Dinero (deslizar) abre el mismo formulario. */
const FORM_OF_ACTION: Record<string, PaymentDetailForm> = { cobrar: 'collect', plazo: 'extend' };

/**
 * Abono como página (HU-PAN-DIN-02): en escritorio, la forma «Página» con la ruta «Dinero / abono» y la navegación;
 * en móvil, pantalla completa con Volver. El abono y su historial salen del detalle de su cliente. Cobrar muestra el
 * Aviso «Abono cobrado · Deshacer» (o «Cobrado $X · Faltan $Y · Programar» si fue parcial) y dar más plazo mueve solo
 * esa fecha.
 */
function PaymentRoute() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isOnline } = useAppShell();
  const mobile = usePlatform() === 'mobile';
  const toast = useToast();
  const [today] = useState(() => todayBogota(systemClock));
  const [form, setForm] = useState<PaymentDetailForm | null>(
    () => FORM_OF_ACTION[searchParams.get('accion') ?? ''] ?? null,
  );
  const owner = usePaymentCustomer(id);
  const customerId = owner.data?.customerId;
  const detail = useCustomerDetail(customerId);
  const { collectPayment } = useCollectPayment();
  const { reschedulePayment } = useReschedulePayment();
  const { undoCollectPayment } = useUndoCollectPayment();

  const showError = (error: unknown) =>
    toast.show({ message: appErrorMessage(error).message, tone: 'error' });
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
      loading={owner.isPending || (Boolean(customerId) && detail.isPending)}
      error={owner.isError || detail.isError}
      notFound={owner.isSuccess && owner.data === null}
      onRetry={() => void detail.refetch()}
      isOnline={isOnline}
      window={{
        mode: 'page',
        breadcrumb: { label: copy.ui.nav.items.money, href: ROUTES.money },
        onClose: () => router.push(ROUTES.money),
        onModeChange: (mode) => {
          if (mode !== 'page') router.push(ROUTES.money);
        },
      }}
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
      onReschedule={async (date, confirmed, note) => {
        const result = await reschedulePayment({
          paymentId: id,
          newDueDate: date,
          currentDueDate: payment?.dueDate ?? undefined,
          note,
          confirmed,
        });
        if (!result.ok) return showError(result.error);
        toast.show({ message: t.result.extended, tone: 'success' });
      }}
    />
  );
  return mobile ? screen : <ShellScreenRoute>{screen}</ShellScreenRoute>;
}

export default function PaymentPage() {
  return (
    <Suspense>
      <PaymentRoute />
    </Suspense>
  );
}
