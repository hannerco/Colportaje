'use client';

import { useState } from 'react';
import { copy } from '@/copy/es';
import { dateChangeNotes, type DateChangeNote, type DateChangeReason } from '@/domain/manual-schedule';
import { formatDate, type LocalDate } from '@/domain/time';
import { Field } from '@/ui/atoms/Field';
import { DatePickerDialog, type DatePickerNote } from '@/ui/organisms/DatePickerDialog';
import styles from './PaymentDateDialog.module.css';

export type PaymentDateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** «Abono 2 de 4». */
  label: string;
  /** La fecha que tiene (anillo punteado); `null` en un abono nuevo sin fecha. */
  current: LocalDate | null;
  today: LocalDate;
  /** Las fechas de los otros abonos por cobrar (un punto en el calendario y el aviso de orden). */
  otherDates?: readonly LocalDate[];
  /**
   * `create`: al crear el cliente (o un abono recién agregado), solo se elige y «Listo». `saved`: un abono guardado;
   * la ventana pregunta «¿Por qué cambia?»: «Me equivoqué» corrige; «El cliente pidió aplazar» aplaza con nota.
   */
  mode: 'create' | 'saved';
  /** Con qué respuesta abre (el botón «Aplazar» del detalle abre ya en aplazar). Por defecto, «Me equivoqué». */
  initialReason?: DateChangeReason;
  /** Guarda; si falla, que lance para que la ventana siga abierta (el contenedor ya avisó). */
  onSave: (date: LocalDate, reason: DateChangeReason, note?: string) => void | Promise<void>;
};

const t = copy.payments.manual.dateDialog;
const dayMonth = (date: LocalDate) => formatDate(date).slice(0, 5);

/** El texto de cada aviso (lienzo «FechaAbono»). */
const noteOf = (note: DateChangeNote, selected: LocalDate): DatePickerNote => {
  switch (note.kind) {
    case 'past':
      return { text: t.notes.past, tone: 'bad', icon: 'alert' };
    case 'earlier':
      return { text: t.notes.earlier(dayMonth(note.previous)) };
    case 'later':
      return {
        text:
          note.reason === 'reschedule'
            ? t.notes.laterReschedule(note.days)
            : t.notes.laterCorrect(dayMonth(note.previous), dayMonth(selected), note.days),
      };
    case 'paymentAfter':
      return { text: t.notes.paymentAfter(dayMonth(note.other)), icon: 'alert' };
    case 'paymentBefore':
      return { text: t.notes.paymentBefore(dayMonth(note.other)), icon: 'alert' };
    case 'farAhead':
      return { text: t.notes.farAhead };
  }
};

/**
 * La fecha de un abono (ronda 38, lienzo «Propuestas · Abonos a mano», pieza «FechaAbono»): la ventana «Elegir fecha»
 * de la biblioteca con la fecha que tenía, los otros abonos, los avisos (nunca bloquean) y, en un abono guardado, la
 * pregunta «¿Por qué cambia?» y la nota para el historial al aplazar. Pieza del módulo.
 */
export function PaymentDateDialog({
  open,
  onOpenChange,
  label,
  current,
  today,
  otherDates = [],
  mode,
  initialReason = 'correct',
  onSave,
}: PaymentDateDialogProps) {
  const [reason, setReason] = useState<DateChangeReason>(initialReason);
  const [note, setNote] = useState('');
  // Cada vez que se abre, arranca con la respuesta inicial y sin nota.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setReason(initialReason);
      setNote('');
    }
  }
  const saved = mode === 'saved';
  const reschedule = saved && reason === 'reschedule';
  const title = t.title(label);
  return (
    <DatePickerDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      value={current}
      today={today}
      previous={current}
      marked={otherDates}
      header={
        saved ? (
          <div className={styles.why}>
            <span className={styles.whyLabel} id={`${title}-why`}>
              {t.why}
            </span>
            <div role="radiogroup" aria-labelledby={`${title}-why`} className={styles.reasons}>
              {(
                [
                  ['correct', t.correct, t.correctHint],
                  ['reschedule', t.reschedule, t.rescheduleHint],
                ] as const
              ).map(([key, text, hint]) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={reason === key}
                  className={styles.reason}
                  onClick={() => setReason(key)}
                >
                  <span className={styles.reasonText}>{text}</span>
                  <span className={styles.reasonHint}>{hint}</span>
                </button>
              ))}
            </div>
          </div>
        ) : undefined
      }
      notes={(selected) =>
        dateChangeNotes({
          previous: current,
          next: selected,
          today,
          others: otherDates,
          reason: reschedule ? 'reschedule' : 'correct',
        }).map((n) => noteOf(n, selected))
      }
      confirmLabel={!saved ? t.done : reschedule ? t.saveReschedule : t.saveCorrect}
      onConfirm={async (date) => {
        if (date === current) return;
        await onSave(
          date,
          reschedule ? 'reschedule' : 'correct',
          reschedule ? note.trim() || undefined : undefined,
        );
      }}
    >
      {reschedule && (
        <Field kind="text" label={t.note} placeholder={t.notePlaceholder} value={note} onChange={setNote} />
      )}
    </DatePickerDialog>
  );
}
