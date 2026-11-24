'use client';

import { useState } from 'react';
import { copy } from '@/copy/es';
import type { COP } from '@/domain/money';
import { Field } from '@/ui/atoms/Field';
import { ConfirmDialog } from '@/ui/organisms/ConfirmDialog';

export type ChangeAmountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** «Valor del abono 2 de 6». */
  index: number;
  total: number;
  current: COP;
  /** Por qué no sirve el valor (o `undefined` si sirve): múltiplo de 1.000 y que no pase del saldo. */
  validate: (amount: COP) => string | undefined;
  onSave: (amount: COP) => void;
};

const t = copy.payments.changeAmount;

/**
 * #90: cambiar el valor de un abono del plan durante la creación (sin historial), en el Diálogo de la biblioteca. Los
 * demás se ajustan para seguir cubriendo el saldo (BR-PAY-15b). Pieza del módulo.
 */
export function ChangeAmountDialog({
  open,
  onOpenChange,
  index,
  total,
  current,
  validate,
  onSave,
}: ChangeAmountDialogProps) {
  const [amount, setAmount] = useState<COP | null>(current);
  const [error, setError] = useState<string | undefined>();
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setAmount(current);
          setError(undefined);
        }
        onOpenChange(next);
      }}
      title={t.title(index, total)}
      message={t.message}
      confirmLabel={t.save}
      cancelLabel={t.cancel}
      onConfirm={() => {
        const problem = amount === null ? t.invalid : validate(amount);
        if (problem || amount === null) {
          setError(problem ?? t.invalid);
          // El diálogo sigue abierto para corregir el valor.
          return Promise.reject(new Error(problem));
        }
        onSave(amount);
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
