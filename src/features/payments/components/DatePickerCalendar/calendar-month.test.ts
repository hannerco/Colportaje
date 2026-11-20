import { describe, expect, it } from 'vitest';
import { localDate } from '@/domain/time';
import { calendarMonth, moveDay } from './calendar-month';

describe('mes del calendario (HU-PAN-CLI-05)', () => {
  it('CA-4: diciembre de 2026 empieza el domingo 29/11 y trae 6 semanas, como el lienzo', () => {
    const days = calendarMonth(localDate('2026-12-05'));
    expect(days).toHaveLength(42);
    expect(days[0]).toEqual({ date: '2026-11-29', day: 29, inMonth: false });
    expect(days[2]).toEqual({ date: '2026-12-01', day: 1, inMonth: true });
    expect(days.at(-1)).toEqual({ date: '2027-01-09', day: 9, inMonth: false });
  });

  it('CA-4: las flechas mueven un día o una semana; Inicio y Fin, al domingo y al sábado; RePág y AvPág, un mes', () => {
    const d = localDate('2026-12-05'); // sábado
    expect(moveDay(d, 'ArrowRight')).toBe('2026-12-06');
    expect(moveDay(d, 'ArrowLeft')).toBe('2026-12-04');
    expect(moveDay(d, 'ArrowDown')).toBe('2026-12-12');
    expect(moveDay(d, 'ArrowUp')).toBe('2026-11-28');
    expect(moveDay(d, 'Home')).toBe('2026-11-29');
    expect(moveDay(d, 'End')).toBe('2026-12-05');
    expect(moveDay(localDate('2027-01-31'), 'PageDown')).toBe('2027-02-28');
    expect(moveDay(d, 'Tab')).toBeNull();
  });
});
