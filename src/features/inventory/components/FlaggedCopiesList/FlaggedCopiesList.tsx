'use client';

import { copy } from '@/copy/es';
import type { FlaggedCopy } from '@/domain/inventory';
import { Avatar } from '@/ui/atoms/Avatar';
import { Button } from '@/ui/atoms/Button';
import { Icon } from '@/ui/icons';
import { usePlatform } from '@/ui/platform';
import { SwipeRow } from '../SwipeRow';
import styles from './FlaggedCopiesList.module.css';

export type FlaggedCopiesListProps = {
  items: readonly FlaggedCopy[];
  /** CA-3: sin conexión no se resuelve (la lista se consulta). */
  isOnline: boolean;
  copyHref: (copyId: string) => string;
  /** Apareció: vuelve a En físico, sin nota (lienzo). */
  onFound: (item: FlaggedCopy) => void;
  /** Perdido (lo asumo yo) y Eliminar piden una nota opcional. */
  onLost: (item: FlaggedCopy) => void;
  onRemove: (item: FlaggedCopy) => void;
};

const t = copy.inventory.flagged;

/**
 * Por resolver (diseño «1 · Por resolver», HU-INV-07, pieza del módulo): ejemplares con novedad, del más nuevo al más
 * antiguo, con «Apareció», «Perdido (lo asumo yo)» y «Eliminar». Escritorio: botones en la fila. Móvil: la fila se
 * desliza (derecha: Apareció; izquierda: Perdido y Eliminar) y tocarla abre el Ejemplar.
 */
export function FlaggedCopiesList({
  items,
  isOnline,
  copyHref,
  onFound,
  onLost,
  onRemove,
}: FlaggedCopiesListProps) {
  const mobile = usePlatform() === 'mobile';
  const state = isOnline ? 'normal' : 'disabled';

  return (
    <ul className={styles.list} aria-label={t.title} data-shape={mobile ? 'mobile' : 'desktop'}>
      {items.map((item) => {
        const name = t.copyName(item.titleName, item.number);
        const info = (
          <a className={styles.info} href={copyHref(item.copyId)}>
            <Avatar kind="cover" coverUrl={item.imageUrl ?? undefined} decorative />
            <span className={styles.text}>
              <span className={styles.name}>
                {item.titleName}{' '}
                <span className={styles.number}>{copy.inventory.openTitle.copy(item.number)}</span>
              </span>
              {item.note && <span className={styles.note}>{item.note}</span>}
            </span>
          </a>
        );
        if (!mobile)
          return (
            <li key={item.copyId} className={styles.row}>
              {info}
              <span className={styles.actions}>
                <Button
                  variant="secondary"
                  size="compact"
                  icon="check"
                  state={state}
                  aria-label={t.action(t.found, name)}
                  onClick={() => onFound(item)}
                >
                  {t.found}
                </Button>
                <Button
                  variant="secondary"
                  size="compact"
                  state={state}
                  aria-label={t.action(`${t.lost} ${t.lostDetail}`, name)}
                  onClick={() => onLost(item)}
                >
                  {`${t.lost} ${t.lostDetail}`}
                </Button>
                <Button
                  variant="tertiary"
                  size="compact"
                  icon="delete"
                  state={state}
                  className={styles.remove}
                  aria-label={t.action(t.remove, name)}
                  onClick={() => onRemove(item)}
                >
                  {t.remove}
                </Button>
              </span>
            </li>
          );
        const swipeButton = (
          label: string,
          onClick: () => void,
          tone: 'accent' | 'neutral' | 'danger',
          detail?: string,
        ) => (
          <button
            type="button"
            className={styles.swipeAction}
            data-tone={tone}
            aria-label={t.action(detail ? `${label} ${detail}` : label, name)}
            aria-disabled={!isOnline || undefined}
            onClick={() => {
              if (isOnline) onClick();
            }}
          >
            <Icon
              name={tone === 'accent' ? 'check' : tone === 'danger' ? 'delete' : 'alert'}
              size={18}
              tone="current"
            />
            <span>{label}</span>
            {detail && <span className={styles.detail}>{detail}</span>}
          </button>
        );
        return (
          <li key={item.copyId} className={styles.row}>
            <SwipeRow
              disabled={!isOnline}
              start={swipeButton(t.found, () => onFound(item), 'accent')}
              end={
                <>
                  {swipeButton(t.lost, () => onLost(item), 'neutral', t.lostDetail)}
                  {swipeButton(t.remove, () => onRemove(item), 'danger')}
                </>
              }
            >
              {info}
            </SwipeRow>
          </li>
        );
      })}
    </ul>
  );
}
