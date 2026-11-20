import { copy } from '@/copy/es';
import { Icon, type IconName } from '../../icons';
import styles from './StatusPill.module.css';

/** Los 11 estados de la ficha más Perdido y Devuelto al líder del lienzo de Ejemplares (R4: tipo cerrado). */
export type PillStatus = keyof typeof copy.status;

export type PillTone = 'neutral' | 'bad' | 'ok' | 'accent' | 'draft';

/** Tono e ícono de cada estado (tabla «Estados» de HU-UI-05). La palabra sale de `copy.status`. */
export const PILL_STATUS: Record<PillStatus, { tone: PillTone; icon: IconName }> = {
  scheduled: { tone: 'neutral', icon: 'scheduled' },
  overdue: { tone: 'bad', icon: 'alert' },
  collected: { tone: 'ok', icon: 'collected' },
  delivered: { tone: 'accent', icon: 'delivered' },
  canceled: { tone: 'neutral', icon: 'canceled' },
  draft: { tone: 'draft', icon: 'draft' },
  current: { tone: 'neutral', icon: 'scheduled' },
  settled: { tone: 'ok', icon: 'collected' },
  in_stock: { tone: 'neutral', icon: 'in-stock' },
  sold: { tone: 'ok', icon: 'collected' },
  flagged: { tone: 'bad', icon: 'alert' },
  lost: { tone: 'bad', icon: 'canceled' },
  returned_to_leader: { tone: 'neutral', icon: 'undo' },
};

export type StatusPillProps = {
  /** Estado (`estado`): define palabra, ícono y color. */
  status: PillStatus;
  /** Forma (`forma`). `text` quita borde y fondo (filas móviles). */
  shape?: 'pill' | 'text';
  /** Bloqueado (`bloqueado`): el ícono pasa a candado (Abibono entregado). */
  locked?: boolean;
  /** Texto (`texto`): reemplaza la palabra del estado, p. ej. «Debe» en la lista móvil de clientes. */
  label?: string;
  className?: string;
};

/**
 * Pastilla de estado (HU-UI-05, ficha Lib-Pastilla): ícono, color y palabra, siempre juntos, para que el estado se
 * entienda aunque no se distinga el color. No es interactiva.
 */
export function StatusPill({ status, shape = 'pill', locked = false, label, className }: StatusPillProps) {
  const { tone, icon } = PILL_STATUS[status];
  return (
    <span
      className={[styles.pill, styles[tone], shape === 'text' && styles.text, className]
        .filter(Boolean)
        .join(' ')}
      data-status={status}
      data-tone={tone}
      data-shape={shape}
    >
      <Icon
        name={locked ? 'locked' : icon}
        size={shape === 'text' ? 14 : 15}
        tone="current"
        className={styles.icon}
      />
      {label ?? copy.status[status]}
    </span>
  );
}
