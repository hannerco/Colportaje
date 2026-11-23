'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAdminMode } from './admin-mode';
import { Banner } from '@/ui/molecules/Banner';
import type { AppNavProps } from '@/ui/organisms/AppNav';
import { useCurrentProfile } from '../auth';
import { useConnection } from '../connection';
import { appNavItems, NAV_HREFS, navIdForPath, ROUTES } from './navigation';

export type AppShell = {
  /** Lo que cada pantalla raíz pasa a su plantilla como `nav` (módulo activo, destinos, cuenta, Nuevo cliente). */
  readonly nav: AppNavProps;
  /** R2: con `false`, toda acción que escribe se ve deshabilitada con «Necesita conexión» (BR-GEN-08). */
  readonly isOnline: boolean;
  /** R2: la Franja de sin conexión, o `null` si hay conexión. La pantalla la pone arriba de su contenido. */
  readonly offlineBanner: ReactNode;
};

const AppShellContext = createContext<AppShell | null>(null);

export type AppShellProviderProps = {
  /** Ruta actual (la del enrutador). */
  pathname: string;
  /** Navega sin recargar (la del enrutador). */
  navigate: (href: string) => void;
  children: ReactNode;
};

/** Armazón de las rutas `(app)` (HU-PAN-BASE-01): navegación, cuenta y estado de conexión para toda pantalla. */
export function AppShellProvider({ pathname, navigate, children }: AppShellProviderProps) {
  const { online } = useConnection();
  const profile = useCurrentProfile();
  const accountName = profile.data?.fullName ?? '';
  const adminMode = useAdminMode();
  // BR-USR-04 (#42): con el modo administrador apagado en Ajustes, Admin no se muestra.
  const isAdmin = (profile.data?.isAdmin ?? false) && adminMode;

  const value = useMemo<AppShell>(
    () => ({
      nav: {
        active: navIdForPath(pathname),
        items: appNavItems(isAdmin),
        hrefs: NAV_HREFS,
        account: { name: accountName },
        onNewCustomer: () => navigate(ROUTES.newCustomer),
        newCustomerDisabled: !online,
        onNavigate: navigate,
      },
      isOnline: online,
      offlineBanner: online ? null : <Banner tone="offline" />,
    }),
    [pathname, navigate, accountName, isAdmin, online],
  );
  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>;
}

/** El armazón vigente. Solo existe dentro de las rutas `(app)`. */
export function useAppShell(): AppShell {
  const shell = useContext(AppShellContext);
  if (!shell) throw new Error('useAppShell: falta AppShellProvider (rutas (app)).');
  return shell;
}
