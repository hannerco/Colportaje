import { copy } from '@/copy/es';
import { Icon, type IconName } from '../../icons';
import styles from './Banner.module.css';

export type BannerTone = 'offline' | 'overdue' | 'collected' | 'delivered' | 'neutral';

export type BannerProps = {
  /** Tipo (`tipo`): tono e ícono. */
  tone?: BannerTone;
  /** Texto (`texto`), lo más corto posible (2–5 palabras). En `offline`, por defecto el de BR-GEN-08. */
  children?: string;
  /** Acción (`accion`): enlace subrayado al final, p. ej. «Cobrar». */
  action?: { label: string; onAction: () => void };
  className?: string;
};

const ICON: Record<BannerTone, IconName> = {
  offline: 'offline',
  overdue: 'alert',
  collected: 'collected',
  delivered: 'delivered',
  neutral: 'scheduled',
};

/**
 * Franja (HU-UI-16, ficha Lib-Franja): aviso fijo dentro de una pantalla o isla que explica la situación de un
 * registro («Vencido hace 3 días») o que no hay conexión. Sin conexión y vencido se anuncian (`role="status"`); las
 * demás son una nota.
 */
export function Banner({ tone = 'offline', children, action, className }: BannerProps) {
  const text = children ?? (tone === 'offline' ? copy.ui.banner.offline : '');
  const announced = tone === 'offline' || tone === 'overdue';
  return (
    <div
      className={[styles.banner, className].filter(Boolean).join(' ')}
      data-tone={tone}
      role={announced ? 'status' : 'note'}
    >
      <Icon name={ICON[tone]} tone="current" className={styles.icon} />
      <span className={styles.text}>{text}</span>
      {action && (
        <button type="button" className={styles.action} onClick={action.onAction}>
          {action.label}
        </button>
      )}
    </div>
  );
}
