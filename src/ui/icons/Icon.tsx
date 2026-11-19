import type { CSSProperties } from 'react';
import styles from './Icon.module.css';
import { ICON_MAP, type IconName } from './icon-map';

export type IconTone = 'current' | 'text' | 'secondary' | 'tertiary' | 'accent' | 'ok' | 'bad';

export type IconProps = {
  /** Uno de los 46 nombres del diseño (`nombre`). */
  name: IconName;
  /** Lado en px (`tamano`). Sin valor: automático, `--size-icon` (18 en escritorio, 20 en móvil). */
  size?: number;
  /** Color (`tono`). `current` hereda el color del texto. Por defecto, secundario. */
  tone?: IconTone;
  /** Nombre accesible (`etiqueta`). Con etiqueta se anuncia (`role="img"`); sin ella es decorativo. */
  label?: string;
  className?: string;
};

/** R1: trazo 1,8; 2 cuando el ícono mide 16 px o menos. */
export const strokeWidthFor = (size: number | undefined): number =>
  size !== undefined && size <= 16 ? 2 : 1.8;

/**
 * Ícono de Lucide con nombre propio de Colportor (HU-UI-03, ficha Lib-Icono): trazo 1,8 sobre 24 × 24, sin relleno,
 * puntas redondas. Decorativo por defecto, porque el texto vecino ya lo nombra.
 */
export function Icon({ name, size, tone = 'secondary', label, className }: IconProps) {
  const { icon: LucideIcon, lucide } = ICON_MAP[name];
  return (
    <LucideIcon
      className={[styles.icon, styles[tone], className].filter(Boolean).join(' ')}
      style={size === undefined ? undefined : ({ '--icon-size': `${size}px` } as CSSProperties)}
      strokeWidth={strokeWidthFor(size)}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      data-icon={name}
      data-lucide={lucide}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    />
  );
}
