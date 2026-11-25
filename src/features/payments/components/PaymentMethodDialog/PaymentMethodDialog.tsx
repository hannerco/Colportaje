'use client';

import { useState } from 'react';
import { copy } from '@/copy/es';
import type { PayMethod } from '@/domain/payment';
import { Choice, ChoiceGroup } from '@/ui/atoms/Choice';
import { ConfirmDialog } from '@/ui/organisms/ConfirmDialog';

export type PaymentMethodDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** El que tiene hoy el abono. */
  current: PayMethod;
  /** «¿Cómo te pagó Yolanda los $65.000?». */
  customerName: string;
  amount: string;
  /** Guarda; si falla, que lance para que la ventana siga abierta (el contenedor ya avisó). */
  onSave: (method: PayMethod) => void | Promise<void>;
};

const t = copy.payments.changeMethod;
const METHODS: PayMethod[] = ['cash', 'transfer'];

/**
 * Cambiar el medio de pago de un abono cobrado que aún no se entrega al líder (ronda 38, BR-PAY-11): por si se marcó
 * Efectivo y fue Transferencia, o al revés. Las mismas opciones que al cobrar. Pieza del módulo.
 */
export function PaymentMethodDialog({
  open,
  onOpenChange,
  current,
  customerName,
  amount,
  onSave,
}: PaymentMethodDialogProps) {
  const [method, setMethod] = useState<PayMethod>(current);
  // Cada vez que se abre, arranca en el que tiene.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setMethod(current);
  }
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.title}
      message={t.message(customerName, amount)}
      confirmLabel={t.save}
      cancelLabel={t.cancel}
      onConfirm={async () => {
        if (method === current) return;
        await onSave(method);
      }}
    >
      <ChoiceGroup legend={t.legend} value={method} onValueChange={(value) => setMethod(value as PayMethod)}>
        {METHODS.map((id) => (
          <Choice key={id} kind="radio" value={id} label={copy.payments.detail.collectForm.methods[id]} />
        ))}
      </ChoiceGroup>
    </ConfirmDialog>
  );
}
