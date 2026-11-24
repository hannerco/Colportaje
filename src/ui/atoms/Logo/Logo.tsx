import type { CSSProperties } from 'react';
import { copy } from '@/copy/es';
import styles from './Logo.module.css';

export type LogoVariant = 'mark' | 'app-icon' | 'logotype' | 'mono';

export type LogoProps = {
  /** Variante (`variante`): marca sola, cuadro de app, marca + «Colportor» o una sola tinta. */
  variant?: LogoVariant;
  /** Lado de la marca o del cuadro, en px (`tamano`). */
  size?: number;
  /** Versión de 16–24 px (`reducida`). Sin valor, se usa sola cuando la marca mide menos de 32 px. */
  reduced?: boolean;
  /** Sobre el panel marino de la marca va en blanco (`sobre="marino"`). */
  onBrand?: boolean;
  /** Si el nombre ya está escrito al lado, el logo no se anuncia. */
  decorative?: boolean;
  className?: string;
};

/** Geometría aprobada (lienzo, Logo-1 «La puerta abierta»), cuadrícula de 64. */
function FullMark({ size, glow }: { size: number; glow: boolean }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" className={styles.svg}>
      {glow && <path className={styles.glow} d="M16.5 11h31v46h-31z" />}
      <path d="M14 57V8.5h36V57" fill="none" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />
      <path d="M16.5 11l14 5.5v38l-14 2.5z" fill="currentColor" />
      <path d="M37.5 21h4v27h-4zM33 28h13v4H33z" fill="currentColor" />
      <path className={glow ? styles.floorBig : styles.floor} d="M30.5 57h17l8 5H23z" fill="currentColor" />
    </svg>
  );
}

/** Versión reducida: sin la luz del piso, marco de 2 px y bordes en píxeles enteros (cuadrícula de 16 o 24). */
function SmallMark({ size }: { size: number }) {
  return size <= 19 ? (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true" className={styles.svg}>
      <path d="M2 15V1h12v14h-2V3H4v12z" fill="currentColor" />
      <path d="M4 3l3 1.5v9L4 15z" fill="currentColor" />
      <path d="M9 6h1v7H9zM8 8h3v1H8z" fill="currentColor" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className={styles.svg}>
      <path d="M4 22V2h16v20h-2V4H6v18z" fill="currentColor" />
      <path d="M6 4l4 2v14l-4 2z" fill="currentColor" />
      <path d="M13 8h2v10h-2zM11 10h6v2h-6z" fill="currentColor" />
    </svg>
  );
}

/**
 * Logo de Colportor (componente `Logo` de la biblioteca del lienzo): una puerta abierta y, en la luz que sale, una
 * cruz. Colores solo con tokens: marca `accent-text`, cuadro `accent` con la marca `on-accent`, panel marino
 * `on-brand`, monocromo `text`.
 */
export function Logo({
  variant = 'mark',
  size = 64,
  reduced,
  onBrand = false,
  decorative = false,
  className,
}: LogoProps) {
  const appIcon = variant === 'app-icon';
  const markSize = appIcon ? Math.round(size * 0.6) : size;
  const small = reduced ?? markSize < 32;
  const glow = onBrand && size >= 120 && variant !== 'mono';
  const mark = small ? <SmallMark size={markSize} /> : <FullMark size={markSize} glow={glow} />;
  // El nombre del logotipo es parte del logo: mide el 60 % de la marca (no es un rol de texto).
  const style = {
    '--logo-size': `${size}px`,
    '--logo-name-size': `${Math.round(size * 0.6)}px`,
  } as CSSProperties;
  const a11y = decorative ? { 'aria-hidden': true as const } : { role: 'img', 'aria-label': copy.app.name };

  return (
    <span
      className={[styles.logo, className].filter(Boolean).join(' ')}
      data-variant={variant}
      data-on-brand={onBrand || undefined}
      style={style}
      {...a11y}
    >
      <span className={styles.mark}>{mark}</span>
      {variant === 'logotype' && (
        <span className={styles.name} aria-hidden="true">
          {copy.app.name}
        </span>
      )}
    </span>
  );
}
