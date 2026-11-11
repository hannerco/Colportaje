import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonthsClamped,
  daysBetween,
  fixedClock,
  formatDate,
  formatTime,
  lastDayOfMonth,
  localDate,
  parseLocalDate,
  startOfWeek,
  todayBogota,
} from './time';

const d = localDate;

describe('time', () => {
  describe('todayBogota', () => {
    it('CA-1: el instante 2026-11-08T04:30:00Z (23:30 del 07/11 en Bogotá) es 2026-11-07', () => {
      expect(todayBogota(fixedClock('2026-11-08T04:30:00Z'))).toBe('2026-11-07');
    });

    it('BR-GEN-05: a las 00:00 de Bogotá (05:00Z) ya es el día siguiente', () => {
      expect(todayBogota(fixedClock('2026-11-08T04:59:59Z'))).toBe('2026-11-07');
      expect(todayBogota(fixedClock('2026-11-08T05:00:00Z'))).toBe('2026-11-08');
    });

    it('BR-GEN-05: el cambio de año se calcula en Bogotá, no en UTC', () => {
      expect(todayBogota(fixedClock('2027-01-01T03:00:00Z'))).toBe('2026-12-31');
    });
  });

  describe('addMonthsClamped', () => {
    it('CA-2: 2027-01-31 + 1 mes = 2027-02-28', () => {
      expect(addMonthsClamped(d('2027-01-31'), 1)).toBe('2027-02-28');
    });

    it('respeta los bisiestos, cruza el año y acepta meses negativos', () => {
      expect(addMonthsClamped(d('2028-01-31'), 1)).toBe('2028-02-29');
      expect(addMonthsClamped(d('2026-12-31'), 2)).toBe('2027-02-28');
      expect(addMonthsClamped(d('2026-11-15'), 14)).toBe('2028-01-15');
      expect(addMonthsClamped(d('2027-03-31'), -1)).toBe('2027-02-28');
      expect(addMonthsClamped(d('2027-01-15'), -1)).toBe('2026-12-15');
    });
  });

  describe('addDays y daysBetween', () => {
    it('suman y restan cruzando meses y años', () => {
      expect(addDays(d('2026-12-30'), 3)).toBe('2027-01-02');
      expect(addDays(d('2026-03-01'), -1)).toBe('2026-02-28');
      expect(daysBetween(d('2026-11-01'), d('2026-11-15'))).toBe(14);
      expect(daysBetween(d('2026-11-15'), d('2026-11-01'))).toBe(-14);
      expect(daysBetween(d('2026-12-31'), d('2027-01-01'))).toBe(1);
    });
  });

  describe('lastDayOfMonth', () => {
    it('da el último día, incluido febrero bisiesto', () => {
      expect(lastDayOfMonth(d('2026-11-08'))).toBe('2026-11-30');
      expect(lastDayOfMonth(d('2027-02-10'))).toBe('2027-02-28');
      expect(lastDayOfMonth(d('2028-02-10'))).toBe('2028-02-29');
      expect(lastDayOfMonth(d('2026-12-01'))).toBe('2026-12-31');
    });
  });

  describe('startOfWeek', () => {
    it('BR-GEN-07: la semana empieza el domingo (miércoles 2026-11-04 → 2026-11-01)', () => {
      expect(startOfWeek(d('2026-11-04'))).toBe('2026-11-01');
    });

    it('BR-GEN-07: un domingo es su propio inicio y un sábado vuelve al domingo anterior', () => {
      expect(startOfWeek(d('2026-11-01'))).toBe('2026-11-01');
      expect(startOfWeek(d('2026-11-07'))).toBe('2026-11-01');
      expect(startOfWeek(d('2027-01-02'))).toBe('2026-12-27');
    });
  });

  describe('formatDate', () => {
    it('BR-GEN-07: dd/mm/aaaa', () => {
      expect(formatDate(d('2026-11-07'))).toBe('07/11/2026');
    });
  });

  describe('formatTime', () => {
    const at = (iso: string) => new Date(iso);

    it('BR-GEN-07: 12 h por defecto con a. m./p. m. en hora de Bogotá', () => {
      expect(formatTime(at('2026-11-08T02:40:00Z'))).toBe('9:40 p. m.');
      expect(formatTime(at('2026-11-08T02:40:00Z'), '12h')).toBe('9:40 p. m.');
    });

    it('BR-GEN-07: 24 h', () => {
      expect(formatTime(at('2026-11-08T02:40:00Z'), '24h')).toBe('21:40');
      expect(formatTime(at('2026-11-08T14:05:00Z'), '24h')).toBe('09:05');
    });

    it('medianoche y mediodía en 12 h', () => {
      expect(formatTime(at('2026-11-08T05:00:00Z'))).toBe('12:00 a. m.');
      expect(formatTime(at('2026-11-08T17:00:00Z'))).toBe('12:00 p. m.');
      expect(formatTime(at('2026-11-08T05:00:00Z'), '24h')).toBe('00:00');
    });
  });

  describe('parseLocalDate y localDate', () => {
    it('aceptan días reales', () => {
      expect(parseLocalDate('2028-02-29')).toEqual({ ok: true, value: '2028-02-29' });
    });

    it.each([
      '2027-02-29',
      '2026-13-01',
      '2026-00-10',
      '2026-11-00',
      '2026-11-31',
      '07/11/2026',
      '2026-1-1',
      '',
    ])('rechazan %j con VALIDATION', (text) => {
      const result = parseLocalDate(text);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatchObject({ code: 'VALIDATION', details: { field: 'date' } });
      expect(() => localDate(text)).toThrow(RangeError);
    });
  });
});
