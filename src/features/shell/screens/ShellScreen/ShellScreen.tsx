'use client';

import type { ReactNode } from 'react';
import { usePlatform } from '@/ui/platform';
import { AppNav, type AppNavProps } from '@/ui/organisms/AppNav';
import { PageHeader } from '@/ui/organisms/PageHeader';
import styles from './ShellScreen.module.css';

export type ShellScreenProps = {
  /** La navegación del armazón (`useAppShell().nav`). */
  nav: AppNavProps;
  /** Título de la pantalla (el nombre del módulo, de `copy/es.ts`). */
  title: string;
  /** Franja de sin conexión (`useAppShell().offlineBanner`). */
  banner?: ReactNode;
};

/**
 * Armazón de una ruta cuya pantalla todavía no está hecha (HU-PAN-BASE-01): navegación, encabezado y la Franja de sin
 * conexión. Cada HU de pantalla la reemplaza por su plantilla (lista o detalle) con su contenido.
 */
export function ShellScreen({ nav, title, banner }: ShellScreenProps) {
  const mobile = usePlatform() === 'mobile';
  return (
    <div className={styles.shell} data-shape={mobile ? 'mobile' : 'desktop'}>
      <AppNav {...nav} />
      <main className={styles.main}>
        <PageHeader kind="root" title={title} />
        {banner}
      </main>
    </div>
  );
}
