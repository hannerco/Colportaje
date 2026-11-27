'use client';

import { useState } from 'react';
import { copy } from '@/copy/es';
import { Choice, ChoiceGroup } from '@/ui/atoms/Choice';
import { ConfirmDialog } from '@/ui/organisms/ConfirmDialog';

export type ReturnReason = 'customer_returned' | 'wrong_registration';

export type ReturnBookDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** «El camino a Cristo #2». */
  bookName: string;
  customerName: string;
  /** Si falla, que lance: el diálogo sigue abierto para reintentar. */
  onConfirm: (reason: ReturnReason) => Promise<void>;
};

const t = copy.customers.returnBook;

/**
 * Quitar un libro de un cliente guardado (BR-COPY-09, HU-CLI-10, FC-06): pregunta el motivo, con «El cliente lo
 * devolvió» marcado, y dice que el dinero no cambia. Lo usan la ficha y el detalle del ejemplar. Sin diseño propio en el
 * lienzo: el Diálogo y la Selección de la biblioteca.
 */
export function ReturnBookDialog({
  open,
  onOpenChange,
  bookName,
  customerName,
  onConfirm,
}: ReturnBookDialogProps) {
  const [reason, setReason] = useState<ReturnReason>('customer_returned');
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setReason('customer_returned');
        onOpenChange(next);
      }}
      title={t.title(bookName, customerName)}
      message={t.message}
      confirmLabel={t.confirm}
      cancelLabel={t.cancel}
      onConfirm={() => onConfirm(reason)}
    >
      <ChoiceGroup
        legend={t.reason}
        value={reason}
        onValueChange={(value) => setReason(value as ReturnReason)}
      >
        <Choice kind="radio" value="customer_returned" label={t.customerReturned} />
        <Choice
          kind="radio"
          value="wrong_registration"
          label={t.wrongRegistration}
          description={t.wrongRegistrationHint}
        />
      </ChoiceGroup>
    </ConfirmDialog>
  );
}
