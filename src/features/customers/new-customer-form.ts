// Ficha viva de Nuevo cliente (HU-PAN-CLI-03): cálculos puros del formulario, sin red ni React.
import type { COP } from '@/domain/money';
import { buildPaymentPlan, type PlanFrequency, type PlanItem } from '@/domain/payment-plan';
import { isPastDate, type LocalDate } from '@/domain/time';

export type PlanPreviewItem = PlanItem & {
  /** HU-ABO-08 / I-33: la fecha ya pasó (se permite; el front avisa «Esta fecha ya pasó»). */
  readonly past: boolean;
  /** HU-PAN-CLI-05: la fecha se corrigió a mano en el calendario (solo ese abono, I-08). */
  readonly changed: boolean;
};

export type PlanPreview = {
  /** Lo que el plan reparte: la deuda menos la cuota inicial (en la ficha nueva no hay otros pagos). */
  readonly base: COP;
  /** La lista «Así quedan los abonos»; `null` si falta el valor o el primer abono, o si no hay saldo. */
  readonly items: readonly PlanPreviewItem[] | null;
  /** El valor de cada abono no sirve (no es múltiplo de 1.000 o es 0). */
  readonly amountInvalid: boolean;
};

/**
 * I-08: la vista previa se recalcula en el teléfono al cambiar la frecuencia, el valor o el primer abono, con la misma
 * regla que el servidor (`buildPaymentPlan`, HU-ABO-03). La base usa la cuota inicial escrita, aunque aún no se haya
 * guardado, para que la lista no salte mientras se escribe.
 */
export const planPreview = (input: {
  readonly debt: COP;
  readonly downPayment: COP | null;
  readonly frequency: PlanFrequency;
  readonly amount: COP | null;
  readonly firstDueDate: LocalDate | null;
  readonly today: LocalDate;
  /** Fechas corregidas a mano, por posición (HU-PAN-CLI-05). Se descartan si el plan se recalcula. */
  readonly overrides?: Readonly<Record<number, LocalDate>>;
}): PlanPreview => {
  const base = Math.max(0, input.debt - (input.downPayment ?? 0));
  if (input.amount === null || input.firstDueDate === null || base === 0)
    return { base, items: null, amountInvalid: false };
  const plan = buildPaymentPlan({
    base,
    frequency: input.frequency,
    amount: input.amount,
    firstDueDate: input.firstDueDate,
  });
  if (!plan.ok) return { base, items: null, amountInvalid: plan.error.code === 'VALIDATION' };
  return {
    base,
    items: plan.value.map((item, i) => {
      const override = input.overrides?.[i];
      const dueDate = override ?? item.dueDate;
      return { ...item, dueDate, past: isPastDate(dueDate, input.today), changed: override !== undefined };
    }),
    amountInvalid: false,
  };
};
