import { describe, expect, it } from 'vitest';
import { validateScheduled } from './scheduled-payment';
import { localDate } from './time';

const today = localDate('2026-11-08');

describe('scheduled-payment (HU-ABO-04)', () => {
  it('CA-2 / BR-PAY-15: a mano se acepta cualquier entero > 0 (35.500), sin múltiplos de 1.000', () => {
    expect(validateScheduled({ agreedAmount: 35_500 }, today)).toEqual({ ok: true, value: undefined });
  });

  it.each([0, -1, 1.5])('R2: el valor %s → VALIDATION en agreedAmount', (agreedAmount) => {
    expect(validateScheduled({ agreedAmount }, today)).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION', details: { field: 'agreedAmount' } },
    });
  });

  it('CA-4 / BR-PAY-16: ayer → VALIDATION en dueDate; hoy y después sí', () => {
    expect(validateScheduled({ dueDate: localDate('2026-11-07') }, today)).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION', details: { field: 'dueDate' } },
    });
    expect(validateScheduled({ dueDate: today }, today).ok).toBe(true);
    expect(validateScheduled({ dueDate: localDate('2026-11-15'), agreedAmount: 50_000 }, today).ok).toBe(
      true,
    );
  });
});
