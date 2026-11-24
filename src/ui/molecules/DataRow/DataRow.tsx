import { Children, type MouseEvent, type ReactNode } from 'react';
import { copy } from '@/copy/es';
import { Icon, type IconName } from '../../icons';
import styles from './DataRow.module.css';

export type DataRowKind = 'text' | 'editable' | 'amount' | 'link';

type DataRowCommon = {
  /** Etiqueta (`etiqueta`). */
  label: string;
  /** Valor (`valor`), ya formateado por quien lo usa (`formatCOP`, `formatDate`): es un contenedor genérico. */
  value: ReactNode;
  /** Ícono en gris junto a la etiqueta (`icono`). */
  icon?: IconName;
  /** Valor anterior, tachado (`secundario`); el lector lo anuncia como «antes …». */
  previous?: ReactNode;
  /** Divisor superior (`linea`). La primera fila de una isla va sin línea. */
  divider?: boolean;
  /**
   * #99: `stacked` pone la etiqueta arriba y el valor debajo a todo el ancho, para valores que son un bloque (las
   * facturas con sus fotos y campos). Por defecto, en una línea.
   */
  layout?: 'inline' | 'stacked';
  className?: string;
};

export type DataRowProps = DataRowCommon &
  (
    | { kind?: 'text' | 'amount' }
    /** El valor es un botón que abre la edición; el formulario lo pone quien la usa (R5). */
    | { kind: 'editable'; onEdit: () => void }
    | {
        kind: 'link';
        href?: string;
        onClick?: (event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void;
      }
  );

/**
 * Fila de dato (HU-UI-13, ficha Lib-FilaDato): una línea «etiqueta: valor» dentro de una isla de detalle. Va dentro
 * de `DataList` (`<dl>`), así el lector la lee como par. En escritorio la etiqueta va en una columna de 170.
 */
export function DataRow(props: DataRowProps) {
  const { label, icon, previous, divider = true, layout = 'inline', className } = props;
  const kind = props.kind ?? 'text';
  return (
    <div
      className={[styles.row, className].filter(Boolean).join(' ')}
      data-kind={kind}
      data-divider={divider ? '' : undefined}
      data-layout={layout === 'stacked' ? 'stacked' : undefined}
    >
      <dt className={styles.label}>
        {icon && <Icon name={icon} tone="tertiary" />}
        {label}
      </dt>
      <dd className={styles.value}>
        <Value {...props} />
        {previous !== undefined && (
          <s className={styles.previous}>
            <span className={styles.visuallyHidden}>{copy.ui.dataRow.previous}</span>
            {previous}
          </s>
        )}
      </dd>
    </div>
  );
}

function Value(props: DataRowProps) {
  switch (props.kind) {
    case 'editable':
      return (
        <button type="button" className={styles.editable} onClick={props.onEdit}>
          {/* Nombre: «Editar Precio acordado, $93.000». */}
          <span className={styles.visuallyHidden}>{copy.ui.dataRow.edit(props.label)}</span>
          {props.value}
        </button>
      );
    case 'link':
      return props.href ? (
        <a className={styles.link} href={props.href} onClick={props.onClick}>
          {props.value}
        </a>
      ) : (
        <button type="button" className={styles.link} onClick={props.onClick}>
          {props.value}
        </button>
      );
    default:
      return <span>{props.value}</span>;
  }
}

/** HU-UI-29 R5: más filas por isla se dividen en otra isla. */
const MAX_ROWS = 7;

/** La lista de filas de dato: un `<dl>` sin estilo propio (la isla pone el fondo y el borde). */
export function DataList({ children, className }: { children: ReactNode; className?: string }) {
  const rows = Children.count(children);
  if (process.env.NODE_ENV !== 'production' && rows > MAX_ROWS)
    // eslint-disable-next-line no-console -- HU-UI-29 R5: aviso de error de uso solo en desarrollo.
    console.warn(`DataList: ${rows} rows; split the island (at most ${MAX_ROWS}).`);
  return <dl className={[styles.list, className].filter(Boolean).join(' ')}>{children}</dl>;
}
