import { describe, expect, it, vi } from 'vitest';
import { appError } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import { fakeConnectivity } from '../../../tests/support/fake-connectivity';
import { isNetworkFailure, runMutation } from './run-mutation';

describe('runMutation (HU-BASE-06)', () => {
  it('R1 / CA-2: sin conexión devuelve OFFLINE y no ejecuta la acción', async () => {
    const action = vi.fn(async () => ok('hecho'));
    expect(await runMutation(fakeConnectivity(false), action)).toEqual(err(appError('OFFLINE')));
    expect(action).not.toHaveBeenCalled();
  });

  it('con conexión devuelve el resultado de la acción, sea éxito o error de negocio', async () => {
    expect(await runMutation(fakeConnectivity(true), async () => ok(5))).toEqual(ok(5));
    expect(await runMutation(fakeConnectivity(true), async () => err(appError('NOT_FOUND')))).toEqual(
      err(appError('NOT_FOUND')),
    );
  });

  it('si la red falla a mitad, devuelve NETWORK_ERROR reintentable', async () => {
    const result = await runMutation(fakeConnectivity(true), async () => {
      throw new TypeError('Failed to fetch');
    });
    expect(result).toEqual({ ok: false, error: { code: 'NETWORK_ERROR', retryable: true } });
  });

  it('2026-11-25: si la acción no responde a tiempo, devuelve TIMEOUT reintentable (no se queda cargando)', async () => {
    vi.useFakeTimers();
    try {
      const pending = runMutation(fakeConnectivity(true), () => new Promise<never>(() => {}), 45_000);
      await vi.advanceTimersByTimeAsync(45_000);
      expect(await pending).toEqual({ ok: false, error: { code: 'TIMEOUT', retryable: true } });
    } finally {
      vi.useRealTimers();
    }
  });

  it('una acción que responde a tiempo no queda con el reloj puesto', async () => {
    vi.useFakeTimers();
    try {
      expect(await runMutation(fakeConnectivity(true), async () => ok(1), 45_000)).toEqual(ok(1));
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('un error inesperado que no es de red se relanza', async () => {
    await expect(
      runMutation(fakeConnectivity(true), async () => {
        throw new Error('bug');
      }),
    ).rejects.toThrow('bug');
  });

  it('clasifica como fallo de red los errores típicos de fetch en navegadores y Node', () => {
    expect(isNetworkFailure(new TypeError('Failed to fetch'))).toBe(true); // Chrome
    expect(isNetworkFailure(new TypeError('Load failed'))).toBe(true); // Safari
    expect(isNetworkFailure(new Error('TypeError: fetch failed'))).toBe(true); // Node
    expect(isNetworkFailure(new Error('NetworkError when attempting to fetch resource.'))).toBe(true); // Firefox
    expect(isNetworkFailure(new Error('violación de regla'))).toBe(false);
    expect(isNetworkFailure('texto')).toBe(false);
  });
});
