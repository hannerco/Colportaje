import { describe, expect, it } from 'vitest';
import { appError, COMMON_ERROR_CODES, validationError } from './errors';
import { err, ok } from './result';

describe('result', () => {
  it('ok() envuelve un valor y err() un error', () => {
    expect(ok(5)).toEqual({ ok: true, value: 5 });
    expect(err('X')).toEqual({ ok: false, error: 'X' });
  });
});

describe('errors', () => {
  it('NETWORK_ERROR es reintentable; los demás códigos comunes no', () => {
    expect(appError(COMMON_ERROR_CODES.NETWORK_ERROR).retryable).toBe(true);
    for (const code of Object.values(COMMON_ERROR_CODES).filter((c) => c !== 'NETWORK_ERROR')) {
      expect(appError(code).retryable).toBe(false);
    }
  });

  it('un código propio de una HU no es reintentable y conserva sus detalles', () => {
    expect(appError('COPY_NOT_IN_STOCK', { copyId: 'a' })).toEqual({
      code: 'COPY_NOT_IN_STOCK',
      retryable: false,
      details: { copyId: 'a' },
    });
  });

  it('sin detalles no incluye la propiedad details', () => {
    expect(appError('OFFLINE')).toEqual({ code: 'OFFLINE', retryable: false });
  });

  it('VALIDATION lleva el campo en details.field', () => {
    expect(validationError('amount', { reason: 'not_integer' })).toEqual({
      code: 'VALIDATION',
      retryable: false,
      details: { reason: 'not_integer', field: 'amount' },
    });
  });
});
