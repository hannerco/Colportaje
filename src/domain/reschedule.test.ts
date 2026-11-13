import { describe, expect, it } from 'vitest';
import { rescheduleConfirmLimit, validateReschedule } from './reschedule';
import { localDate } from './time';

const today = localDate('2026-11-05');
const check = (current: string, next: string, confirmed?: boolean) =>
  validateReschedule({ currentDueDate: localDate(current), newDueDate: localDate(next), today, confirmed });

describe('reschedule: límite de confirmación (OQ-31)', () => {
  it('hoy + 2 meses calendario; 31/12 + 2 meses = 28/02', () => {
    expect(rescheduleConfirmLimit(today)).toBe('2027-01-05');
    expect(rescheduleConfirmLimit(localDate('2026-12-31'))).toBe('2027-02-28');
    expect(rescheduleConfirmLimit(localDate('2027-12-31'))).toBe('2028-02-29');
  });
});

describe('reschedule: validación (BR-PAY-06)', () => {
  it('CA-1: un abono vencido del 17/10 se prorroga al 15/11', () => {
    expect(check('2026-10-17', '2026-11-15')).toEqual({ ok: true, value: '2026-11-15' });
  });

  it('CA-3: del 30/11 al 20/11 → DATE_NOT_LATER; a la misma fecha también', () => {
    expect(check('2026-11-30', '2026-11-20')).toEqual({
      ok: false,
      error: { code: 'DATE_NOT_LATER', retryable: false },
    });
    expect(check('2026-11-30', '2026-11-30')).toMatchObject({ ok: false, error: { code: 'DATE_NOT_LATER' } });
  });

  it('R2: una fecha anterior a hoy → DATE_IN_PAST (aunque sea posterior a la actual)', () => {
    expect(check('2026-10-01', '2026-11-04')).toEqual({
      ok: false,
      error: { code: 'DATE_IN_PAST', retryable: false },
    });
    expect(check('2026-10-01', '2026-11-05').ok).toBe(true);
  });

  it('CA-4: al 10/01/2027 sin confirmar → RESCHEDULE_NEEDS_CONFIRMATION con la fecha; confirmado se acepta; 05/01 no pide', () => {
    expect(check('2026-11-30', '2027-01-10')).toEqual({
      ok: false,
      error: { code: 'RESCHEDULE_NEEDS_CONFIRMATION', retryable: false, details: { dates: ['2027-01-10'] } },
    });
    expect(check('2026-11-30', '2027-01-10', true)).toEqual({ ok: true, value: '2027-01-10' });
    expect(check('2026-11-30', '2027-01-05')).toEqual({ ok: true, value: '2027-01-05' });
  });

  it('sin la fecha actual solo valida hoy y el límite (la base revisa lo demás)', () => {
    expect(validateReschedule({ newDueDate: localDate('2026-11-06'), today })).toEqual({
      ok: true,
      value: '2026-11-06',
    });
  });

  it('un vencido puede ir muy lejos de su fecha original si se confirma', () => {
    expect(check('2026-06-01', '2027-06-01', true).ok).toBe(true);
  });
});
