'use client';

import type { CSSProperties, MouseEvent } from 'react';
import { copy } from '@/copy/es';
import { Icon, type IconName } from '../../icons';
import styles from './Chip.module.css';

export type ChipKind = 'filter' | 'book' | 'count';

export type ChipProps = {
  /** Texto (`texto`). */
  children: string;
  /** Tipo (`tipo`). Filtro se pulsa; libro y conteo son informativos y no reciben foco. */
  kind?: ChipKind;
  /** Filtro aplicado (`seleccionado`): tono acento y `aria-pressed`. */
  selected?: boolean;
  /** Muestra la ✕ para quitar el filtro (`quitable`). Solo en `filter`. */
  removable?: boolean;
  /** Cuántos resultados da (`conteo`). */
  count?: number;
  /** Ícono a la izquierda (`icono`). Por defecto `books` en `book`; `count` nunca lleva ícono. */
  icon?: IconName;
  /** Ancho máximo en px (`anchoMax`, 80–400); el texto se corta con «…». */
  maxWidth?: number;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  /** Al pulsar la ✕. No dispara `onClick` (R5). */
  onRemove?: (event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
};

const clampWidth = (width: number) => Math.min(400, Math.max(80, width));

/**
 * Chip (HU-UI-06, ficha Lib-Chip): pieza pequeña y redondeada para filtrar una lista o mostrar los libros de un
 * cliente. El de filtro se pulsa (`<button>` con `aria-pressed`) y se puede quitar con su propia ✕.
 */
export function Chip({
  children,
  kind = 'filter',
  selected = false,
  removable = false,
  count,
  icon,
  maxWidth = 200,
  onClick,
  onRemove,
  className,
}: ChipProps) {
  const shownIcon = kind === 'count' ? undefined : (icon ?? (kind === 'book' ? 'books' : undefined));
  const classes = [styles.chip, selected && kind === 'filter' && styles.selected, className]
    .filter(Boolean)
    .join(' ');
  const style = { '--chip-max-width': `${clampWidth(maxWidth)}px` } as CSSProperties;

  const body = (
    <>
      {shownIcon && (
        <Icon name={shownIcon} size={kind === 'book' ? 13 : 16} tone="current" className={styles.icon} />
      )}
      <span className={styles.text}>{children}</span>
      {count !== undefined && <span className={styles.count}>{count}</span>}
    </>
  );

  if (kind !== 'filter')
    return (
      <span className={classes} style={style} title={children} data-kind={kind}>
        {body}
      </span>
    );

  return (
    <span className={classes} style={style} data-kind={kind} data-selected={selected}>
      <button
        type="button"
        className={styles.main}
        aria-pressed={selected}
        title={children}
        onClick={onClick}
      >
        {body}
      </button>
      {removable && (
        <button
          type="button"
          className={styles.remove}
          aria-label={copy.ui.removeFilter(children)}
          onClick={(event) => {
            event.stopPropagation();
            onRemove?.(event);
          }}
        >
          <Icon name="close" size={14} tone="current" />
        </button>
      )}
    </span>
  );
}
