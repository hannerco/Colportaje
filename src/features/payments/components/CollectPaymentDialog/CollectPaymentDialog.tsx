'use client';

import { useState } from 'react';
import { copy } from '@/copy/es';
import { DEFAULT_PAY_METHOD } from '@/domain/collected-payment';
import { formatCOP, type COP } from '@/domain/money';
import type { PayMethod } from '@/domain/payment';
import { formatDate, type LocalDate } from '@/domain/time';
import { Choice, ChoiceGroup } from '@/ui/atoms/Choice';
import { Field } from '@/ui/atoms/Field';
import { DateField } from '@/ui/molecules/DateField';
import { ConfirmDialog } from '@/ui/organisms/ConfirmDialog';
import styles from './CollectPaymentDialog.module.css';

export type CollectPaymentValues = { paidAmount: COP; paidAt: LocalDate; method: PayMethod };

export type CollectPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
  /** Lo acordado: el valor se sugiere (BR-PAY-04) y se muestra como contexto. */
  agreedAmount: COP;
  agreedDate: LocalDate | null;
  today: LocalDate;
  /** Cobra; si falla, que lance para que el diálogo siga abierto (el contenedor ya avisó). */
  onConfirm: (values: CollectPaymentValues) => void | Promise<void>;
};

const t = copy.payments.detail.collectForm;
const METHODS: PayMethod[] = ['cash', 'transfer'];

/**
 * Cobrar un abono (HU-PAN-DIN-02, diseño «Cobrar»): valor real (sugerido = acordado), fecha (hoy, nunca futura) y
 * método (Transferencia por defecto, BR-PAY-04). Un valor menor avisa del cobro parcial antes de confirmar (BR-PAY-07:
 * lo que falta queda en el saldo; nunca se crea solo). Pieza del módulo; el mismo formulario en Dinero, la ficha y Hoy.
 */
export function CollectPaymentDialog({
  open,
  onOpenChange,
  customerName,
  agreedAmount,
  agreedDate,
  today,
  onConfirm,
}: CollectPaymentDialogProps) {
  const [amount, setAmount] = useState<COP | null>(agreedAmount);
  const [date, setDate] = useState<LocalDate | null>(today);
  const [method, setMethod] = useState<PayMethod>(DEFAULT_PAY_METHOD);

  const amountError = amount === null || amount <= 0 ? t.invalidAmount : undefined;
  const dateError = date === null || date > today ? t.futureDate : undefined;
  const invalid = Boolean(amountError || dateError);
  const shortfall = amount !== null && amount > 0 && amount < agreedAmount ? agreedAmount - amount : null;
  const extra = amount !== null && amount > agreedAmount ? amount - agreedAmount : null;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setAmount(agreedAmount);
          setDate(today);
          setMethod(DEFAULT_PAY_METHOD);
        }
        onOpenChange(next);
      }}
      title={t.title(customerName)}
      message={t.subtitle(
        formatCOP(agreedAmount),
        agreedDate ? formatDate(agreedDate) : copy.ui.listRow.empty,
      )}
      confirmLabel={t.confirm}
      cancelLabel={t.cancel}
      onConfirm={async () => {
        if (invalid) throw new Error('invalid');
        await onConfirm({ paidAmount: amount!, paidAt: date!, method });
      }}
    >
      <div className={styles.form}>
        <div className={styles.fields}>
          <Field kind="money" label={t.paidAmount} value={amount} onChange={setAmount} error={amountError} />
          <DateField
            noFuture
            today={today}
            label={t.paidAt}
            placeholder="dd/mm/aaaa"
            value={date}
            onChange={setDate}
            error={dateError}
          />
        </div>
        <ChoiceGroup
          legend={t.method}
          value={method}
          onValueChange={(value) => setMethod(value as PayMethod)}
        >
          {METHODS.map((id) => (
            <Choice key={id} kind="radio" value={id} label={t.methods[id]} />
          ))}
        </ChoiceGroup>
        {shortfall !== null && (
          <p role="status" className={styles.notice}>
            {t.partial(formatCOP(shortfall))}
          </p>
        )}
        {extra !== null && (
          <p role="status" className={styles.notice}>
            {t.overpaid(formatCOP(extra))}
          </p>
        )}
      </div>
    </ConfirmDialog>
  );
}
