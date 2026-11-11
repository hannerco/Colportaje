import { describe, expect, it } from 'vitest';
import { formatCOP, isValidCOP, parseCOP } from './money';

describe('money', () => {
  it('CA-3: formatCOP(1250000) da "$1.250.000"', () => {
    expect(formatCOP(1_250_000)).toBe('$1.250.000');
  });

  it('formatCOP: cero, menos de mil, millones y negativos con signo menos tipográfico', () => {
    expect(formatCOP(0)).toBe('$0');
    expect(formatCOP(999)).toBe('$999');
    expect(formatCOP(1000)).toBe('$1.000');
    expect(formatCOP(12_345_678)).toBe('$12.345.678');
    expect(formatCOP(-5000)).toBe('−$5.000');
  });

  it('formatCOP rechaza valores que no son pesos enteros (error de programación)', () => {
    expect(() => formatCOP(12.5)).toThrow(RangeError);
    expect(() => formatCOP(Number.NaN)).toThrow(RangeError);
  });

  it('CA-3: parseCOP acepta "$1.250.000", "1.250.000" y "1250000"', () => {
    expect(parseCOP('$1.250.000')).toEqual({ ok: true, value: 1_250_000 });
    expect(parseCOP('1.250.000')).toEqual({ ok: true, value: 1_250_000 });
    expect(parseCOP('1250000')).toEqual({ ok: true, value: 1_250_000 });
    expect(parseCOP('  $ 5.000 ')).toEqual({ ok: true, value: 5000 });
    expect(parseCOP('0')).toEqual({ ok: true, value: 0 });
  });

  it('CA-3: parseCOP("12,5") da error de validación', () => {
    const result = parseCOP('12,5');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION');
      expect(result.error.details?.field).toBe('amount');
    }
  });

  it.each([
    '',
    '   ',
    '$',
    '1.25',
    '12.5000',
    '1.2.3',
    '-5000',
    '1e6',
    'abc',
    '5.000,00',
    '99999999999999999',
  ])('parseCOP rechaza %j', (text) => {
    expect(parseCOP(text).ok).toBe(false);
  });

  it('isValidCOP: entero seguro ≥ 0', () => {
    expect(isValidCOP(0)).toBe(true);
    expect(isValidCOP(1_250_000)).toBe(true);
    expect(isValidCOP(-1)).toBe(false);
    expect(isValidCOP(1.5)).toBe(false);
    expect(isValidCOP(Number.MAX_SAFE_INTEGER + 1)).toBe(false);
  });
});
