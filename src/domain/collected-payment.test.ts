import { describe, expect, it } from 'vitest';
import { creationDownPaymentAmount, DEFAULT_PAY_METHOD, validateCollected } from './collected-payment';
import { localDate } from './time';

const today = localDate('2026-11-08');

describe('collected-payment (HU-ABO-02)', () => {
  it('BR-PAY-04: el método por defecto es Transferencia', () => {
    expect(DEFAULT_PAY_METHOD).toBe('transfer');
  });

  it('un valor entero > 0 con fecha de hoy o pasada es válido', () => {
    expect(validateCollected({ paidAmount: 20_000, paidAt: today }, today)).toEqual({
      ok: true,
      value: undefined,
    });
    expect(validateCollected({ paidAt: localDate('2026-10-01') }, today).ok).toBe(true);
    expect(validateCollected({}, today).ok).toBe(true);
  });

  it.each([0, -1, 12.5])('R1: el valor %s → VALIDATION en paidAmount', (paidAmount) => {
    expect(validateCollected({ paidAmount }, today)).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION', details: { field: 'paidAmount' } },
    });
  });

  it('CA-7: una fecha real de mañana → VALIDATION en paidAt', () => {
    expect(validateCollected({ paidAt: localDate('2026-11-09') }, today)).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION', details: { field: 'paidAt' } },
    });
  });

  it('cuota inicial de la ficha nueva: vacío o 0 borra; > 0 se guarda; otro valor no', () => {
    expect(creationDownPaymentAmount(null)).toEqual({ ok: true, value: 0 });
    expect(creationDownPaymentAmount(undefined)).toEqual({ ok: true, value: 0 });
    expect(creationDownPaymentAmount(0)).toEqual({ ok: true, value: 0 });
    expect(creationDownPaymentAmount(40_000)).toEqual({ ok: true, value: 40_000 });
    expect(creationDownPaymentAmount(-5)).toMatchObject({
      ok: false,
      error: { details: { field: 'paidAmount' } },
    });
  });
});
