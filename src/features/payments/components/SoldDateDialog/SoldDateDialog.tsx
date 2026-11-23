'use client';

import { useState } from 'react';
import { copy } from '@/copy/es';
import { formatDate, type LocalDate } from '@/domain/time';
import { ConfirmDialog } from '@/ui/organisms/ConfirmDialog';
import { DatePickerCalendar } from '@/ui/molecules/DatePickerCalendar';

export type SoldDateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** «35 lemas para matrimonios #2». */
  bookName: string;
  current: LocalDate;
  today: LocalDate;
  /** El libro no pudo venderse antes de recibirlo (HU-CLI-13). */
  receivedOn?: LocalDate | null;
  /** Guarda; si falla, que lance para que la ventana siga abierta (el contenedor ya avisó). */
  onSave: (date: LocalDate) => Promise<void>;
};

const t = copy.payments.soldDate;

/**
 * Cambiar la fecha de venta de un libro (#56, HU-CLI-13): un calendario con hoy marcado; no se puede elegir un día
 * futuro ni anterior a cuando se recibió. Lo usan la ficha del cliente y el detalle del ejemplar.
 */
export function SoldDateDialog({
  open,
  onOpenChange,
  bookName,
  current,
  today,
  receivedOn,
  onSave,
}: SoldDateDialogProps) {
  const [date, setDate] = useState<LocalDate>(current);
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (next) setDate(current);
        onOpenChange(next);
      }}
      title={t.title}
      message={t.message(bookName, formatDate(current))}
      confirmLabel={t.save}
      cancelLabel={t.cancel}
      onConfirm={async () => {
        if (date === current) return;
        await onSave(date);
      }}
    >
      <DatePickerCalendar
        label={t.title}
        value={date}
        onChange={setDate}
        today={today}
        isDisabled={(day) => day > today || (Boolean(receivedOn) && day < receivedOn!)}
      />
    </ConfirmDialog>
  );
}
