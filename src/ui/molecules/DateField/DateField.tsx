'use client';

import { useState } from 'react';
import { copy } from '@/copy/es';
import { todayBogota, type LocalDate } from '@/domain/time';
import { Field, type FieldProps } from '../../atoms/Field';
import { Icon } from '../../icons';
import { DatePickerCalendar } from '../DatePickerCalendar';
import { Popover } from '../Popover';
import styles from './DateField.module.css';

export type DateFieldProps = Omit<Extract<FieldProps, { kind: 'date' }>, 'kind' | 'calendarTrigger'> & {
  /** Hoy (marcado en el calendario). Sin valor, el de Bogotá en este momento. */
  today?: LocalDate;
  /** No deja elegir días después de hoy (cobros, cuota inicial, fecha de venta). */
  noFuture?: boolean;
};

const t = copy.ui.field;

/**
 * Campo de fecha (#62): el Campo `dd/mm/aaaa` con el ícono del calendario convertido en botón. Tocarlo abre el
 * calendario en un Panel flotante; elegir un día lo escribe en el campo y lo cierra. Se puede seguir escribiendo.
 */
export function DateField({ today, noFuture = false, ...field }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const now = today ?? todayBogota({ now: () => new Date() });
  const trigger = (
    <Popover
      open={open}
      onOpenChange={setOpen}
      title={field.label}
      trigger={
        <button
          type="button"
          className={styles.trigger}
          aria-label={`${t.openCalendar}, ${field.label}`}
          disabled={field.disabled}
        >
          <Icon name="calendar" tone="current" />
        </button>
      }
    >
      <DatePickerCalendar
        label={field.label}
        value={field.value}
        today={now}
        isDisabled={noFuture ? (date) => date > now : undefined}
        onChange={(date) => {
          field.onChange?.(date);
          setOpen(false);
        }}
      />
    </Popover>
  );
  return <Field {...field} kind="date" calendarTrigger={trigger} />;
}
