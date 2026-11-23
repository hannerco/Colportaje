import { Skeleton, SkeletonScope } from '../../atoms/Skeleton';
import styles from './DetailSkeleton.module.css';

/** Una isla del esqueleto: filas de dato, de lista (libros, abonos de otro) o de abono (fecha · estado · valor). */
export type DetailSkeletonIsland = { rows: number; row?: 'data' | 'list' | 'payment' | 'cover' };

export type DetailSkeletonProps = {
  /** El avatar de la identidad: persona (círculo) o portada (cuadrado). */
  avatar?: 'person' | 'cover';
  /** Franja de estado arriba de la identidad (detalle del abono). */
  strip?: boolean;
  /** Una cifra grande y botones debajo del nombre (el valor del abono, la cuenta del cliente). */
  figure?: boolean;
  /** Cuántos botones lleva la identidad (Cobrar, Dar más plazo…). */
  actions?: number;
  /** La Pastilla de estado junto al nombre. */
  status?: boolean;
  /** Sin la isla de identidad (p. ej. Ajustes: solo islas de datos). */
  identity?: boolean;
  islands: readonly DetailSkeletonIsland[];
};

/**
 * Esqueleto de un detalle (#67): la isla de identidad y las demás islas con la forma de lo que van a mostrar, dentro
 * de la misma Ventana de detalle. Lo arma cada pantalla con sus islas.
 */
export function DetailSkeleton({
  avatar = 'person',
  strip = false,
  figure = false,
  actions = 0,
  status = true,
  identity = true,
  islands,
}: DetailSkeletonProps) {
  return (
    <SkeletonScope className={styles.stack}>
      {identity && (
        <section className={styles.island}>
          {strip && (
            <div className={styles.strip}>
              <Skeleton shape="pill" />
              <Skeleton width="9em" />
            </div>
          )}
          <div className={styles.identity}>
            <Skeleton shape={avatar === 'person' ? 'circle' : 'cover'} width="var(--size-avatar-xl)" />
            <span className={styles.who}>
              <Skeleton shape="title" width="14em" />
              {status && <Skeleton shape="pill" />}
            </span>
          </div>
          {(figure || actions > 0) && (
            <div className={styles.value}>
              {figure && (
                <span className={styles.who}>
                  <Skeleton width="6em" />
                  <Skeleton shape="figure" />
                </span>
              )}
              {actions > 0 && (
                <span className={styles.actions}>
                  {Array.from({ length: actions }, (_, i) => (
                    <Skeleton key={i} shape="button" />
                  ))}
                </span>
              )}
            </div>
          )}
        </section>
      )}
      {islands.map((island, i) => (
        <section key={i} className={styles.island}>
          <div className={styles.head}>
            <Skeleton shape="circle" width="1.1em" />
            <Skeleton width="8em" />
          </div>
          {Array.from({ length: island.rows }, (_, r) => (
            <Row key={r} kind={island.row ?? 'data'} odd={r % 2 === 1} />
          ))}
        </section>
      ))}
    </SkeletonScope>
  );
}

function Row({ kind, odd }: { kind: NonNullable<DetailSkeletonIsland['row']>; odd: boolean }) {
  if (kind === 'payment')
    return (
      <div className={`${styles.row} ${styles.payment}`}>
        <Skeleton width="5.5em" />
        <Skeleton shape="pill" />
        <Skeleton width="4.5em" className={styles.end} />
      </div>
    );
  if (kind === 'list' || kind === 'cover')
    return (
      <div className={styles.row}>
        <Skeleton shape={kind === 'cover' ? 'cover' : 'circle'} width="var(--size-avatar-lg)" />
        <span className={styles.lines}>
          <Skeleton width={odd ? '50%' : '65%'} />
          <Skeleton width="30%" />
        </span>
        <Skeleton width="4.5em" />
      </div>
    );
  return (
    <div className={`${styles.row} ${styles.data}`}>
      <Skeleton width="7em" />
      <Skeleton width={odd ? '35%' : '50%'} />
    </div>
  );
}
