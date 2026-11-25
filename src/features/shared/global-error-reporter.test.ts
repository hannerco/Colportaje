import { describe, expect, it } from 'vitest';
import { isServiceWorkerRegistrationFailure } from './global-error-reporter';

describe('errores que no se avisan (2026-11-25)', () => {
  it('no poder registrar el service worker solo se registra', () => {
    const error = new Error(
      "Failed to register a ServiceWorker for scope ('https://x.vercel.app/') with script ('https://x.vercel.app/serwist/sw.js'): The script resource is behind a redirect, which is disallowed.",
    );
    expect(isServiceWorkerRegistrationFailure(error)).toBe(true);
  });

  it('cualquier otro error sí se avisa', () => {
    expect(isServiceWorkerRegistrationFailure(new Error('Network request failed'))).toBe(false);
    expect(isServiceWorkerRegistrationFailure(undefined)).toBe(false);
  });
});
