import { describe, expect, it } from 'vitest';
import { validateReschedule } from './reschedule';
import { localDate } from './time';

const check = (current: string | undefined, next: string) =>
  validateReschedule({
    currentDueDate: current ? localDate(current) : undefined,
    newDueDate: localDate(next),
  });

describe('aplazar (BR-PAY-06, ronda 38): cualquier fecha, sin confirmar', () => {
  it('hacia adelante, hacia atrás, antes de hoy y a más de 2 meses se acepta', () => {
    expect(check('2026-11-30', '2026-12-15')).toEqual({ ok: true, value: '2026-12-15' });
    expect(check('2026-11-30', '2026-11-20')).toEqual({ ok: true, value: '2026-11-20' });
    expect(check('2026-11-30', '2026-10-01')).toEqual({ ok: true, value: '2026-10-01' });
    expect(check('2026-11-30', '2027-06-30')).toEqual({ ok: true, value: '2027-06-30' });
  });

  it('a la misma fecha no cambia nada → VALIDATION', () => {
    expect(check('2026-11-30', '2026-11-30')).toMatchObject({ ok: false, error: { code: 'VALIDATION' } });
  });

  it('sin la fecha actual, la base decide', () => {
    expect(check(undefined, '2026-11-06')).toEqual({ ok: true, value: '2026-11-06' });
  });
});
