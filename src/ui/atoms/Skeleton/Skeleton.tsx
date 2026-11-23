import type { CSSProperties, ReactNode } from 'react';
import { copy } from '@/copy/es';
import styles from './Skeleton.module.css';

export type SkeletonShape = 'text' | 'title' | 'figure' | 'circle' | 'pill' | 'cover' | 'button' | 'block';

export type SkeletonProps = {
  /** Forma (`forma`): la de lo que va a aparecer (texto, título, cifra, avatar, pastilla, portada, botón, bloque). */
  shape?: SkeletonShape;
  /** Ancho: un porcentaje o una medida (`'40%'`, `'8em'`). Sin valor, el de la forma. */
  width?: string;
  className?: string;
};

/**
 * Esqueleto (#67): un hueco gris con la forma exacta de lo que va a aparecer, para que la pantalla no salte al cargar.
 * Decorativo: el anuncio «Cargando…» lo hace `SkeletonScope`, una sola vez.
 */
export function Skeleton({ shape = 'text', width, className }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={[styles.skeleton, className].filter(Boolean).join(' ')}
      data-shape={shape}
      style={width ? ({ '--skeleton-width': width } as CSSProperties) : undefined}
    />
  );
}

/** Envuelve el esqueleto de una pantalla o pieza: se anuncia «Cargando…» una vez y marca `aria-busy`. */
export function SkeletonScope({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className={styles.visuallyHidden}>{copy.ui.empty.loading}</span>
      {children}
    </div>
  );
}
