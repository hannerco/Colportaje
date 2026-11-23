import { usePlatform } from '../../platform';
import { Skeleton, SkeletonScope, type SkeletonShape } from '../../atoms/Skeleton';
import styles from './ListSkeletons.module.css';

/** Qué lleva cada columna de la tabla mientras carga. */
export type SkeletonColumn = 'person' | 'cover' | 'text' | 'date' | 'amount' | 'pill' | 'button';

const CELL: Record<SkeletonColumn, { shape: SkeletonShape; width?: string; end?: boolean }> = {
  person: { shape: 'text', width: '70%' },
  cover: { shape: 'text', width: '70%' },
  text: { shape: 'text', width: '60%' },
  date: { shape: 'text', width: '5.5em' },
  amount: { shape: 'text', width: '5em', end: true },
  pill: { shape: 'pill' },
  button: { shape: 'button', width: '5.5em', end: true },
};

/**
 * Esqueleto de una tabla de escritorio (#67): la fila de títulos y filas con las mismas columnas que la tabla real
 * (cliente con su avatar, fechas, valores a la derecha, Pastillas y botones).
 */
export function TableSkeleton({ columns, rows = 6 }: { columns: readonly SkeletonColumn[]; rows?: number }) {
  const template = columns
    .map((c) => (c === 'person' || c === 'cover' ? 'minmax(0, 2fr)' : 'minmax(0, 1fr)'))
    .join(' ');
  return (
    <SkeletonScope className={styles.table}>
      <div className={`${styles.row} ${styles.head}`} style={{ gridTemplateColumns: template }}>
        {columns.map((c, i) => (
          <span key={i} className={CELL[c].end ? styles.end : undefined}>
            <Skeleton width="45%" />
          </span>
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className={styles.row} style={{ gridTemplateColumns: template }}>
          {columns.map((c, i) => (
            <span key={i} className={`${styles.cell} ${CELL[c].end ? styles.end : ''}`}>
              {c === 'person' && <Skeleton shape="circle" width="var(--size-avatar)" />}
              {c === 'cover' && <Skeleton shape="cover" width="var(--size-avatar)" />}
              <Skeleton
                shape={CELL[c].shape}
                width={r % 2 && CELL[c].shape === 'text' ? '50%' : CELL[c].width}
              />
            </span>
          ))}
        </div>
      ))}
    </SkeletonScope>
  );
}

/**
 * Esqueleto de una lista de celular (#67): filas de dos líneas como la Fila de lista, con su avatar o portada y, a la
 * derecha, el valor y su estado.
 */
export function RowsSkeleton({
  rows = 6,
  leading = 'person',
  trailing = true,
}: {
  rows?: number;
  leading?: 'person' | 'cover' | 'none';
  trailing?: boolean;
}) {
  return (
    <SkeletonScope className={styles.list}>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className={styles.item}>
          {leading !== 'none' && <Skeleton shape={leading === 'person' ? 'circle' : 'cover'} />}
          <span className={styles.lines}>
            <Skeleton width={r % 2 ? '55%' : '70%'} />
            <Skeleton width="35%" />
          </span>
          {trailing && (
            <span className={`${styles.lines} ${styles.endLines}`}>
              <Skeleton width="4.5em" />
              <Skeleton width="3em" />
            </span>
          )}
        </div>
      ))}
    </SkeletonScope>
  );
}

/** La tabla en escritorio y las filas de dos líneas en el celular, con la forma de la lista de cada módulo. */
export function ListSkeletonFor({
  columns,
  leading = 'person',
  rows,
}: {
  columns: readonly SkeletonColumn[];
  leading?: 'person' | 'cover' | 'none';
  rows?: number;
}) {
  return usePlatform() === 'mobile' ? (
    <RowsSkeleton leading={leading} rows={rows} />
  ) : (
    <TableSkeleton columns={columns} rows={rows} />
  );
}
