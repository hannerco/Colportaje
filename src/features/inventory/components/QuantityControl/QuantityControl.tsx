'use client';

import { useState } from 'react';
import { copy } from '@/copy/es';
import { Icon } from '@/ui/icons';
import styles from './QuantityControl.module.css';

export type QuantityControlProps = {
  name: string;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
  /** La cantidad escrita (entero ≥ 0; 0 quita la línea). */
  onSetQuantity: (quantity: number) => void;
};

const t = copy.inventory.addCopies;

/**
 * Control de cantidad de un título (diseño «4 · Agregar al inventario», móvil, pieza del módulo): sin ejemplares, un «+»;
 * con ellos, «− cantidad +», y tocar la cantidad deja escribirla (para cargar una caja entera).
 */
export function QuantityControl({ name, quantity, onAdd, onRemove, onSetQuantity }: QuantityControlProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');

  const commit = () => {
    setEditing(false);
    const value = Number(text.trim());
    if (text.trim() !== '' && Number.isSafeInteger(value) && value >= 0) onSetQuantity(value);
  };

  if (quantity === 0)
    return (
      <button type="button" className={styles.plus} aria-label={t.addOne(name)} onClick={onAdd}>
        <Icon name="add" size={20} tone="current" />
      </button>
    );
  return (
    <div role="group" aria-label={t.quantityGroup(name)} className={styles.group}>
      <button type="button" className={styles.step} aria-label={t.removeOne(name)} onClick={onRemove}>
        <span aria-hidden="true">−</span>
      </button>
      {editing ? (
        <input
          className={styles.input}
          type="text"
          inputMode="numeric"
          aria-label={t.quantityInput(name)}
          value={text}
          autoFocus
          onChange={(event) => setText(event.target.value.replace(/\D/g, ''))}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commit();
            if (event.key === 'Escape') setEditing(false);
          }}
        />
      ) : (
        <button
          type="button"
          className={styles.quantity}
          aria-label={t.quantityButton(quantity, name)}
          onClick={() => {
            setText(String(quantity));
            setEditing(true);
          }}
        >
          {quantity}
        </button>
      )}
      <button type="button" className={styles.step} aria-label={t.addOne(name)} onClick={onAdd}>
        <Icon name="add" size={18} tone="current" />
      </button>
    </div>
  );
}
