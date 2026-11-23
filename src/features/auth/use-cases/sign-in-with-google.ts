import type { AppError } from '@/domain/shared/errors';
import type { Result } from '@/domain/shared/result';
import type { AuthRepository, Connectivity } from '@/repositories';
import { runMutation } from '../../shared/run-mutation';

/**
 * Entrar con Google (ronda 34, #41): sale a Google y vuelve a `redirectTo`, donde la sesión se abre sola. Si el correo
 * no está autorizado, Google vuelve con el error en la dirección (`noAccessFromUrl`). Errores: `OFFLINE`,
 * `NETWORK_ERROR`.
 */
export function signInWithGoogle(
  deps: { readonly auth: AuthRepository; readonly connectivity: Connectivity },
  redirectTo: string,
): Promise<Result<void, AppError>> {
  return runMutation(deps.connectivity, () => deps.auth.signInWithGoogle(redirectTo));
}

/**
 * Lee el error con el que vuelve Google (`?error=…&error_description=…`). `no-access`: el correo no está autorizado
 * (lo rechazó el gancho de Auth o el registro está cerrado); `failed`: otro problema; `null`: no hubo error.
 */
export function googleErrorFromUrl(search: string): 'no-access' | 'failed' | null {
  const params = new URLSearchParams(search.startsWith('#') ? search.slice(1) : search);
  const error = params.get('error') ?? params.get('error_code');
  if (!error) return null;
  const text = `${params.get('error_description') ?? ''} ${params.get('error_code') ?? ''}`.toLowerCase();
  return /no tiene acceso|not allowed|signup|sign up|disabled|access_denied|hook/.test(text)
    ? 'no-access'
    : 'failed';
}
