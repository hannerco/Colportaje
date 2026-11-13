import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  buildPaymentPlan,
  nextDueDate,
  planBase,
  suggestFirstDueDate,
  withPaymentIds,
  type PlanFrequency,
} from './payment-plan';
import { addDays, localDate } from './time';

const today = localDate('2026-11-07');
const plan = (base: number, amount: number, frequency: PlanFrequency = 'biweekly', first = '2026-11-15') =>
  buildPaymentPlan({ base, amount, frequency, firstDueDate: localDate(first) }, today);
const amounts = (r: ReturnType<typeof plan>) => (r.ok ? r.value.map((i) => i.amount) : r.error.code);

describe('payment-plan: valores (BR-PAY-15)', () => {
  it('CA-1: saldo 140.000 con abonos de 30.000 → 50.000, 30.000, 30.000 y 30.000 (el mayor primero)', () => {
    expect(amounts(plan(140_000, 30_000))).toEqual([50_000, 30_000, 30_000, 30_000]);
  });

  it('CA-2: saldo 140.000 con abonos de 35.000 → 4 de 35.000', () => {
    expect(amounts(plan(140_000, 35_000))).toEqual([35_000, 35_000, 35_000, 35_000]);
  });

  it('CA-3 / AF-113: saldo 20.000 con abonos de 30.000 → un solo abono de 20.000', () => {
    expect(amounts(plan(20_000, 30_000))).toEqual([20_000]);
  });

  it('saldo que no es múltiplo de 1.000: 145.500 con 30.000 → 55.500, 30.000, 30.000, 30.000', () => {
    expect(amounts(plan(145_500, 30_000))).toEqual([55_500, 30_000, 30_000, 30_000]);
  });

  it('CA-6: un valor de 35.500 → VALIDATION (no es múltiplo de 1.000); 0 o negativo tampoco', () => {
    for (const amount of [35_500, 0, -30_000, 1.5]) {
      expect(plan(140_000, amount)).toMatchObject({
        ok: false,
        error: { code: 'VALIDATION', details: { field: 'amount', multiple: 1000 } },
      });
    }
  });

  it('CA-9: saldo 0 → PLAN_REQUIRES_BALANCE', () => {
    expect(plan(0, 30_000)).toEqual({
      ok: false,
      error: { code: 'PLAN_REQUIRES_BALANCE', retryable: false },
    });
    expect(plan(-5_000, 30_000)).toMatchObject({ ok: false, error: { code: 'PLAN_REQUIRES_BALANCE' } });
  });

  it('un primer abono anterior a hoy → VALIDATION en firstDueDate; hoy sí', () => {
    expect(plan(60_000, 30_000, 'biweekly', '2026-11-06')).toMatchObject({
      ok: false,
      error: { details: { field: 'firstDueDate' } },
    });
    expect(plan(60_000, 30_000, 'biweekly', '2026-11-07').ok).toBe(true);
  });

  it('propiedades: suma exacta, enteros > 0, múltiplos de 1.000 salvo el más próximo, fechas crecientes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5_000_000 }),
        fc.integer({ min: 1, max: 500 }).map((k) => k * 1000),
        fc.constantFrom<PlanFrequency>('weekly', 'biweekly', 'monthly'),
        fc.integer({ min: 0, max: 400 }),
        (base, amount, frequency, offset) => {
          const first = addDays(today, offset);
          const result = buildPaymentPlan({ base, amount, frequency, firstDueDate: first }, today);
          if (!result.ok) throw new Error(result.error.code);
          const items = result.value;
          expect(items.reduce((s, i) => s + i.amount, 0)).toBe(base);
          expect(items.length).toBe(Math.max(1, Math.floor(base / amount)));
          for (const [i, item] of items.entries()) {
            expect(Number.isSafeInteger(item.amount) && item.amount > 0).toBe(true);
            if (i > 0) {
              expect(item.amount % 1000).toBe(0);
              expect(item.dueDate > items[i - 1]!.dueDate).toBe(true);
            }
          }
          expect(items[0]!.dueDate).toBe(first);
        },
      ),
    );
  });
});

describe('payment-plan: fechas (R3, ADR-0047)', () => {
  const series = (frequency: PlanFrequency, first: string, n = 4) => {
    const dates = [localDate(first)];
    while (dates.length < n) dates.push(nextDueDate(dates.at(-1)!, frequency));
    return dates;
  };

  it('CA-4: hoy 07/11/2026 quincenal → 15/11, 30/11, 15/12, 30/12', () => {
    const first = suggestFirstDueDate('biweekly', today);
    expect(series('biweekly', first)).toEqual(['2026-11-15', '2026-11-30', '2026-12-15', '2026-12-30']);
  });

  it('CA-4: mensual → 30/11, 30/12, 30/01/2027, 28/02/2027', () => {
    const first = suggestFirstDueDate('monthly', today);
    expect(series('monthly', first)).toEqual(['2026-11-30', '2026-12-30', '2027-01-30', '2027-02-28']);
  });

  it('CA-5: quincenal con primer abono el 28/11 → el siguiente es el 30/11 (sin separación mínima)', () => {
    expect(nextDueDate(localDate('2026-11-28'), 'biweekly')).toBe('2026-11-30');
  });

  it('hoy 30/11 y quincenal → el primer abono sugerido es el 15/12; mensual → 30/12', () => {
    expect(suggestFirstDueDate('biweekly', localDate('2026-11-30'))).toBe('2026-12-15');
    expect(suggestFirstDueDate('monthly', localDate('2026-11-30'))).toBe('2026-12-30');
  });

  it('febrero: el 30 es el último día (28 o 29); el 31 de un mes nunca es día de pago', () => {
    expect(nextDueDate(localDate('2027-02-15'), 'biweekly')).toBe('2027-02-28');
    expect(nextDueDate(localDate('2028-02-15'), 'biweekly')).toBe('2028-02-29');
    expect(nextDueDate(localDate('2027-02-28'), 'biweekly')).toBe('2027-03-15');
    expect(nextDueDate(localDate('2026-12-30'), 'biweekly')).toBe('2027-01-15');
    expect(nextDueDate(localDate('2026-12-31'), 'monthly')).toBe('2027-01-30');
  });

  it('semanal: hoy + 7 y luego cada 7 días', () => {
    expect(suggestFirstDueDate('weekly', today)).toBe('2026-11-14');
    expect(series('weekly', '2026-11-14', 3)).toEqual(['2026-11-14', '2026-11-21', '2026-11-28']);
  });

  it('el plan arma las fechas desde el primer abono', () => {
    const result = plan(90_000, 30_000, 'monthly', '2026-11-30');
    expect(result.ok && result.value.map((i) => i.dueDate)).toEqual([
      '2026-11-30',
      '2026-12-30',
      '2027-01-30',
    ]);
  });
});

describe('payment-plan: base y ids', () => {
  it('R1: replace_all usa lo que falta pagar; unscheduled_only, lo sin programar', () => {
    const account = { remaining: 100_000, unscheduled: 60_000 };
    expect(planBase(account, 'replace_all')).toBe(100_000);
    expect(planBase(account, 'unscheduled_only')).toBe(60_000);
  });

  it('withPaymentIds: un id por abono', () => {
    let n = 0;
    expect(withPaymentIds([{ dueDate: today, amount: 1_000 }], () => `p${++n}`)).toEqual([
      { paymentId: 'p1', dueDate: today, amount: 1_000 },
    ]);
  });
});
