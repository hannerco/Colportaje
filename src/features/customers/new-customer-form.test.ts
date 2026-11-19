import { describe, expect, it } from 'vitest';
import { suggestFirstDueDate } from '@/domain/payment-plan';
import { localDate } from '@/domain/time';
import { planPreview } from './new-customer-form';

const today = localDate('2026-11-17');
const base = { debt: 240000, downPayment: null, frequency: 'biweekly' as const, today };

describe('vista previa del plan de abonos (HU-PAN-CLI-03)', () => {
  it('CA-3: deuda $240.000, quincenal y $60.000 → 4 abonos en días 15 y 30 desde el siguiente día de pago', () => {
    const firstDueDate = suggestFirstDueDate('biweekly', today);
    const preview = planPreview({ ...base, amount: 60000, firstDueDate });
    expect(preview.items?.map((i) => [i.dueDate, i.amount])).toEqual([
      ['2026-11-30', 60000],
      ['2026-12-15', 60000],
      ['2026-12-30', 60000],
      ['2027-01-15', 60000],
    ]);
    // Al cambiar a $80.000, 3 abonos.
    expect(planPreview({ ...base, amount: 80000, firstDueDate }).items).toHaveLength(3);
  });

  it('la cuota inicial escrita baja la base al instante', () => {
    const preview = planPreview({
      ...base,
      downPayment: 40000,
      amount: 50000,
      firstDueDate: localDate('2026-11-30'),
    });
    expect(preview.base).toBe(200000);
    expect(preview.items?.reduce((sum, i) => sum + i.amount, 0)).toBe(200000);
  });

  it('CA-4: un primer abono el 01/11/2026 con hoy 17/11/2026 se marca como pasado y se permite', () => {
    // 01/11, 15/11 (también pasada) y 30/11.
    const preview = planPreview({ ...base, amount: 80000, firstDueDate: localDate('2026-11-01') });
    expect(preview.items?.map((i) => [i.dueDate, i.past])).toEqual([
      ['2026-11-01', true],
      ['2026-11-15', true],
      ['2026-11-30', false],
    ]);
  });

  it('sin valor, sin primer abono o sin saldo no hay lista; un valor que no es múltiplo de 1.000 se marca', () => {
    expect(planPreview({ ...base, amount: null, firstDueDate: today }).items).toBeNull();
    expect(planPreview({ ...base, amount: 60000, firstDueDate: null }).items).toBeNull();
    expect(planPreview({ ...base, debt: 0, amount: 60000, firstDueDate: today })).toEqual({
      base: 0,
      items: null,
      amountInvalid: false,
    });
    expect(planPreview({ ...base, amount: 35500, firstDueDate: today }).amountInvalid).toBe(true);
  });
});
