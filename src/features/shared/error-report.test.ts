import { afterEach, describe, expect, it, vi } from 'vitest';
import { appError } from '@/domain/shared/errors';
import { AppFailure } from './app-failure';
import { ERROR_REPORT_URL, errorToast, reportError } from './error-report';

describe('reporte de errores (#104)', () => {
  afterEach(() => vi.unstubAllGlobals());

  const stubBrowser = () => {
    const sendBeacon = vi.fn(() => true);
    vi.stubGlobal('window', { location: { pathname: '/clientes/abc' } });
    vi.stubGlobal('navigator', { onLine: true, sendBeacon });
    return sendBeacon;
  };

  it('el aviso dice qué pasó y, debajo, el código y una referencia corta para reportarlo', () => {
    stubBrowser();
    const toast = errorToast(new AppFailure(appError('NETWORK_ERROR')));
    expect(toast.tone).toBe('error');
    expect(toast.message).toBe('No se pudo conectar. Vuelve a intentarlo.');
    expect(toast.detail).toMatch(/^Código NETWORK_ERROR · ref\. [2-9A-HJ-NP-Z]{4}$/);
  });

  it('registra el código, dónde pasó y cuándo, sin datos de clientes', async () => {
    const sendBeacon = stubBrowser();
    const { code, ref } = reportError(appError('PAYMENT_LOCKED'));
    expect(code).toBe('PAYMENT_LOCKED');
    expect(sendBeacon).toHaveBeenCalledWith(ERROR_REPORT_URL, expect.any(Blob));
    const body = JSON.parse(await (sendBeacon.mock.calls[0] as unknown as [string, Blob])[1].text());
    expect(body).toMatchObject({ ref, code: 'PAYMENT_LOCKED', where: '/clientes/abc', online: true });
    expect(Object.keys(body).sort()).toEqual(['at', 'code', 'online', 'ref', 'where']);
  });

  it('un error cualquiera (no del back) se registra como UNEXPECTED', () => {
    stubBrowser();
    expect(reportError(new Error('x')).code).toBe('UNEXPECTED');
  });
});
