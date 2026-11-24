'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, type ReactNode } from 'react';
import { useSession } from '@/features/auth';
import { AppShellProvider, BootScreen, InstallGate, PREFETCH_ROUTES, ROUTES } from '@/features/shell';

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

  // #96: con sesión, se traen de fondo las pantallas de los módulos (cuando el navegador está libre). Se repite al
  // cambiar de pantalla y al volver a la app, porque lo traído vence a los 5 minutos. Así tocar un módulo no deja la
  // pantalla congelada esperando al servidor (en producción, 0,4–2 s por cambio).
  const signedIn = session.status === 'signed_in';
  useEffect(() => {
    if (!signedIn) return;
    const run = () => PREFETCH_ROUTES.forEach((href) => router.prefetch(href));
    const idle =
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback(run, { timeout: 2000 })
        : window.setTimeout(run, 300);
    const onVisible = () => document.visibilityState === 'visible' && run();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [signedIn, router, pathname]);

  // Ronda 37: mientras se abre la sesión, la pantalla de arranque con el logo.
  if (session.status !== 'signed_in') return <BootScreen />;
  return (
    <AppShellProvider pathname={pathname} navigate={navigate}>
      {children}
      <InstallGate />
    </AppShellProvider>
  );
}
