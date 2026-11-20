'use client';

import type { ReactNode } from 'react';
import { copy } from '@/copy/es';
import { EmptyState } from '@/ui/organisms/EmptyState';
import type { NavId } from '@/ui/organisms/AppNav';
import { useAppShell } from './app-shell';
import { ShellScreen } from './screens/ShellScreen';

/** Contenedor de una ruta cuya pantalla aún no está hecha: el armazón con su título (HU-PAN-BASE-01). */
export function ShellRoute({ title }: { title: string }) {
  const { nav, offlineBanner } = useAppShell();
  return <ShellScreen nav={nav} title={title} banner={offlineBanner} />;
}

/** Un módulo que aún no está terminado: el armazón con «Próximamente» (decisión del dueño, 2026-11-20). */
export function ComingSoonRoute({ module }: { module: NavId }) {
  const { nav, offlineBanner } = useAppShell();
  const name = copy.ui.nav.items[module];
  return (
    <ShellScreen nav={nav} title={name} banner={offlineBanner}>
      <EmptyState
        kind="empty"
        icon={module}
        title={copy.ui.comingSoon.title}
        text={copy.ui.comingSoon.text(name)}
      />
    </ShellScreen>
  );
}

/** El armazón (navegación y Franja) alrededor de una pantalla con su propio encabezado (un detalle como página). */
export function ShellScreenRoute({ children }: { children: ReactNode }) {
  const { nav, offlineBanner } = useAppShell();
  return (
    <ShellScreen nav={nav} banner={offlineBanner}>
      {children}
    </ShellScreen>
  );
}
