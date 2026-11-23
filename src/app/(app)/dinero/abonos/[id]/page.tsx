'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { copy } from '@/copy/es';
import type { PaymentDetailForm } from '@/features/payments';
import { ROUTES, ShellScreenRoute } from '@/features/shell';
import { usePlatform } from '@/ui/platform';
import { PaymentDetailContainer } from '../payment-detail-container';

/** `?accion=cobrar|plazo`: la lista de Dinero (deslizar) abre el mismo formulario. */
const FORM_OF_ACTION: Record<string, PaymentDetailForm> = { cobrar: 'collect', plazo: 'extend' };

/**
 * Abono como página (HU-PAN-DIN-02): en escritorio, la forma «Página» con la ruta «Dinero / abono» y la navegación;
 * en móvil, pantalla completa con Volver. Elegir Lateral o Centrada vuelve a Dinero con el abono abierto en esa forma,
 * en vez de cerrarlo (#29).
 */
function PaymentRoute() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mobile = usePlatform() === 'mobile';
  const detail = (
    <PaymentDetailContainer
      paymentId={id}
      initialForm={FORM_OF_ACTION[searchParams.get('accion') ?? ''] ?? null}
      window={{
        mode: 'page',
        breadcrumb: { label: copy.ui.nav.items.money, href: ROUTES.money },
        onClose: () => router.push(ROUTES.money),
        onModeChange: (mode) => {
          if (mode !== 'page') router.push(ROUTES.paymentInList(id));
        },
      }}
    />
  );
  return mobile ? detail : <ShellScreenRoute>{detail}</ShellScreenRoute>;
}

export default function PaymentPage() {
  return (
    <Suspense>
      <PaymentRoute />
    </Suspense>
  );
}
