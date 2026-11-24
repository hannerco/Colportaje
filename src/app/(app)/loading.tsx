'use client';

import { ShellScreen, useAppShell } from '@/features/shell';
import { RowsSkeleton } from '@/ui/templates/ListTemplate';

/**
 * #96: mientras llega una pantalla que aún no se trajo, se ve al instante la navegación con un esqueleto, en vez de
 * quedarse congelada la pantalla anterior. Cada pantalla, ya cargada, muestra su propio esqueleto de datos (#67).
 */
export default function AppLoading() {
  const shell = useAppShell();
  return (
    <ShellScreen nav={shell.nav} banner={shell.offlineBanner}>
      <div aria-busy="true">
        <RowsSkeleton />
      </div>
    </ShellScreen>
  );
}
