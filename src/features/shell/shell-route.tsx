'use client';

import { useAppShell } from './app-shell';
import { ShellScreen } from './screens/ShellScreen';

/** Contenedor de una ruta cuya pantalla aún no está hecha: el armazón con su título (HU-PAN-BASE-01). */
export function ShellRoute({ title }: { title: string }) {
  const { nav, offlineBanner } = useAppShell();
  return <ShellScreen nav={nav} title={title} banner={offlineBanner} />;
}
