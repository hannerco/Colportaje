'use client';

import { useState } from 'react';
import { copy } from '@/copy/es';
import type { COP } from '@/domain/money';
import { Field } from '@/ui/atoms/Field';
import { ConfirmDialog } from '@/ui/organisms/ConfirmDialog';

export type PaymentAmountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** «Abono 2 de 4». */
  label: string;
  current: COP;
  /** Al crear el cliente se acepta $0 (la fila avisa «Pon el valor» y no se guarda); guardado, mayor que 0. */
  allowZero?: boolean;
  /** Guarda; si falla, que lance para que la ventana siga abierta (el contenedor ya avisó). */
  onSave: (amount: COP) => void | Promise<void>;
};

const t = copy.payments.manual.amountDialog;

/**
 * El valor de un abono por cobrar (ronda 38): cualquier valor, sin tocar los demás abonos. Se escribe con el teclado
 * numérico en el Diálogo de la biblioteca. Pieza del módulo.
 */
export function PaymentAmountDialog({
  open,
  onOpenChange,
  label,
  current,
  allowZero = false,
  onSave,
}: PaymentAmountDialogProps) {
  const [amount, setAmount] = useState<COP | null>(current);
  const [error, setError] = useState<string | undefined>();
  // Cada vez que se abre, arranca en el valor que tiene.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setAmount(current);
      setError(undefined);
    }
  }
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.title(label)}
      message=""
      confirmLabel={t.save}
      cancelLabel={t.cancel}
      onConfirm={async () => {
        const value = amount ?? 0;
        if (!allowZero && value <= 0) {
          setError(t.invalid);
          // La ventana sigue abierta para corregir el valor.
          throw new Error(t.invalid);
        }
        if (value === current) return;
        await onSave(value);
      }}
    >
      <Field
        kind="money"
        label={t.label}
        placeholder="0"
        value={amount}
        onChange={(next) => {
          setAmount(next);
          setError(undefined);
        }}
        error={error}
      />
    </ConfirmDialog>
  );
}
