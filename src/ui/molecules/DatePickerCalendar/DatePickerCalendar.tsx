'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { copy } from '@/copy/es';
import { addMonthsClamped, type LocalDate } from '@/domain/time';
import { Button } from '@/ui/atoms/Button';
import { calendarMonth, firstOfMonth, moveDay, yearMonth } from './calendar-month';
import styles from './DatePickerCalendar.module.css';

export type DatePickerCalendarProps = {
  /** El día elegido (en acento). */
  value: LocalDate | null;
  onChange: (date: LocalDate) => void;
  /** Hoy (marcado con un anillo). */
  today: LocalDate;
  /** Días con otro abono del cliente (un punto debajo, como en el lienzo). */
  marked?: readonly LocalDate[];
  /** Días que no se pueden elegir (p. ej. en una prórroga, hasta la fecha actual del abono, HU-ABO-05 R2). */
  isDisabled?: (date: LocalDate) => boolean;
  /** Nombre del calendario para el lector, p. ej. «Abono 2 de 4». */
  label: string;
};

const t = copy.ui.calendar;

const dayName = (date: LocalDate) => {
  const { year, month } = yearMonth(date);
  return t.day(Number(date.slice(8, 10)), t.months[month - 1]!, year);
};

/**
 * Calendario mensual para elegir fecha (HU-PAN-CLI-05, diseño «6 · Cambiar fecha de abono»): semana desde domingo
 * (BR-GEN-07), hoy marcado, el día elegido en acento y un punto en los días con otro abono. Se navega con las flechas
 * (±1 día / ±1 semana), Inicio / Fin y RePág / AvPág (±1 mes). En la biblioteca desde #62: lo abre el campo de fecha.
 */
export function DatePickerCalendar({
  value,
  onChange,
  today,
  marked = [],
  isDisabled,
  label,
}: DatePickerCalendarProps) {
  const [month, setMonth] = useState(() => firstOfMonth(value ?? today));
  const [focus, setFocus] = useState<LocalDate>(value ?? today);
  const days = calendarMonth(month);
  const gridRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<LocalDate | null>(null);
  useEffect(() => {
    const date = pendingFocus.current;
    if (!date) return;
    pendingFocus.current = null;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${date}"]`)?.focus();
  }, [month]);
  const { year, month: m } = yearMonth(month);
  const title = t.month(t.months[m - 1]!, year);
  const markedSet = new Set(marked);
  // Tras cambiar de mes con los botones, el día enfocable es el 1 del mes nuevo (siempre hay uno con Tab).
  const tabbable = days.some((d) => d.date === focus && d.inMonth) ? focus : month;

  const go = (date: LocalDate, grid: HTMLElement | null) => {
    setFocus(date);
    // El foco sigue al día. Si cambia el mes, espera a que se pinte (efecto de abajo): aunque el día ya se vea como
    // relleno del mes actual, su botón se vuelve a montar en el mes nuevo y perdería el foco.
    if (firstOfMonth(date) !== month) {
      pendingFocus.current = date;
      setMonth(firstOfMonth(date));
    } else grid?.querySelector<HTMLButtonElement>(`[data-date="${date}"]`)?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Parte del día que tiene el foco (no del estado): así las teclas rápidas no se pierden.
    const from = ((event.target as HTMLElement).dataset.date as LocalDate | undefined) ?? tabbable;
    const next = moveDay(from, event.key);
    if (!next) return;
    event.preventDefault();
    go(next, event.currentTarget);
  };

  return (
    <div className={styles.calendar}>
      <div className={styles.header}>
        <Button
          variant="tertiary"
          size="compact"
          iconOnly
          icon="back"
          onClick={() => setMonth(addMonthsClamped(month, -1))}
        >
          {t.previous}
        </Button>
        <span className={styles.title} aria-live="polite">
          {title}
        </span>
        <Button
          variant="tertiary"
          size="compact"
          iconOnly
          icon="next"
          onClick={() => setMonth(addMonthsClamped(month, 1))}
        >
          {t.next}
        </Button>
      </div>
      <div
        ref={gridRef}
        role="grid"
        aria-label={`${label}, ${title}`}
        className={styles.grid}
        onKeyDown={onKeyDown}
      >
        <div role="row" className={styles.week}>
          {t.weekdays.map((day) => (
            <span key={day} role="columnheader" className={styles.weekday}>
              {day}
            </span>
          ))}
        </div>
        {Array.from({ length: 6 }, (_, w) => (
          <div key={w} role="row" className={styles.week}>
            {days.slice(w * 7, w * 7 + 7).map((day) => {
              const disabled = isDisabled?.(day.date) ?? false;
              const selected = day.date === value;
              return (
                <span key={day.date} role="gridcell" className={styles.cell}>
                  <button
                    type="button"
                    data-date={day.date}
                    className={styles.day}
                    data-outside={!day.inMonth || undefined}
                    data-today={day.date === today || undefined}
                    aria-label={`${dayName(day.date)}${markedSet.has(day.date) ? `, ${t.otherPayment}` : ''}`}
                    aria-pressed={selected}
                    aria-current={day.date === today ? 'date' : undefined}
                    aria-disabled={disabled || undefined}
                    tabIndex={day.date === tabbable ? 0 : -1}
                    onClick={() => {
                      if (disabled) return;
                      setFocus(day.date);
                      onChange(day.date);
                    }}
                  >
                    {day.day}
                    {markedSet.has(day.date) && <span aria-hidden="true" className={styles.dot} />}
                  </button>
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
