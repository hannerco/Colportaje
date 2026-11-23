import { useId, type MouseEvent, type ReactNode } from 'react';
import { copy } from '@/copy/es';
import { Button } from '../../atoms/Button';
import { Icon, type IconName } from '../../icons';
import styles from './Island.module.css';

export type IslandProps = {
  /** Título (`titulo`). Sin título no hay encabezado (CA-2). */
  title?: string;
  /** Ícono junto al título (`icono`), en `text-2`. */
  icon?: IconName;
  /** Enlace a la derecha del título (`accion`), p. ej. «Agregar». */
  action?: {
    label: string;
    href?: string;
    onClick?: (event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
  };
  /**
   * Formularios por secciones (lienzo CrearV5, #32): a la derecha del título, un círculo vacío mientras falta algo y un
   * círculo con chulo verde cuando la sección está completa. Sin valor no se muestra.
   */
  complete?: boolean;
  /** Línea bajo el encabezado, como en las islas de la ficha y de Nuevo cliente (CrearV5, #32 y #35). */
  divided?: boolean;
  /** Contenido (`contenido`): filas de dato, historial o cualquier otro. */
  children: ReactNode;
  className?: string;
};

/**
 * Isla (HU-UI-22, ficha Lib-Isla): tarjeta que agrupa los datos de un detalle. Un detalle se arma apilando islas
 * (identidad, datos, historial). Es un `<section>` cuyo nombre es su título.
 */
export function Island({ title, icon, action, complete, divided = false, children, className }: IslandProps) {
  const titleId = useId();
  return (
    <section
      className={[styles.island, className].filter(Boolean).join(' ')}
      aria-labelledby={title ? titleId : undefined}
    >
      {title && (
        <div className={styles.head} data-divided={divided || undefined}>
          <h2 id={titleId} className={styles.title}>
            {icon && <Icon name={icon} tone="current" className={styles.icon} />}
            {title}
          </h2>
          {action && (
            <Button variant="link" size="compact" href={action.href} onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {complete !== undefined &&
            (complete ? (
              <Icon name="collected" tone="current" className={styles.done} label={copy.ui.island.complete} />
            ) : (
              <span role="img" aria-label={copy.ui.island.incomplete} className={styles.pending} />
            ))}
        </div>
      )}
      {/* #26: lo que va dentro (campos, listas, mapa) se separa siempre con el mismo espacio. */}
      <div className={styles.body}>{children}</div>
    </section>
  );
}
