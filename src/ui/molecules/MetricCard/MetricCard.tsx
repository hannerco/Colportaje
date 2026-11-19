import type { CSSProperties } from 'react';
import { copy } from '@/copy/es';
import { formatCOP, type COP } from '@/domain/money';
import styles from './MetricCard.module.css';

export type MetricTone = 'delivered' | 'collected' | 'pending' | 'total';
export type MetricShape = 'card' | 'legend' | 'featured';

export type MetricCardProps = {
  /** Etiqueta (`etiqueta`): nombra el grupo, p. ej. «Entregado». */
  label: string;
  /** Monto (`monto`) en COP enteros. */
  amount: COP;
  /** Porcentaje (`porcentaje`), entero de 0 a 100, ya redondeado por quien lo calcula (I-11). */
  percent: number;
  /** Color del grupo (`tono`): el mismo del Medidor. `total` usa el color del texto. */
  tone?: MetricTone;
  /** Forma (`forma`): tarjeta (escritorio), leyenda (debajo del medidor) o destacada (Dinero total). */
  shape?: MetricShape;
  /** Ancho (`ancho`) en px o `auto`. Por defecto: tarjeta 240, destacada 100 %, leyenda la de su contenido. */
  width?: number | 'auto';
  className?: string;
};

const clampPercent = (n: number) => Math.min(100, Math.max(0, Math.round(n)));

/**
 * Tarjeta de métrica (HU-UI-17, ficha Lib-TarjetaMetrica): un totalizador con el color de su grupo, la etiqueta, el
 * monto y su porcentaje. El cuadro de color es decorativo: la etiqueta nombra el grupo.
 */
export function MetricCard({
  label,
  amount,
  percent,
  tone = 'delivered',
  shape = 'card',
  width,
  className,
}: MetricCardProps) {
  const pct = clampPercent(percent);
  const style = {
    '--metric-percent': `${pct}%`,
    ...(width === undefined ? {} : { '--metric-width': width === 'auto' ? 'max-content' : `${width}px` }),
  } as CSSProperties;
  const percentText = copy.ui.metric.percent(pct);

  return (
    <div
      className={[styles.metric, className].filter(Boolean).join(' ')}
      style={style}
      data-tone={tone}
      data-shape={shape}
    >
      <span className={styles.head}>
        <span className={styles.swatch} aria-hidden="true" data-part="swatch" />
        <span className={styles.label}>{label}</span>
      </span>
      <span className={styles.amount}>{formatCOP(amount)}</span>
      {shape === 'legend' ? (
        <span className={styles.percent}>{percentText}</span>
      ) : (
        <span className={styles.proportion}>
          <span className={styles.bar} aria-hidden="true" data-part="bar">
            <span className={styles.fill} />
          </span>
          <span className={styles.percent}>{percentText}</span>
        </span>
      )}
    </div>
  );
}
