'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, type ReactNode } from 'react';
import { useSession } from '@/features/auth';
import { AppShellProvider, BootScreen, InstallGate, ROUTES } from '@/features/shell';

/** Rutas de la app (HU-PAN-BASE-01): exigen sesión y dan a cada pantalla la navegación y el estado de conexión. */
export default function AppLayout({ children }: { children: ReactNode }) {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const signedOut = session.status === 'signed_out' || session.status === 'expired';

  // R3 del alcance: sin sesión se va a Iniciar sesión (HU-PAN-BASE-02).
  useEffect(() => {
    if (signedOut) router.replace(ROUTES.signIn);
  }, [signedOut, router]);

  const navigate = useCallback((href: string) => router.push(href), [router]);

  // Ronda 37: mientras se abre la sesión, la pantalla de arranque con el logo.
  if (session.status !== 'signed_in') return <BootScreen />;
  return (
    <AppShellProvider pathname={pathname} navigate={navigate}>
      {children}
      <InstallGate />
    </AppShellProvider>
  );
}
