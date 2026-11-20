'use client';

import { useState } from 'react';
import { copy } from '@/copy/es';
import { formatCOP, type COP } from '@/domain/money';
import type { PlanFrequency } from '@/domain/payment-plan';
import { formatDate, type LocalDate } from '@/domain/time';
import { ChangeDueDateDialog } from '@/features/payments/components/ChangeDueDateDialog';
import { Choice, ChoiceGroup } from '@/ui/atoms/Choice';
import { Field } from '@/ui/atoms/Field';
import { StatusPill } from '@/ui/atoms/StatusPill';
import { Icon } from '@/ui/icons';
import type { PlanPreview } from '../../new-customer-form';
import styles from './PaymentPlanFields.module.css';

export type PaymentPlanValue = {
  frequency: PlanFrequency;
  amount: COP | null;
  firstDueDate: LocalDate | null;
};

export type PaymentPlanFieldsProps = {
  value: PaymentPlanValue;
  onChange: (patch: Partial<PaymentPlanValue>) => void;
  /** La vista previa calculada (`planPreview`). */
  preview: PlanPreview;
  disabled?: boolean;
  /** Hoy (para el calendario y el aviso de fecha pasada). */
  today?: LocalDate;
  /** HU-PAN-CLI-05: corregir la fecha de un abono (solo ese, sin historial). Sin función, la fecha no es botón. */
  onChangeDate?: (index: number, date: LocalDate) => void;
};

const t = copy.customers.create.payments;
const FREQUENCIES: PlanFrequency[] = ['weekly', 'biweekly', 'monthly'];

/**
 * Plan para el saldo (HU-PAN-CLI-03; diseño «3 · Crear cliente», bloque Abonos): frecuencia, valor de cada abono,
 * primer abono y la lista «Así quedan los abonos», que se recalcula al cambiar cualquiera (I-08). Un abono con fecha
 * pasada se permite y avisa «Esta fecha ya pasó» (I-33). Pieza del módulo: la biblioteca no tiene plan de abonos.
 */
export function PaymentPlanFields({
  value,
  onChange,
  preview,
  disabled = false,
  today,
  onChangeDate,
}: PaymentPlanFieldsProps) {
  const items = preview.items;
  const [editing, setEditing] = useState<number | null>(null);
  const cd = copy.payments.changeDate;
  return (
    <div className={styles.plan}>
      <p className={styles.heading}>{t.plan(preview.base > 0 ? formatCOP(preview.base) : null)}</p>
      <ChoiceGroup
        legend={t.frequency}
        value={value.frequency}
        onValueChange={(frequency) => onChange({ frequency: frequency as PlanFrequency })}
      >
        {FREQUENCIES.map((frequency) => (
          <Choice
            key={frequency}
            kind="radio"
            value={frequency}
            label={t.frequencies[frequency]}
            disabled={disabled}
          />
        ))}
      </ChoiceGroup>
      <div className={styles.fields}>
        <Field
          kind="money"
          label={t.amount}
          placeholder="0"
          value={value.amount}
          onChange={(amount) => onChange({ amount })}
          error={preview.amountInvalid ? t.amountInvalid : undefined}
          disabled={disabled}
        />
        <Field
          kind="date"
          label={t.firstDue}
          placeholder="dd/mm/aaaa"
          value={value.firstDueDate}
          onChange={(firstDueDate) => onChange({ firstDueDate })}
          disabled={disabled}
        />
      </div>
      <section className={styles.preview} aria-label={t.preview}>
        <p className={styles.label}>{t.preview}</p>
        {items ? (
          <>
            <ol className={styles.list}>
              {items.map((item, i) => (
                <li key={`${item.dueDate}-${i}`} className={styles.item}>
                  <span className={styles.which}>
                    {t.installment(i + 1)}
                    <StatusPill status={item.past ? 'overdue' : 'scheduled'} shape="text" />
                  </span>
                  <span className={styles.when}>
                    {onChangeDate && !disabled ? (
                      <button
                        type="button"
                        className={[styles.dateButton, item.past ? styles.pastDate : ''].join(' ')}
                        aria-label={cd.open(formatDate(item.dueDate))}
                        onClick={() => setEditing(i)}
                      >
                        {formatDate(item.dueDate)}
                      </button>
                    ) : (
                      <span className={item.past ? styles.pastDate : undefined}>
                        {formatDate(item.dueDate)}
                      </span>
                    )}
                    {item.changed && <span className={styles.changed}>{cd.changed}</span>}
                    {item.past && (
                      <span className={styles.past}>
                        <Icon name="alert" size={14} tone="current" />
                        {t.past}
                      </span>
                    )}
                  </span>
                  <span className={styles.amount}>{formatCOP(item.amount)}</span>
                </li>
              ))}
            </ol>
            <p className={styles.covers}>{t.covers(items.length, formatCOP(preview.base))}</p>
          </>
        ) : (
          <p className={styles.empty}>{t.previewEmpty}</p>
        )}
      </section>
      {items && editing !== null && items[editing] && onChangeDate && today && (
        <ChangeDueDateDialog
          open
          onOpenChange={(open) => !open && setEditing(null)}
          mode="correct"
          index={editing + 1}
          total={items.length}
          current={items[editing]!.dueDate}
          today={today}
          otherDates={items.filter((_, i) => i !== editing).map((item) => item.dueDate)}
          onSave={(date) => {
            onChangeDate(editing, date);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
