import { describe, expect, it, vi } from 'vitest';
import { ok } from '@/domain/shared/result';
import { googleErrorFromUrl, signInWithGoogle } from './sign-in-with-google';

describe('googleErrorFromUrl (#41)', () => {
  it('sin error no hay nada que mostrar', () => {
    expect(googleErrorFromUrl('?code=abc')).toBeNull();
  });

  it('el gancho que rechaza un correo no autorizado se lee como «sin acceso»', () => {
    expect(
      googleErrorFromUrl('?error=server_error&error_description=Este+correo+no+tiene+acceso+a+Colportor.'),
    ).toBe('no-access');
    expect(
      googleErrorFromUrl('#error=access_denied&error_description=Signups+not+allowed+for+this+instance'),
    ).toBe('no-access');
  });

  it('otro error se muestra como un fallo para reintentar', () => {
    expect(googleErrorFromUrl('?error=server_error&error_description=Unexpected+failure')).toBe('failed');
  });
});

describe('signInWithGoogle (#41)', () => {
  it('sin conexión no sale a Google', async () => {
    const auth = { signInWithGoogle: vi.fn() };
    const result = await signInWithGoogle(
      { auth: auth as never, connectivity: { isOnline: () => false } as never },
      'https://app/entrar',
    );
    expect(result.ok).toBe(false);
    expect(auth.signInWithGoogle).not.toHaveBeenCalled();
  });

  it('con conexión va a Google con la dirección de vuelta', async () => {
    const auth = { signInWithGoogle: vi.fn(async () => ok(undefined)) };
    await signInWithGoogle(
      { auth: auth as never, connectivity: { isOnline: () => true } as never },
      'https://app/entrar',
    );
    expect(auth.signInWithGoogle).toHaveBeenCalledWith('https://app/entrar');
  });
});
