'use client';

import type { ReactNode } from 'react';
import { usePlatform } from '@/ui/platform';
import { AppNav, type AppNavProps } from '@/ui/organisms/AppNav';
import { PageHeader } from '@/ui/organisms/PageHeader';
import styles from './ShellScreen.module.css';

export type ShellScreenProps = {
  /** La navegación del armazón (`useAppShell().nav`). */
  nav: AppNavProps;
  /** Título de la pantalla (el nombre del módulo, de `copy/es.ts`). Sin título, no hay encabezado. */
  title?: string;
  /** Franja de sin conexión (`useAppShell().offlineBanner`). */
  banner?: ReactNode;
  /** Contenido (p. ej. un detalle como página en escritorio, que trae su propio encabezado). */
  children?: ReactNode;
  /**
   * Pantalla de una sola tarea (Agregar al inventario, Devolver al líder): en el celular va sin la barra inferior y con
   * el margen lateral de la app, porque trae su propia barra de arriba (Cancelar · título · Listo). En escritorio no
   * cambia nada. Corrección del dueño, 2026-11-22 (#24).
   */
  task?: boolean;
};

/**
 * Armazón de una ruta cuya pantalla todavía no está hecha (HU-PAN-BASE-01): navegación, encabezado y la Franja de sin
 * conexión. Cada HU de pantalla la reemplaza por su plantilla (lista o detalle) con su contenido.
 */
export function ShellScreen({ nav, title, banner, children, task = false }: ShellScreenProps) {
  const mobile = usePlatform() === 'mobile';
  return (
    <div className={styles.shell} data-shape={mobile ? 'mobile' : 'desktop'} data-task={task || undefined}>
      {!(task && mobile) && <AppNav {...nav} />}
      <main className={styles.main}>
        {title && <PageHeader kind="root" title={title} />}
        {banner}
        {children}
      </main>
    </div>
  );
}
