'use client';

import { useState } from 'react';
import { copy } from '@/copy/es';
import { formatCOP, type COP } from '@/domain/money';
import type { PayMethod } from '@/domain/payment';
import { formatDate, type LocalDate } from '@/domain/time';
import { Field } from '@/ui/atoms/Field';
import { SegmentedControl } from '@/ui/molecules/SegmentedControl';
import { ConfirmDialog } from '@/ui/organisms/ConfirmDialog';
import { DateField } from '@/ui/organisms/DateField';
import { usePlatform } from '@/ui/platform';
import styles from './CorrectCollectionDialog.module.css';

export type CollectionValues = { paidAmount: COP; paidAt: LocalDate; method: PayMethod };

export type CorrectCollectionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
  /** «2/4» (sin cuota en la cuota inicial o un abono extra). */
  installment?: string | null;
  /** Lo acordado, si es un abono programado. */
  agreedAmount?: COP | null;
  /** Lo que tiene hoy el cobro. */
  current: CollectionValues;
  today: LocalDate;
  /** Lo que hay por entregar al líder (todo); si cambia el valor se muestra «antes → después». */
  toDeliver?: COP | null;
  /** Guarda solo lo que cambió; si falla, que lance para que la ventana siga abierta (el contenedor ya avisó). */
  onSave: (patch: Partial<CollectionValues>) => Promise<void> | void;
};

const t = copy.payments.collection.correctDialog;
const METHODS: PayMethod[] = ['cash', 'transfer'];
const methodName = (method: PayMethod) => copy.payments.detail.data.methods[method];

/**
 * Corregir el cobro de un abono aún no entregado al líder (ronda 38, lienzo «Propuestas · 12», pieza «CorregirCobro»):
 * la ventana de Cobrar con el valor, la fecha y el medio de pago puestos. Lo que cambió muestra «Antes: …» y, si cambia
 * el valor, cómo queda «Por entregar». «Guardar corrección» está apagado hasta que algo cambie. Pieza del módulo.
 */
export function CorrectCollectionDialog({
  open,
  onOpenChange,
  customerName,
  installment = null,
  agreedAmount = null,
  current,
  today,
  toDeliver = null,
  onSave,
}: CorrectCollectionDialogProps) {
  // El lienzo: en el celular el subtítulo no lleva «acordado» (no cabe en una línea).
  const mobile = usePlatform() === 'mobile';
  const [amount, setAmount] = useState<COP | null>(current.paidAmount);
  const [paidAt, setPaidAt] = useState<LocalDate | null>(current.paidAt);
  const [method, setMethod] = useState<PayMethod>(current.method);
  // Cada vez que se abre, arranca con lo que tiene el cobro.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setAmount(current.paidAmount);
      setPaidAt(current.paidAt);
      setMethod(current.method);
    }
  }
  const amountChanged = amount !== null && amount !== current.paidAmount;
  const dateChanged = paidAt !== null && paidAt !== current.paidAt;
  const methodChanged = method !== current.method;
  const amountError = amount !== null && amount <= 0 ? t.invalidAmount : undefined;
  const dateError = paidAt !== null && paidAt > today ? t.futureDate : undefined;
  const valid = amount !== null && paidAt !== null && !amountError && !dateError;
  const changed = amountChanged || dateChanged || methodChanged;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t.title}
      message={t.subtitle(
        customerName,
        installment,
        agreedAmount !== null && !mobile ? formatCOP(agreedAmount) : null,
      )}
      confirmLabel={t.save}
      cancelLabel={t.cancel}
      confirmDisabled={!changed || !valid}
      onConfirm={async () => {
        await onSave({
          ...(amountChanged ? { paidAmount: amount! } : {}),
          ...(dateChanged ? { paidAt: paidAt! } : {}),
          ...(methodChanged ? { method } : {}),
        });
      }}
    >
      <div className={styles.form}>
        <div className={styles.fields}>
          <div className={styles.field}>
            <Field
              kind="money"
              label={t.amount}
              placeholder="0"
              value={amount}
              onChange={setAmount}
              error={amountError}
            />
            {amountChanged && <Before text={formatCOP(current.paidAmount)} />}
          </div>
          <div className={styles.field}>
            <DateField
              noFuture
              today={today}
              label={t.date}
              placeholder="dd/mm/aaaa"
              value={paidAt}
              onChange={setPaidAt}
              error={dateError}
            />
            {dateChanged && <Before text={formatDate(current.paidAt)} />}
          </div>
        </div>
        <div className={styles.field}>
          <SegmentedControl
            label={t.method}
            options={METHODS.map((id) => ({ value: id, label: methodName(id) }))}
            value={method}
            onValueChange={(value) => setMethod(value as PayMethod)}
          />
          {methodChanged && <Before text={methodName(current.method)} />}
        </div>
        {amountChanged && toDeliver !== null && (
          <p className={styles.toDeliver}>
            <span className={styles.toDeliverLabel}>{t.toDeliver}</span>
            <span>
              <span className={styles.muted}>{formatCOP(toDeliver)} → </span>
              <strong>{formatCOP(toDeliver - current.paidAmount + amount!)}</strong>
            </span>
          </p>
        )}
        {!changed && <p className={styles.hint}>{t.hint}</p>}
      </div>
    </ConfirmDialog>
  );
}

function Before({ text }: { text: string }) {
  return (
    <span className={styles.before}>
      {t.before} <s>{text}</s>
    </span>
  );
}
