'use client';

import { useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { copy } from '@/copy/es';
import { Icon } from '../../icons';
import { usePlatform } from '../../platform';
import styles from './SearchBox.module.css';

export type SearchBoxProps = {
  /** Texto buscado (`valor`). Sin valor, el buscador lleva su propio estado. */
  value?: string;
  /** Se llama mientras se escribe: la búsqueda no espera a «Buscar». */
  onValueChange?: (value: string) => void;
  /** Ejemplo, p. ej. «Buscar cliente». También es el nombre accesible de la caja. */
  placeholder?: string;
  /** Botón de filtros (`filtros`). `auto`: solo en móvil. */
  filters?: 'auto' | 'show' | 'hide';
  onOpenFilters?: () => void;
  /** Filtros aplicados: se muestra junto al ícono de filtros. */
  activeFilterCount?: number;
  /** Muestra «⌘K» (`atajo`), solo en escritorio. La app no lo usa hasta que se defina la búsqueda global (FT-01). */
  shortcut?: boolean;
  /** Ancho (`ancho`) en px. Por defecto, 300 en escritorio y 100 % en móvil. */
  width?: number | 'auto';
  /** Texto que se anuncia sin mover el foco, p. ej. «12 clientes». */
  resultsAnnouncement?: string;
  className?: string;
};

/**
 * Buscador (HU-UI-12, ficha Lib-Buscador): busca dentro de una lista mientras se escribe. Píldora de 40 en escritorio;
 * caja blanca de 52 con el botón de filtros adentro en móvil. Esc borra el texto o, si está vacío, quita el foco.
 */
export function SearchBox({
  value: controlled,
  onValueChange,
  placeholder,
  filters = 'auto',
  onOpenFilters,
  activeFilterCount = 0,
  shortcut = false,
  width = 'auto',
  resultsAnnouncement,
  className,
}: SearchBoxProps) {
  const platform = usePlatform();
  const inputRef = useRef<HTMLInputElement>(null);
  const [own, setOwn] = useState('');
  const value = controlled ?? own;
  const showFilters = filters === 'show' || (filters === 'auto' && platform === 'mobile');

  const change = (next: string) => {
    if (controlled === undefined) setOwn(next);
    onValueChange?.(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Escape') return;
    // R5: Esc borra el texto si hay; si está vacío, quita el foco.
    event.preventDefault();
    if (value) change('');
    else event.currentTarget.blur();
  };

  return (
    <div
      role="search"
      className={[styles.search, className].filter(Boolean).join(' ')}
      data-platform={platform}
      style={width === 'auto' ? undefined : ({ '--search-box-width': `${width}px` } as CSSProperties)}
    >
      <Icon name="search" tone="current" className={styles.lens} />
      <input
        ref={inputRef}
        className={styles.input}
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        aria-label={placeholder ?? copy.ui.search.label}
        placeholder={placeholder}
        value={value}
        onChange={(event) => change(event.target.value)}
        onKeyDown={onKeyDown}
      />
      {value && (
        <button
          type="button"
          className={styles.clear}
          aria-label={copy.ui.search.clear}
          onClick={() => {
            change('');
            // R4: el foco queda en la caja para seguir escribiendo.
            inputRef.current?.focus();
          }}
        >
          <Icon name="close" size={16} tone="current" />
        </button>
      )}
      {shortcut && platform === 'desktop' && !value && (
        <kbd className={styles.shortcut} aria-hidden="true">
          {copy.ui.search.shortcut}
        </kbd>
      )}
      {showFilters && (
        <button
          type="button"
          className={styles.filters}
          aria-label={copy.ui.search.filters(activeFilterCount)}
          onClick={onOpenFilters}
        >
          <Icon name="filter" tone="current" />
          {activeFilterCount > 0 && <span className={styles.filterCount}>{activeFilterCount}</span>}
        </button>
      )}
      <span className={styles.visuallyHidden} aria-live="polite">
        {resultsAnnouncement}
      </span>
    </div>
  );
}
