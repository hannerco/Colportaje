import { copy } from '@/copy/es';
import { formatDate, type LocalDate } from '@/domain/time';
import { Icon } from '../../icons';
import styles from './DataTag.module.css';

/** El valor según el tipo: el componente lo formatea (R3), nunca recibe texto ya formateado. */
export type DataTagProps = (
  | { kind?: 'fraction'; value: { index: number; total: number } }
  | { kind: 'number'; value: number }
  | { kind: 'date'; value: LocalDate }
  | { kind: 'text'; value: string }
) & {
  /** Texto previo en gris claro (`prefijo`), p. ej. «Fecha acordada». */
  prefix?: string;
  className?: string;
};

/**
 * Etiqueta (HU-UI-07, ficha Lib-Etiqueta): dato corto de solo lectura sobre fondo gris (cuota «2/4», ejemplar «#6»,
 * fecha acordada). No es estado ni se puede pulsar.
 */
export function DataTag(props: DataTagProps) {
  const { prefix, className } = props;
  const kind = props.kind ?? 'fraction';
  return (
    <span className={[styles.tag, className].filter(Boolean).join(' ')} data-kind={kind}>
      {kind === 'date' && <Icon name="calendar" size={15} tone="current" className={styles.icon} />}
      {prefix && <span className={styles.prefix}>{prefix}</span>}
      <Value {...props} />
    </span>
  );
}

function Value(props: DataTagProps) {
  switch (props.kind) {
    case 'number':
      return <span>#{props.value}</span>;
    case 'date':
      return <span>{formatDate(props.value)}</span>;
    case 'text':
      return <span>{props.value}</span>;
    default: {
      const { index, total } = props.value;
      // Se lee «2/4»; el lector de pantalla oye «Cuota 2 de 4».
      return (
        <>
          <span aria-hidden="true">
            {index}/{total}
          </span>
          <span className={styles.visuallyHidden}>{copy.ui.installment(index, total)}</span>
        </>
      );
    }
  }
}
