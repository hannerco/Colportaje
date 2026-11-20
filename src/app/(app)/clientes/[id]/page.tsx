'use client';

import { useParams, useRouter } from 'next/navigation';
import { copy } from '@/copy/es';
import { ROUTES, ShellScreenRoute } from '@/features/shell';
import { usePlatform } from '@/ui/platform';
import { CustomerDetailContainer } from '../customer-detail-container';

/**
 * Ficha de cliente como página (HU-PAN-CLI-02): en escritorio, la forma «Página» con la ruta «Clientes / nombre» y la
 * navegación; en móvil, pantalla completa con Volver. Elegir otra forma vuelve a la lista con la ficha abierta.
 */
export default function CustomerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const mobile = usePlatform() === 'mobile';
  const detail = (
    <CustomerDetailContainer
      customerId={id}
      window={{
        mode: 'page',
        breadcrumb: { label: copy.customers.list.title, href: ROUTES.customers },
        onClose: () => router.push(ROUTES.customers),
        onModeChange: (mode) => {
          if (mode !== 'page') router.push(ROUTES.customerInList(id));
        },
      }}
    />
  );
  return mobile ? detail : <ShellScreenRoute>{detail}</ShellScreenRoute>;
}
