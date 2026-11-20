'use client';

import { copy } from '@/copy/es';
import { Avatar } from '@/ui/atoms/Avatar';
import { Icon } from '@/ui/icons';
import styles from './TitleTile.module.css';

export type TitleTileProps = {
  name: string;
  imageUrl?: string | null;
  /** Cuántos ejemplares de este título hay en el lote. */
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
};

const t = copy.inventory.addCopies;

/**
 * Botón de título (diseño «4 · Agregar al inventario», escritorio, pieza del módulo): portada, nombre y, si hay en el
 * lote, su cantidad en acento y un «−» para quitar uno. Cada toque suma un ejemplar.
 */
export function TitleTile({ name, imageUrl, quantity, onAdd, onRemove }: TitleTileProps) {
  const selected = quantity > 0;
  return (
    <span role="group" aria-label={name} className={styles.tile} data-selected={selected || undefined}>
      {selected && (
        <button type="button" className={styles.remove} aria-label={t.removeOne(name)} onClick={onRemove}>
          <Icon name="close" size={14} tone="current" />
        </button>
      )}
      <button
        type="button"
        className={styles.add}
        aria-label={selected ? t.addAnother(name, quantity) : t.addOne(name)}
        onClick={onAdd}
      >
        <Avatar kind="cover" coverUrl={imageUrl ?? undefined} size="sm" decorative />
        <span className={styles.name}>{name}</span>
      </button>
      {selected && (
        <span className={styles.count} aria-hidden="true">
          {quantity}
        </span>
      )}
    </span>
  );
}
