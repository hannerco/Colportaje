'use client';

import { useState, type ReactNode } from 'react';
import { copy } from '@/copy/es';
import { isPastDate, type LocalDate } from '@/domain/time';
import { Icon } from '../../icons';
import { DatePickerCalendar } from '../../molecules/DatePickerCalendar';
import { ConfirmDialog } from '../ConfirmDialog';
import styles from './DatePickerDialog.module.css';

/** Un aviso dentro de la ventana: nunca impide elegir el día. */
export type DatePickerNote = {
  readonly text: string;
  /** `bad` (rojo, p. ej. «Esta fecha ya pasó») o `neutral` (gris). */
  readonly tone?: 'neutral' | 'bad';
  /** `info` (por defecto) o `alert` («Ojo: …»). */
  readonly icon?: 'info' | 'alert';
};

export type DatePickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Qué fecha se elige: «Fecha de venta», «Fecha del abono 2 de 4». */
  title: string;
  /** El día con el que abre. Sin fecha, hoy. */
  value: LocalDate | null;
  /** Hoy (con anillo en el calendario). */
  today: LocalDate;
  /** La fecha que tenía (anillo punteado y leyenda «Fecha que tenía»), al cambiar algo ya guardado. */
  previous?: LocalDate | null;
  /** Días con un punto (otros abonos del cliente; leyenda «Otros abonos»). */
  marked?: readonly LocalDate[];
  /** Días que no se pueden elegir (futuros, antes de recibir el libro…). */
  isDisabled?: (date: LocalDate) => boolean;
  /** Una línea de contexto bajo el título, p. ej. «El poder de mis palabras #1 · hoy dice 22/11/2026». */
  subtitle?: ReactNode;
  /** Arriba del calendario (p. ej. «¿Por qué cambia?» al cambiar la fecha de un abono guardado). */
  header?: ReactNode;
  /** Un día anterior a hoy se permite pero avisa «Esta fecha ya pasó» (abonos, ADR-0049). */
  warnPast?: boolean;
  /** Otros avisos según el día elegido; van en la caja de avisos, debajo del calendario. */
  notes?: (selected: LocalDate) => readonly DatePickerNote[];
  /** Debajo de los avisos (p. ej. la nota para el historial al aplazar). */
  children?: ReactNode;
  /** Por defecto «Elegir fecha». */
  confirmLabel?: string;
  /** Por defecto «Cancelar». */
  cancelLabel?: string;
  /** Con el día elegido. Si devuelve una promesa, espera; si lanza, la ventana sigue abierta (el que la usa avisó). */
  onConfirm: (date: LocalDate) => void | Promise<void>;
};

const t = copy.ui.calendar;

/**
 * Elegir una fecha (#62; revisión de 2026-11-24 y lienzo «FechaAbono», ronda 38): **el único calendario de la app**.
 * Es el Diálogo de la biblioteca (hoja inferior en el celular, ventana centrada en escritorio), siempre en el mismo
 * orden: título, contexto, lo de arriba (la pregunta de los abonos), el calendario del mes con la leyenda, la caja de
 * avisos, lo de abajo (una nota) y «Cancelar» / «Elegir fecha». Lo abren el Campo de fecha y todo lo que cambia una
 * fecha (venta, recibido, abonos).
 */
export function DatePickerDialog({
  open,
  onOpenChange,
  title,
  value,
  today,
  previous = null,
  marked = [],
  isDisabled,
  subtitle,
  header,
  warnPast = false,
  notes,
  children,
  confirmLabel = t.confirm,
  cancelLabel = t.cancel,
  onConfirm,
}: DatePickerDialogProps) {
  const [selected, setSelected] = useState<LocalDate>(value ?? today);
  // Cada vez que se abre, arranca en el día que trae (ajuste durante el render, sin efecto).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSelected(value ?? today);
  }
  const shown: DatePickerNote[] = [
    ...(warnPast && isPastDate(selected, today)
      ? [{ text: t.past, tone: 'bad' as const, icon: 'alert' as const }]
      : []),
    ...(notes?.(selected) ?? []),
  ];
  const legend = previous !== null || marked.length > 0;
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      message={subtitle ?? ''}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      onConfirm={() => onConfirm(selected)}
    >
      <div className={styles.body}>
        {header}
        <div className={styles.month}>
          <DatePickerCalendar
            label={title}
            value={selected}
            onChange={setSelected}
            today={today}
            previous={previous}
            marked={marked}
            isDisabled={isDisabled}
          />
          {legend && (
            <p className={styles.legend}>
              {previous !== null && (
                <span className={styles.legendItem}>
                  <span aria-hidden="true" className={styles.ring} />
                  {t.legendPrevious}
                </span>
              )}
              {marked.length > 0 && (
                <span className={styles.legendItem}>
                  <span aria-hidden="true" className={styles.dot} />
                  {t.legendOthers}
                </span>
              )}
            </p>
          )}
        </div>
        {shown.length > 0 && (
          <div className={styles.notes} role="status">
            {shown.map((note) => (
              <span key={note.text} className={styles.note} data-tone={note.tone ?? 'neutral'}>
                <Icon name={note.icon ?? 'info'} size={16} tone="current" />
                {note.text}
              </span>
            ))}
          </div>
        )}
        {children}
      </div>
    </ConfirmDialog>
  );
}
