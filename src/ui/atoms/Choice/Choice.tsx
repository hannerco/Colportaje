'use client';

import * as Checkbox from '@radix-ui/react-checkbox';
import * as RadioGroup from '@radix-ui/react-radio-group';
import * as Switch from '@radix-ui/react-switch';
import { useId, type ReactNode } from 'react';
import { Icon } from '../../icons';
import styles from './Choice.module.css';

export type ChoiceKind = 'checkbox' | 'radio' | 'switch';

type ChoiceCommon = {
  /** Texto (`texto`), en positivo: «Recordarme», no «No recordarme». */
  label: string;
  /** #71: la etiqueta solo para el lector (una casilla en una fila de tabla que ya dice qué es). */
  hideLabel?: boolean;
  /** Aclaración debajo, en gris (`descripcion`). */
  description?: string;
  /** Deshabilitado (`deshabilitado`): opacidad 0,4 y no cambia. */
  disabled?: boolean;
  className?: string;
};

export type ChoiceProps = ChoiceCommon &
  (
    | {
        kind?: 'checkbox' | 'switch';
        /** Marcado (`marcado`). Sin valor, el control lleva su propio estado, desmarcado al inicio. */
        checked?: boolean;
        onCheckedChange?: (checked: boolean) => void;
      }
    // En radio el marcado lo maneja `ChoiceGroup`: cada opción se identifica con su `value`.
    | { kind: 'radio'; value: string }
  );

/**
 * Selección (HU-UI-10, ficha Lib-Seleccion): casilla (varias opciones), radio (una entre varias) e interruptor
 * (efecto inmediato). Radix pone el comportamiento accesible; toda la fila es tocable.
 */
export function Choice(props: ChoiceProps) {
  const { label, description, disabled = false, className, hideLabel = false } = props;
  const kind = props.kind ?? 'checkbox';
  const id = useId();
  const descriptionId = `${id}-description`;
  const control = {
    id,
    disabled,
    'aria-describedby': description ? descriptionId : undefined,
    className: styles.control,
  };
  return (
    <label
      className={[styles.row, className].filter(Boolean).join(' ')}
      htmlFor={id}
      data-kind={kind}
      data-disabled={disabled ? '' : undefined}
    >
      <Control {...props} control={control} />
      <span className={styles.text}>
        <span className={hideLabel ? styles.visuallyHidden : styles.label}>{label}</span>
        {description && (
          <span id={descriptionId} className={styles.description}>
            {description}
          </span>
        )}
      </span>
    </label>
  );
}

type ControlAttributes = {
  id: string;
  disabled: boolean;
  'aria-describedby': string | undefined;
  className: string | undefined;
};

function Control(props: ChoiceProps & { control: ControlAttributes }) {
  const { control } = props;
  switch (props.kind) {
    case 'radio':
      return (
        <RadioGroup.Item {...control} value={props.value}>
          <RadioGroup.Indicator className={styles.dot} />
        </RadioGroup.Item>
      );
    case 'switch':
      return (
        <Switch.Root {...control} checked={props.checked} onCheckedChange={props.onCheckedChange}>
          <Switch.Thumb className={styles.thumb} />
        </Switch.Root>
      );
    default:
      return (
        <Checkbox.Root
          {...control}
          checked={props.checked}
          onCheckedChange={(checked) => props.onCheckedChange?.(checked === true)}
        >
          <Checkbox.Indicator className={styles.check}>
            <Icon name="check" tone="current" />
          </Checkbox.Indicator>
        </Checkbox.Root>
      );
  }
}

export type ChoiceGroupProps = {
  /** Leyenda del `<fieldset>` (p. ej. «Método»). */
  legend: string;
  /** Opción marcada. */
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
};

/** Grupo de radios: un `<fieldset>` con leyenda; las flechas mueven entre opciones y Espacio marca (Radix). */
export function ChoiceGroup({ legend, value, onValueChange, children, className }: ChoiceGroupProps) {
  return (
    <fieldset className={[styles.group, className].filter(Boolean).join(' ')}>
      <legend className={styles.legend}>{legend}</legend>
      <RadioGroup.Root className={styles.options} value={value} onValueChange={onValueChange}>
        {children}
      </RadioGroup.Root>
    </fieldset>
  );
}
