'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, type ReactNode } from 'react';
import { useSession } from '@/features/auth';
import { AppShellProvider, ROUTES } from '@/features/shell';
import { EmptyState } from '@/ui/organisms/EmptyState';

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

  if (session.status !== 'signed_in')
    return (
      <main>
        <EmptyState kind="loading" />
      </main>
    );
  return (
    <AppShellProvider pathname={pathname} navigate={navigate}>
      {children}
    </AppShellProvider>
  );
}
