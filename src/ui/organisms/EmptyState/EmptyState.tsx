'use client';

import { useId } from 'react';
import { copy } from '@/copy/es';
import { Button } from '../../atoms/Button';
import { Icon, type IconName } from '../../icons';
import styles from './EmptyState.module.css';

export type EmptyStateKind = 'empty' | 'no-results' | 'offline' | 'error' | 'loading';

export type EmptyStateProps = {
  /** Tipo (`tipo`). */
  kind: EmptyStateKind;
  /** Qué pasa (`titulo`). No hace falta en `loading`. */
  title?: string;
  /** Qué hacer (`texto`). */
  text?: string;
  /**
   * Acción (`accion`): principal en `empty` (crea algo), secundaria en los demás (corrige). Deshabilitada (p. ej. una
   * que escribe, sin conexión), lleva al lado «Necesita conexión» (R4).
   */
  action?: { label: string; icon?: IconName; onClick: () => void; disabled?: boolean };
  /** Segunda salida, como enlace debajo de la acción (p. ej. «Buscar en Archivados» en «Sin resultados»). */
  secondaryAction?: { label: string; onClick: () => void };
  /** Ícono del caso. Por defecto: `customers`, `search`, `offline` o `alert`. */
  icon?: IconName;
  /** Solo `loading`: filas del esqueleto. */
  rows?: number;
  className?: string;
};

const ICON: Record<Exclude<EmptyStateKind, 'loading'>, IconName> = {
  empty: 'customers',
  'no-results': 'search',
  offline: 'offline',
  error: 'alert',
};

/**
 * Estado vacío y de carga (HU-UI-26, ficha Lib-EstadoVacio): lo que se ve en lugar de las filas cuando una lista no
 * tiene nada que mostrar (vacía, sin resultados, sin conexión, con error) o mientras carga (esqueleto).
 */
export function EmptyState({
  kind,
  title,
  text,
  action,
  secondaryAction,
  icon,
  rows,
  className,
}: EmptyStateProps) {
  const noteId = useId();
  if (kind === 'loading') return <ListSkeleton rows={rows} className={className} />;
  const disabled = action?.disabled ?? false;
  return (
    <div
      className={[styles.empty, className].filter(Boolean).join(' ')}
      data-kind={kind}
      role={kind === 'error' ? 'alert' : 'status'}
    >
      <span className={styles.circle}>
        <Icon name={icon ?? ICON[kind]} tone="current" />
      </span>
      {title && <p className={styles.title}>{title}</p>}
      {text && <p className={styles.text}>{text}</p>}
      {action && (
        <span className={styles.action}>
          <Button
            variant={kind === 'empty' ? 'primary' : 'secondary'}
            icon={action.icon}
            state={disabled ? 'disabled' : 'normal'}
            onClick={action.onClick}
            {...(disabled ? { 'aria-describedby': noteId } : {})}
          >
            {action.label}
          </Button>
          {disabled && (
            <span id={noteId} className={styles.note}>
              {copy.ui.empty.needsConnection}
            </span>
          )}
        </span>
      )}
      {secondaryAction && (
        <Button variant="link" size="compact" onClick={secondaryAction.onClick}>
          {secondaryAction.label}
        </Button>
      )}
    </div>
  );
}

export type ListSkeletonProps = {
  /** Filas del esqueleto. */
  rows?: number;
  className?: string;
};

/**
 * Esqueleto de una lista (R2): filas del alto de la Fila de lista, con avatar y dos barras. Se anuncia una sola vez
 * («Cargando…»), no fila por fila.
 */
export function ListSkeleton({ rows = 4, className }: ListSkeletonProps) {
  return (
    <div className={[styles.skeleton, className].filter(Boolean).join(' ')} role="status" aria-busy="true">
      <span className={styles.visuallyHidden}>{copy.ui.empty.loading}</span>
      {Array.from({ length: Math.max(1, rows) }, (_, i) => (
        <div key={i} className={styles.row} aria-hidden="true" data-row="">
          <span className={styles.avatar} />
          <span className={styles.bars}>
            <span className={styles.bar} data-long={i % 2 === 0 || undefined} />
            <span className={[styles.bar, styles.short].join(' ')} />
          </span>
        </div>
      ))}
    </div>
  );
}
