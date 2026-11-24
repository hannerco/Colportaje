'use client';

import { useState, type ReactNode } from 'react';
import { copy } from '@/copy/es';
import { formatDate, isPastDate, type LocalDate } from '@/domain/time';
import { Icon } from '../../icons';
import { DatePickerCalendar } from '../../molecules/DatePickerCalendar';
import { ConfirmDialog } from '../ConfirmDialog';
import styles from './DatePickerDialog.module.css';

export type DatePickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Qué fecha se elige: «Fecha de venta», «Abono 2 de 4», «Primer abono». */
  title: string;
  /** El día con el que abre. Sin fecha, hoy. */
  value: LocalDate | null;
  /** Hoy (con anillo en el calendario). */
  today: LocalDate;
  /** Días con un punto (p. ej. otros abonos del cliente). */
  marked?: readonly LocalDate[];
  /** Días que no se pueden elegir (futuros, antes de recibir el libro…). */
  isDisabled?: (date: LocalDate) => boolean;
  /** Una línea de contexto bajo el título, p. ej. «El poder de mis palabras #1 · hoy dice 22/11/2026». */
  subtitle?: ReactNode;
  /** Un día anterior a hoy se permite pero avisa «Esta fecha ya pasó» (abonos programados, ADR-0049). */
  warnPast?: boolean;
  /** Otros avisos según el día elegido; van debajo de «Fecha elegida», con el mismo aspecto. */
  notes?: (selected: LocalDate) => string | null;
  /** Debajo del calendario (p. ej. el Campo de nota de «Dar más plazo»). */
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
 * Elegir una fecha (#62, revisión de 2026-11-24): **el único calendario de la app**. Es el Diálogo de la biblioteca
 * (hoja inferior en el celular, ventana centrada en escritorio), siempre en el mismo orden: título, contexto opcional,
 * «Fecha elegida: …», avisos, el calendario del mes y «Cancelar» / «Elegir fecha». Lo abren el Campo de fecha y todo lo que cambia una fecha (venta, recibido, abonos).
 */
export function DatePickerDialog({
  open,
  onOpenChange,
  title,
  value,
  today,
  marked,
  isDisabled,
  subtitle,
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
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      message={
        <span className={styles.message}>
          {subtitle && <span>{subtitle}</span>}
          <span className={styles.selected}>{t.selected(formatDate(selected))}</span>
          {warnPast && isPastDate(selected, today) && <Note text={t.past} />}
          {notes?.(selected) && <Note text={notes(selected)!} />}
        </span>
      }
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      onConfirm={() => onConfirm(selected)}
    >
      <DatePickerCalendar
        label={title}
        value={selected}
        onChange={setSelected}
        today={today}
        marked={marked}
        isDisabled={isDisabled}
      />
      {children}
    </ConfirmDialog>
  );
}

/** Un aviso: no impide elegir el día. */
function Note({ text }: { text: string }) {
  return (
    <span className={styles.note}>
      <Icon name="alert" size={16} tone="current" />
      {text}
    </span>
  );
}
