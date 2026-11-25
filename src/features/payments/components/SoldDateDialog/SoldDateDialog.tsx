'use client';

import { copy } from '@/copy/es';
import { formatDate, type LocalDate } from '@/domain/time';
import { DatePickerDialog } from '@/ui/organisms/DatePickerDialog';

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
 * Cambiar la fecha de venta de un libro (#56, HU-CLI-13): la ventana «Elegir fecha» de la biblioteca; no se puede elegir un día
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
  return (
    <DatePickerDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.title}
      value={current}
      today={today}
      subtitle={t.message(bookName, formatDate(current))}
      confirmLabel={t.save}
      cancelLabel={t.cancel}
      isDisabled={(day) => day > today || (Boolean(receivedOn) && day < receivedOn!)}
      onConfirm={async (date) => {
        if (date === current) return;
        await onSave(date);
      }}
    />
  );
}
