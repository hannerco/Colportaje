'use client';

import type { AnchorHTMLAttributes, ButtonHTMLAttributes, MouseEvent, Ref } from 'react';
import { copy } from '@/copy/es';
import { Icon, type IconName } from '../../icons';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'link' | 'danger' | 'fab';

export type ButtonProps = {
  /** Texto (`texto`): verbo en infinitivo o acción corta, sin punto final. Con `iconOnly` es el nombre accesible. */
  children: string;
  /** Variante (`variante`). Un solo `primary` por pantalla. */
  variant?: ButtonVariant;
  /** Tamaño (`tamano`). Compacto para tablas, islas y barras de herramientas. */
  size?: 'normal' | 'compact';
  /** Ícono a la izquierda del texto (`icono`). */
  icon?: IconName;
  /** Circular, sin texto (`soloIcono`). `fab` siempre es solo ícono. */
  iconOnly?: boolean;
  /** Estado (`estado`). Deshabilitado sigue siendo enfocable; ninguno de los dos dispara `onClick`. */
  state?: 'normal' | 'disabled' | 'loading';
  /** Ancho (`ancho`). */
  width?: 'auto' | 'full';
  /** Texto mientras carga (`textoCargando`). Por defecto, «Guardando…». */
  loadingText?: string;
  onClick?: (event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
  /** Tipo del `<button>`. Por defecto `button` (no envía formularios por accidente). */
  type?: 'button' | 'submit' | 'reset';
  /** Con enlace se pinta como `<a>` con el mismo aspecto. */
  href?: string;
  className?: string;
  /**
   * Para que un componente que abre algo (Menú, Diálogo) use el botón como disparador: Radix le pasa su `ref` y sus
   * atributos (`aria-expanded`, `onKeyDown`, `data-state`…).
   */
  ref?: Ref<HTMLButtonElement & HTMLAnchorElement>;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'onClick' | 'type' | 'className'>;

/** R5: tamaño del ícono (`undefined` = automático, `--size-icon`). */
const iconSizeFor = (variant: ButtonVariant, size: 'normal' | 'compact'): number | undefined =>
  variant === 'fab' ? 24 : size === 'compact' ? 16 : undefined;

/**
 * Botón (HU-UI-04, ficha Lib-Boton): dispara una acción. Píldora de 40 en escritorio; en móvil el principal mide 52.
 * Es un `<button>` real (o `<a>` con `href`): se activa con Enter y Espacio.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'normal',
  icon,
  iconOnly = false,
  state = 'normal',
  width = 'auto',
  loadingText = copy.ui.saving,
  onClick,
  type = 'button',
  href,
  className,
  ref,
  ...rest
}: ButtonProps) {
  const onlyIcon = iconOnly || variant === 'fab';
  const shownIcon = icon ?? (onlyIcon ? (variant === 'fab' ? 'new-customer' : 'more') : undefined);
  const inactive = state !== 'normal';
  const loading = state === 'loading';

  // R6 / R7: ni cargando ni deshabilitado se dispara la acción (tampoco con Enter o Espacio, que generan un clic).
  const handleClick = (event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    if (inactive) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  const content = (
    <>
      {loading ? (
        <span className={styles.spinner} aria-hidden="true" data-spinner="" />
      ) : (
        shownIcon && <Icon name={shownIcon} size={iconSizeFor(variant, size)} tone="current" />
      )}
      {!onlyIcon && <span className={styles.label}>{loading ? loadingText : children}</span>}
    </>
  );

  const shared = {
    ...rest,
    ref,
    className: [
      styles.button,
      styles[variant],
      size === 'compact' && styles.compact,
      onlyIcon && styles.iconOnly,
      width === 'full' && styles.full,
      state === 'disabled' && styles.disabled,
      className,
    ]
      .filter(Boolean)
      .join(' '),
    onClick: handleClick,
    // Con texto visible, quien lo usa puede dar un nombre más completo que lo incluya («Volver a Clientes»).
    'aria-label': onlyIcon ? children : rest['aria-label'],
    'aria-disabled': state === 'disabled' ? true : undefined,
    'aria-busy': loading ? true : undefined,
    'data-variant': variant,
  } as const;

  return href ? (
    <a {...(shared as typeof shared & AnchorHTMLAttributes<HTMLAnchorElement>)} href={href}>
      {content}
    </a>
  ) : (
    <button {...shared} type={type}>
      {content}
    </button>
  );
}
