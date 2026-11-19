import { redirect } from 'next/navigation';
import { ROUTES } from '@/features/shell/navigation';

// I-37: mientras Hoy no tenga diseño, la app abre en Clientes.
export default function HomePage() {
  redirect(ROUTES.customers);
}
