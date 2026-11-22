'use client';

import { useParams, useRouter } from 'next/navigation';
import { copy } from '@/copy/es';
import { ROUTES, ShellScreenRoute } from '@/features/shell';
import { usePlatform } from '@/ui/platform';
import { CopyDetailContainer } from '../copy-detail-container';

/**
 * Ejemplar como página (HU-PAN-INV-03): en escritorio, la forma «Página» con la ruta «Inventario / ejemplar» y la
 * navegación; en móvil, pantalla completa con Volver. Elegir Lateral o Centrada vuelve a la lista con el ejemplar
 * abierto en esa forma, en vez de cerrarlo (#29). Eliminar vuelve a la lista con el Aviso «Deshacer».
 */
export default function CopyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const mobile = usePlatform() === 'mobile';
  const detail = (
    <CopyDetailContainer
      copyId={id}
      window={{
        mode: 'page',
        breadcrumb: { label: copy.inventory.title, href: ROUTES.copies },
        onClose: () => router.push(ROUTES.copies),
        onModeChange: (mode) => {
          if (mode !== 'page') router.push(ROUTES.copyInList(id));
        },
      }}
      onDeleted={() => router.push(ROUTES.copies)}
    />
  );
  return mobile ? detail : <ShellScreenRoute>{detail}</ShellScreenRoute>;
}
