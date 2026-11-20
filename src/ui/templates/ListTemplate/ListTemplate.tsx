'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { copy } from '@/copy/es';
import { AppNav, type AppNavProps } from '../../organisms/AppNav';
import { EmptyState, type EmptyStateProps } from '../../organisms/EmptyState';
import { PageHeader, type PageHeaderRootProps } from '../../organisms/PageHeader';
import { ViewBar, type ViewBarProps } from '../../organisms/ViewBar';
import { usePlatform } from '../../platform';
import styles from './ListTemplate.module.css';

export type ListState = 'ready' | 'loading' | 'empty' | 'no-results' | 'offline-empty' | 'error';

export type ListTemplateProps = {
  nav: AppNavProps;
  header: Omit<PageHeaderRootProps, 'kind'>;
  /** Partes hermanas del módulo (Pestañas en segmento), entre el encabezado y la barra de vista (HU-PAN-INV-02). */
  sections?: ReactNode;
  viewBar: ViewBarProps;
  /** Franja de sin conexión, arriba de la lista (R4). */
  banner?: ReactNode;
  /** Qué se pinta en lugar de la lista (R4). */
  state?: ListState;
  /** Textos del estado actual (los pone la pantalla desde `copy/es.ts`). */
  emptyState?: Omit<EmptyStateProps, 'kind'>;
  /** La `ListTable` con sus filas. */
  children: ReactNode;
  /** La `DetailWindow` abierta, si la hay (R5). */
  detail?: ReactNode;
  className?: string;
};

const KIND: Record<Exclude<ListState, 'ready'>, EmptyStateProps['kind']> = {
  loading: 'loading',
  empty: 'empty',
  'no-results': 'no-results',
  'offline-empty': 'offline',
  error: 'error',
};

/**
 * Plantilla de lista (HU-UI-28, ficha Lib-Plantilla-Lista): el esqueleto de toda pantalla raíz con una lista
 * (Clientes, Inventario, Dinero), en orden fijo: navegación, encabezado, barra de vista y lista. En escritorio el
 * encabezado y la barra de vista no se desplazan: la lista se desplaza por dentro (R3).
 */
export function ListTemplate({
  nav,
  header,
  sections,
  viewBar,
  banner,
  state = 'ready',
  emptyState,
  children,
  detail,
  className,
}: ListTemplateProps) {
  const mobile = usePlatform() === 'mobile';
  const list = useRef<HTMLDivElement>(null);
  const keyboard = useRef(false);

  // El Aviso (en la raíz de la app) se coloca junto a la barra lateral o encima de la barra inferior (HU-UI-15 R4).
  useLayoutEffect(() => {
    const root = document.documentElement.style;
    root.setProperty('--layout-content-start', mobile ? '0px' : 'var(--sidebar-width)');
    root.setProperty(
      '--layout-bottom-bar',
      mobile ? 'calc(var(--size-bottom-bar-item) + var(--space-2) + var(--bottom-bar-inset))' : '0px',
    );
    return () => {
      root.removeProperty('--layout-content-start');
      root.removeProperty('--layout-bottom-bar');
    };
  }, [mobile]);

  // Al cambiar de pestaña con el teclado, el foco va al primer elemento de la lista.
  const views = {
    ...viewBar.views,
    onValueChange: (value: string) => {
      viewBar.views.onValueChange?.(value);
      if (!keyboard.current) return;
      requestAnimationFrame(() =>
        list.current?.querySelector<HTMLElement>('a[href], button:not([disabled]), [tabindex="0"]')?.focus(),
      );
    },
  };

  // CA-2: «Sin resultados» ofrece «Quitar filtros» si la pantalla no pone otra acción.
  const filters = viewBar.filters;
  const empty =
    state === 'ready'
      ? null
      : {
          ...emptyState,
          kind: KIND[state],
          action:
            emptyState?.action ??
            (state === 'no-results' && filters
              ? { label: copy.ui.viewBar.clearFilters, onClick: filters.onClear }
              : undefined),
        };

  return (
    <div
      className={[styles.template, className].filter(Boolean).join(' ')}
      data-shape={mobile ? 'mobile' : 'desktop'}
    >
      <AppNav {...nav} />
      <main className={styles.main}>
        <div
          className={styles.top}
          onKeyDownCapture={() => {
            keyboard.current = true;
          }}
          onPointerDownCapture={() => {
            keyboard.current = false;
          }}
        >
          <PageHeader kind="root" {...header} />
          {sections}
          <ViewBar {...viewBar} views={views} />
        </div>
        <div ref={list} className={styles.list}>
          {banner}
          {empty ? <EmptyState {...empty} /> : children}
        </div>
      </main>
      {detail}
    </div>
  );
}
