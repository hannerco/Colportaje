'use client';

import * as RadioGroup from '@radix-ui/react-radio-group';
import { useId, useRef } from 'react';
import { useSlidingIndicator } from '../../platform';
import styles from './SegmentedControl.module.css';

export type SegmentedOption = { value: string; label: string };

export type SegmentedControlProps = {
  /** Nombre del grupo («Medio de pago», «Frecuencia»). Se muestra encima salvo con `hideLabel`. */
  label: string;
  hideLabel?: boolean;
  options: readonly SegmentedOption[];
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
};

/**
 * Botones segmentados (lienzo CrearV5 «Medio de pago» y «Frecuencia», #33): elegir una opción entre 2 o 3, todas a la
 * vista y del mismo ancho. Es un grupo de opciones únicas (flechas para moverse, como un radio) con el aspecto del
 * segmento de las Pestañas; el fondo de la elegida se desliza (#37). Se pide subirlo a la biblioteca.
 */
export function SegmentedControl({
  label,
  hideLabel = false,
  options,
  value,
  onValueChange,
  disabled = false,
}: SegmentedControlProps) {
  const labelId = useId();
  const groupRef = useRef<HTMLDivElement>(null);
  // #78: el mismo control en otra página sale de donde quedó.
  useSlidingIndicator(
    groupRef,
    '[data-state="checked"]',
    value,
    `segmented:${options.map((option) => option.value).join('|')}`,
  );
  return (
    <div className={styles.field}>
      <span id={labelId} className={hideLabel ? styles.visuallyHidden : styles.label}>
        {label}
      </span>
      <RadioGroup.Root
        ref={groupRef}
        className={styles.group}
        aria-labelledby={labelId}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        orientation="horizontal"
      >
        <span aria-hidden="true" className={styles.indicator} />
        {options.map((option) => (
          <RadioGroup.Item key={option.value} value={option.value} className={styles.option}>
            {option.label}
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
    </div>
  );
}
