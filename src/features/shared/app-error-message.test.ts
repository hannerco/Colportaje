import { describe, expect, it } from 'vitest';
import { appError, validationError } from '@/domain/shared/errors';
import { AppFailure } from './app-failure';
import { appErrorMessage } from './app-error-message';

describe('appErrorMessage (HU-PAN-BASE-01)', () => {
  it('traduce el código y dice si se reintenta', () => {
    expect(appErrorMessage(appError('NETWORK_ERROR'))).toEqual({
      message: 'No se pudo conectar. Vuelve a intentarlo.',
      retryable: true,
    });
    expect(appErrorMessage(appError('PAYMENT_LOCKED'))).toEqual({
      message: 'Este cobro ya se entregó al líder y no se puede cambiar.',
      retryable: false,
    });
  });

  it('VALIDATION trae el campo afectado', () => {
    expect(appErrorMessage(validationError('paidOn'))).toMatchObject({ field: 'paidOn', retryable: false });
  });

  it('lee el AppFailure de una lectura', () => {
    expect(appErrorMessage(new AppFailure(appError('OFFLINE'))).message).toBe(
      'Sin conexión: puedes consultar, pero no registrar.',
    );
  });

  it('un código sin texto o algo que no es AppError da el texto genérico', () => {
    expect(appErrorMessage(appError('SOMETHING_NEW')).message).toBe('Algo salió mal. Vuelve a intentarlo.');
    expect(appErrorMessage(new Error('boom'))).toEqual({
      message: 'Algo salió mal. Vuelve a intentarlo.',
      retryable: true,
    });
  });
});
