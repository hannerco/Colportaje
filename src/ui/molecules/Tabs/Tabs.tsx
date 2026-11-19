'use client';

import * as RadixTabs from '@radix-ui/react-tabs';
import { useRef, type CSSProperties } from 'react';
import { Icon, type IconName } from '../../icons';
import { usePlatform } from '../../platform';
import styles from './Tabs.module.css';

export type TabItem = {
  id: string;
  label: string;
  /** Cuántos hay en esa vista. Indefinido mientras carga: no se muestra número (R5). */
  count?: number;
  icon?: IconName;
};

export type TabsProps = {
  /** Opciones (`opciones`). */
  items: TabItem[];
  /** Opción activa (`activa`), por id. Sin valor, la primera, y el componente lleva su propio estado. */
  value?: string;
  onValueChange?: (value: string) => void;
  /** Estilo (`estilo`): óvalos para vistas de una lista; segmento para partes hermanas de un módulo. */
  variant?: 'pills' | 'segmented';
  /** Ancho (`ancho`) en px. Por defecto, el de su contenido en óvalos y el 100 % en segmento. */
  width?: number | 'auto';
  /** Nombre del grupo, p. ej. «Vistas de clientes». */
  'aria-label': string;
  className?: string;
};

/**
 * Pestañas (HU-UI-11, ficha Lib-Pestanas): cambian la vista de una misma lista (óvalos) o las partes de un módulo
 * (segmento). Radix Tabs pone `tablist`/`tab`, `aria-selected` y las flechas; el contenido lo pinta quien las usa.
 */
export function Tabs({
  items,
  value,
  onValueChange,
  variant = 'pills',
  width,
  'aria-label': ariaLabel,
  className,
}: TabsProps) {
  const platform = usePlatform();
  const listRef = useRef<HTMLDivElement>(null);
  const resolvedWidth = width ?? (variant === 'segmented' ? 'full' : 'auto');

  const handleChange = (next: string) => {
    onValueChange?.(next);
    // R4: en móvil, la activa se desplaza a la vista (los óvalos se desplazan en horizontal).
    if (platform === 'mobile')
      requestAnimationFrame(() =>
        listRef.current
          ?.querySelector('[data-state="active"]')
          ?.scrollIntoView({ block: 'nearest', inline: 'nearest' }),
      );
  };

  return (
    <RadixTabs.Root
      {...(value === undefined ? { defaultValue: items[0]?.id } : { value })}
      onValueChange={handleChange}
      activationMode="automatic"
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={
        {
          '--tabs-width':
            resolvedWidth === 'auto'
              ? 'max-content'
              : resolvedWidth === 'full'
                ? '100%'
                : `${resolvedWidth}px`,
        } as CSSProperties
      }
    >
      <RadixTabs.List ref={listRef} className={styles.list} data-variant={variant} aria-label={ariaLabel}>
        {items.map((item) => (
          <RadixTabs.Trigger
            key={item.id}
            value={item.id}
            className={styles.tab}
            // El contenido no es de esta pieza: sin panel al que apuntar.
            aria-controls={undefined}
          >
            {item.icon && <Icon name={item.icon} tone="current" />}
            <span>{item.label}</span>
            {item.count !== undefined && (
              <>
                {/* El conteo forma parte del nombre: el lector oye «Deudores, 21». */}
                <span className={styles.visuallyHidden}>, </span>
                <span className={styles.count}>{item.count}</span>
              </>
            )}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
    </RadixTabs.Root>
  );
}
