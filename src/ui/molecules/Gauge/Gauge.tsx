import { copy } from '@/copy/es';
import { gaugeSegments, type GaugeSize } from './gauge-segments';
import styles from './Gauge.module.css';

export type GaugeProps = {
  /** Porcentaje entregado (`entregado`). */
  delivered: number;
  /** Porcentaje cobrado sin entregar (`cobrado`). */
  collected: number;
  /** Porcentaje por cobrar (`porCobrar`). */
  pending: number;
  /** Tamaño (`tamano`): 240 o 320 de ancho. */
  size?: GaugeSize;
  /** Etiqueta del centro (`etiqueta`). Por defecto, «entregado». */
  caption?: string;
  className?: string;
};

/**
 * Medidor (HU-UI-18, ficha Lib-Medidor): semicírculo que reparte el dinero total en Entregado, Cobrado sin entregar
 * y Por cobrar, con el porcentaje entregado en el centro. Siempre va con las tarjetas de métrica con los montos.
 */
export function Gauge({ delivered, collected, pending, size = 'normal', caption, className }: GaugeProps) {
  const { width, height, stroke, track, segments, percents } = gaugeSegments(
    { delivered, collected, pending },
    size,
  );
  return (
    <div
      className={[styles.gauge, className].filter(Boolean).join(' ')}
      data-size={size}
      role="img"
      aria-label={copy.ui.gauge.description(percents.delivered, percents.collected, percents.pending)}
    >
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        {segments.length === 0 && (
          <path d={track} className={styles.track} strokeWidth={stroke} fill="none" data-part="track" />
        )}
        {segments.map((segment) => (
          <path
            key={segment.key}
            d={segment.d}
            className={styles.segment}
            strokeWidth={stroke}
            fill="none"
            data-key={segment.key}
          />
        ))}
      </svg>
      <span className={styles.center} aria-hidden="true">
        <span className={styles.figure}>{copy.ui.metric.percent(percents.delivered)}</span>
        <span className={styles.caption}>{caption ?? copy.ui.gauge.caption}</span>
      </span>
    </div>
  );
}
