import { copy } from '@/copy/es';
import styles from './RouteProgress.module.css';

export type RouteProgressProps = {
  /** Hay un cambio de pantalla en camino. */
  active: boolean;
};

/**
 * Barra de progreso de navegación (#98): una línea delgada arriba, como en GitHub o YouTube, mientras llega la pantalla
 * nueva. Aparece tras un instante (si la pantalla llega enseguida, no parpadea) y no tapa nada.
 */
export function RouteProgress({ active }: RouteProgressProps) {
  return (
    <div
      className={styles.track}
      data-active={active || undefined}
      role="progressbar"
      aria-label={copy.ui.empty.loading}
      aria-hidden={!active}
      aria-busy={active}
    >
      <span className={styles.bar} />
    </div>
  );
}
