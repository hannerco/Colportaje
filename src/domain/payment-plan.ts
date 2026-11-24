// Plan de abonos automático (HU-ABO-03, BR-PAY-15, ADR-0039/0045/0047). El plan NO es una entidad: crea
// abonos programados normales y no guarda la frecuencia. Valores y días de pago salen de la configuración.
import { businessConfig } from './config/business-config';
import type { CustomerAccount } from './customer';
import { isValidCOP, type COP } from './money';
import { appError, validationError, type AppError } from './shared/errors';
import { err, ok, type Result } from './shared/result';
import { addDays, lastDayOfMonth, localDate, type LocalDate } from './time';

export const PAYMENT_PLAN_ERROR_CODES = {
  PLAN_REQUIRES_BALANCE: 'PLAN_REQUIRES_BALANCE',
  PLAN_TOTAL_MISMATCH: 'PLAN_TOTAL_MISMATCH',
  /** #90: los valores cambiados a mano ya pasan del saldo. */
  PLAN_AMOUNTS_EXCEED: 'PLAN_AMOUNTS_EXCEED',
} as const;

export type PlanFrequency = 'weekly' | 'biweekly' | 'monthly';
export type PlanMode = 'replace_all' | 'unscheduled_only';
export type PlanItem = { readonly dueDate: LocalDate; readonly amount: COP };

const { amountMultiple, paydays, weeklyStepDays } = businessConfig.paymentPlan;

const pad = (n: number) => String(n).padStart(2, '0');

/** Día de pago `day` de ese mes; 30 = último día si el mes es más corto (febrero). */
const paydayIn = (year: number, month: number, day: number): LocalDate => {
  const last = Number(lastDayOfMonth(localDate(`${year}-${pad(month)}-01`)).slice(8));
  return localDate(`${year}-${pad(month)}-${pad(Math.min(day, last))}`);
};

/** El primer día de pago estrictamente posterior a `after` (sin separación mínima, ADR-0047). */
const nextPayday = (after: LocalDate, days: readonly number[]): LocalDate => {
  let year = Number(after.slice(0, 4));
  let month = Number(after.slice(5, 7));
  for (;;) {
    for (const day of [...days].sort((a, b) => a - b)) {
      const candidate = paydayIn(year, month, day);
      if (candidate > after) return candidate;
    }
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
};

/** R3: siguiente fecha del plan después de `previous`. */
export const nextDueDate = (previous: LocalDate, frequency: PlanFrequency): LocalDate => {
  switch (frequency) {
    case 'weekly':
      return addDays(previous, weeklyStepDays);
    case 'biweekly':
      return nextPayday(previous, paydays.biweekly);
    case 'monthly':
      return nextPayday(previous, paydays.monthly);
  }
};

/** R3: primer abono sugerido = primer día de pago posterior a hoy (semanal: hoy + 7). */
export const suggestFirstDueDate = (frequency: PlanFrequency, today: LocalDate): LocalDate =>
  nextDueDate(today, frequency);

/** R1: la base del plan es lo que falta pagar (`replace_all`) o lo que falta programar (`unscheduled_only`). */
export const planBase = (account: Pick<CustomerAccount, 'remaining' | 'unscheduled'>, mode: PlanMode): COP =>
  mode === 'replace_all' ? account.remaining : account.unscheduled;

/**
 * Arma el plan (BR-PAY-15): cantidad = base ÷ valor hacia abajo (mínimo 1); lo que sobra lo suma el abono
 * más próximo, así suman exactamente la base. Si la base es menor que el valor, un solo abono por la base
 * (AF-113). El primer abono puede ser anterior a hoy y las siguientes fechas siguen la misma regla de días de
 * pago (HU-ABO-08 R4). Errores: `PLAN_REQUIRES_BALANCE`, `VALIDATION` (`amount`).
 */
export const buildPaymentPlan = (input: {
  readonly base: COP;
  readonly frequency: PlanFrequency;
  readonly amount: COP;
  readonly firstDueDate: LocalDate;
}): Result<PlanItem[], AppError> => {
  if (!isValidCOP(input.base) || input.base === 0) {
    return err(appError(PAYMENT_PLAN_ERROR_CODES.PLAN_REQUIRES_BALANCE));
  }
  if (!isValidCOP(input.amount) || input.amount === 0 || input.amount % amountMultiple !== 0) {
    return err(validationError('amount', { multiple: amountMultiple }));
  }

  const count = Math.max(1, Math.floor(input.base / input.amount));
  const first = input.base < input.amount ? input.base : input.base - input.amount * (count - 1);
  const items: PlanItem[] = [];
  let dueDate = input.firstDueDate;
  for (let i = 0; i < count; i++) {
    items.push({ dueDate, amount: i === 0 ? first : input.amount });
    dueDate = nextDueDate(dueDate, input.frequency);
  }
  return ok(items);
};

/**
 * #90 (BR-PAY-15b): valores de abonos cambiados a mano en el plan, por posición. Esos abonos quedan fijos y el resto se
 * ajusta para que el plan siga sumando exactamente la base: si falta, se agregan abonos al final con el valor de cada
 * abono (el último lleva lo que quede); si sobra, se descuenta de los últimos abonos no cambiados (y se quitan los que
 * quedan en 0). Si los cambiados ya pasan de la base, `PLAN_AMOUNTS_EXCEED`. Como todo abono editado a mano (BR-PAY-15),
 * el valor cambiado es cualquier entero > 0: el múltiplo de $1.000 es solo del cálculo automático. `amountChanged` marca los cambiados (al quitar un
 * abono en 0 las posiciones se corren; por eso la marca viaja con el abono).
 */
export const adjustPlanAmounts = (input: {
  readonly base: COP;
  readonly frequency: PlanFrequency;
  readonly amount: COP;
  readonly items: readonly PlanItem[];
  readonly overrides: Readonly<Record<number, COP>>;
}): Result<(PlanItem & { readonly amountChanged: boolean })[], AppError> => {
  const fixed = new Set<number>();
  const base = [...input.items];
  // Un abono agregado al final también se puede cambiar: se completa la lista hasta esa posición.
  const lastIndex = Math.max(-1, ...Object.keys(input.overrides).map(Number));
  while (base.length > 0 && base.length <= lastIndex) {
    base.push({ dueDate: nextDueDate(base[base.length - 1]!.dueDate, input.frequency), amount: 0 });
  }
  const items = base.map((item, i) => {
    const override = input.overrides[i];
    if (override === undefined) return { ...item };
    fixed.add(i);
    return { ...item, amount: override };
  });
  for (const i of fixed) {
    const value = items[i]!.amount;
    if (!isValidCOP(value) || value === 0) {
      return err(validationError('amount', { index: i }));
    }
  }
  let diff = input.base - items.reduce((sum, item) => sum + item.amount, 0);
  while (diff > 0) {
    const last = items[items.length - 1]!;
    const add = Math.min(input.amount, diff);
    items.push({ dueDate: nextDueDate(last.dueDate, input.frequency), amount: add });
    diff -= add;
  }
  for (let i = items.length - 1; diff < 0 && i >= 0; i--) {
    if (fixed.has(i)) continue;
    const take = Math.min(items[i]!.amount, -diff);
    items[i] = { ...items[i]!, amount: items[i]!.amount - take };
    diff += take;
  }
  if (diff < 0) return err(appError(PAYMENT_PLAN_ERROR_CODES.PLAN_AMOUNTS_EXCEED));
  return ok(
    items.map((item, i) => ({ ...item, amountChanged: fixed.has(i) })).filter((item) => item.amount > 0),
  );
};

/** Un id por abono (BR-GEN-04), generados UNA vez para que reintentar no duplique. */
export const withPaymentIds = (
  plan: readonly PlanItem[],
  newId: () => string,
): { paymentId: string; dueDate: LocalDate; amount: COP }[] =>
  plan.map((item) => ({ paymentId: newId(), dueDate: item.dueDate, amount: item.amount }));
