import { describe, expect, it } from 'vitest';
import { validateScheduled } from './scheduled-payment';
import { localDate } from './time';

describe('scheduled-payment (HU-ABO-04)', () => {
  it('CA-2 / BR-PAY-15: a mano se acepta cualquier entero > 0 (35.500), sin múltiplos de 1.000', () => {
    expect(validateScheduled({ agreedAmount: 35_500 })).toEqual({ ok: true, value: undefined });
  });

  it.each([0, -1, 1.5])('R2: el valor %s → VALIDATION en agreedAmount', (agreedAmount) => {
    expect(validateScheduled({ agreedAmount })).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION', details: { field: 'agreedAmount' } },
    });
  });

  it('HU-ABO-08 R1: una fecha anterior a hoy se acepta (el abono nace vencido); también hoy y después', () => {
    expect(validateScheduled({ dueDate: localDate('2026-11-07') }).ok).toBe(true);
    expect(validateScheduled({ dueDate: localDate('2020-01-01'), agreedAmount: 30_000 }).ok).toBe(true);
    expect(validateScheduled({ dueDate: localDate('2026-11-15'), agreedAmount: 50_000 }).ok).toBe(true);
  });
});
