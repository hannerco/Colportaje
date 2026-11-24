'use client';

import { useRef, useState } from 'react';
import { copy } from '@/copy/es';
import { rescheduleConfirmLimit } from '@/domain/reschedule';
import { formatDate, type LocalDate } from '@/domain/time';
import { Field } from '@/ui/atoms/Field';
import { ConfirmDialog } from '@/ui/organisms/ConfirmDialog';
import { DatePickerDialog } from '@/ui/organisms/DatePickerDialog';

export type ChangeDueDateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * `correct`: durante la creación, corregir sin historial (cualquier fecha). `reschedule`: cliente guardado, prórroga
   * (posterior a la fecha actual y confirmación a más de 2 meses desde hoy, BR-PAY-06, HU-ABO-05).
   */
  mode: 'correct' | 'reschedule';
  /** «Abono 2 de 4». */
  index: number;
  total: number;
  /** La fecha actual del abono. */
  current: LocalDate;
  today: LocalDate;
  /** Las fechas de los otros abonos del cliente (un punto en el calendario). */
  otherDates?: readonly LocalDate[];
  /**
   * «Dar más plazo» (HU-PAN-DIN-02): el título es «Dar más plazo», con el cliente de `subtitle`, y se pide una nota
   * opcional (va a `onSave`).
   */
  withNote?: boolean;
  /** Debajo del título (p. ej. «Un corazón tranquilo · Acordado $30.000»). */
  subtitle?: string;
  /** Guarda la fecha; `confirmed` = el usuario ya aceptó un plazo de más de 2 meses. */
  onSave: (date: LocalDate, confirmed: boolean, note?: string) => void | Promise<void>;
};

const t = copy.payments.changeDate;

/**
 * Cambiar la fecha de un abono (HU-PAN-CLI-05, diseño «6 · Cambiar fecha de abono»): la ventana «Elegir fecha» de la
 * biblioteca (centrada en escritorio, hoja en móvil), «Cancelar» y «Guardar fecha». Una fecha pasada avisa «Esta
 * fecha ya pasó» y se permite (I-33). Solo se mueve ese abono (I-08). Pieza del módulo.
 */
export function ChangeDueDateDialog({
  open,
  onOpenChange,
  mode,
  index,
  total,
  current,
  today,
  otherDates = [],
  withNote = false,
  subtitle,
  onSave,
}: ChangeDueDateDialogProps) {
  const [confirming, setConfirming] = useState<LocalDate | null>(null);
  const [note, setNote] = useState('');
  // La confirmación se abre al cerrarse el primer diálogo: con esto, ese cierre no avisa «terminado» a quien lo usa.
  const goingToConfirm = useRef(false);
  const title = withNote ? t.extendTitle : t.title(index, total);

  return (
    <>
      <DatePickerDialog
        open={open && confirming === null}
        onOpenChange={(next) => {
          if (next) setNote('');
          if (!next && goingToConfirm.current) return;
          onOpenChange(next);
        }}
        title={title}
        value={current}
        today={today}
        marked={otherDates}
        // Prórroga: solo una fecha posterior a la actual (HU-ABO-05 R2).
        isDisabled={mode === 'reschedule' ? (date) => date <= current : undefined}
        subtitle={subtitle}
        warnPast
        confirmLabel={t.save}
        cancelLabel={t.cancel}
        onConfirm={async (selected) => {
          if (selected === current) return;
          if (mode === 'reschedule' && selected > rescheduleConfirmLimit(today)) {
            goingToConfirm.current = true;
            setConfirming(selected);
            return;
          }
          await onSave(selected, false, withNote ? note.trim() || undefined : undefined);
        }}
      >
        {withNote && (
          <Field
            kind="textarea"
            label={t.note}
            placeholder={t.notePlaceholder}
            value={note}
            onChange={setNote}
          />
        )}
      </DatePickerDialog>
      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(next) => {
          if (next) return;
          goingToConfirm.current = false;
          setConfirming(null);
          onOpenChange(false);
        }}
        title={t.confirmTitle}
        message={confirming ? t.confirmMessage(formatDate(confirming)) : ''}
        confirmLabel={t.confirm}
        cancelLabel={t.cancel}
        onConfirm={async () => {
          if (!confirming) return;
          await onSave(confirming, true, withNote ? note.trim() || undefined : undefined);
        }}
      />
    </>
  );
}
