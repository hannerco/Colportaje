'use client';

import { useState } from 'react';
import { copy } from '@/copy/es';
import { formatCOP, type COP } from '@/domain/money';
import { suggestFirstDueDate, type PlanItem } from '@/domain/payment-plan';
import type { LocalDate } from '@/domain/time';
import { Field } from '@/ui/atoms/Field';
import { DateField } from '@/ui/molecules/DateField';
import { SegmentedControl } from '@/ui/molecules/SegmentedControl';
import { ConfirmDialog } from '@/ui/organisms/ConfirmDialog';
import { planPreview } from '../../new-customer-form';
import { PaymentPlanFields, type PaymentPlanValue } from '../PaymentPlanFields';
import styles from './SchedulePaymentsDialog.module.css';

export type SchedulePaymentsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Lo que falta por programar del saldo (BR-PAY-15): el plan solo reparte eso. */
  unscheduled: COP;
  today: LocalDate;
  /** Aplica el plan (modo «solo lo sin programar»). Si falla, que lance para que el diálogo siga abierto. */
  onApplyPlan: (items: readonly PlanItem[]) => Promise<void>;
  /** Programa un abono suelto (BR-PAY-16). Si falla, que lance. */
  onScheduleSingle: (input: { dueDate: LocalDate; amount: COP }) => Promise<void>;
};

const t = copy.customers.detail.payments.scheduleForm;

/**
 * «Programar abono» desde la ficha (FC-10, #35; propuesta 7 del lienzo): «Plan» reparte lo que falta por programar con
 * la misma pieza de Nuevo cliente; «Un abono» pide solo fecha y valor. Hoja en el celular, ventana en el computador.
 */
export function SchedulePaymentsDialog({
  open,
  onOpenChange,
  unscheduled,
  today,
  onApplyPlan,
  onScheduleSingle,
}: SchedulePaymentsDialogProps) {
  const [kind, setKind] = useState<'plan' | 'single'>(unscheduled > 0 ? 'plan' : 'single');
  const [plan, setPlan] = useState<PaymentPlanValue>({
    frequency: 'biweekly',
    amount: null,
    firstDueDate: null,
  });
  const [single, setSingle] = useState<{ dueDate: LocalDate | null; amount: COP | null }>({
    dueDate: null,
    amount: null,
  });
  const firstDueDate =
    plan.firstDueDate ?? (plan.amount !== null ? suggestFirstDueDate(plan.frequency, today) : null);
  const preview = planPreview({
    debt: unscheduled,
    downPayment: 0,
    frequency: plan.frequency,
    amount: plan.amount,
    firstDueDate,
    today,
  });

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setKind(unscheduled > 0 ? 'plan' : 'single');
          setPlan({ frequency: 'biweekly', amount: null, firstDueDate: null });
          setSingle({ dueDate: null, amount: null });
        }
        onOpenChange(next);
      }}
      title={t.title}
      message={`${t.unscheduled} ${formatCOP(unscheduled)}`}
      confirmLabel={t.submit}
      cancelLabel={t.cancel}
      onConfirm={async () => {
        if (kind === 'plan') {
          if (!preview.items) throw new Error('invalid');
          await onApplyPlan(preview.items.map(({ dueDate, amount }) => ({ dueDate, amount })));
          return;
        }
        if (!single.dueDate || !single.amount) throw new Error('invalid');
        await onScheduleSingle({ dueDate: single.dueDate, amount: single.amount });
      }}
    >
      <div className={styles.form}>
        <SegmentedControl
          label={t.kind}
          hideLabel
          options={[
            { value: 'plan', label: t.plan },
            { value: 'single', label: t.single },
          ]}
          value={kind}
          onValueChange={(value) => setKind(value as 'plan' | 'single')}
        />
        {kind === 'plan' ? (
          unscheduled > 0 ? (
            <PaymentPlanFields
              value={{ ...plan, firstDueDate }}
              onChange={(patch) => setPlan((current) => ({ ...current, ...patch }))}
              preview={preview}
              today={today}
            />
          ) : (
            <p className={styles.note}>{t.nothing}</p>
          )
        ) : (
          <div className={styles.fields}>
            <DateField
              today={today}
              label={t.date}
              placeholder="dd/mm/aaaa"
              value={single.dueDate}
              onChange={(dueDate) => setSingle((current) => ({ ...current, dueDate }))}
              error={single.dueDate === null && single.amount !== null ? t.missingDate : undefined}
            />
            <Field
              kind="money"
              label={t.value}
              placeholder="0"
              value={single.amount}
              onChange={(amount) => setSingle((current) => ({ ...current, amount }))}
            />
          </div>
        )}
      </div>
    </ConfirmDialog>
  );
}
