import { AUTH_ERROR_CODES } from '@/domain/auth';
import { appError, COMMON_ERROR_CODES, type AppError } from '@/domain/shared/errors';
import { err, ok, type Result } from '@/domain/shared/result';
import type { AuthRepository, Connectivity, ProfileRepository } from '@/repositories';

export type SignInDeps = {
  readonly auth: AuthRepository;
  readonly profiles: ProfileRepository;
  readonly connectivity: Connectivity;
};

/**
 * Inicia sesión con correo y contraseña (BR-USR-02).
 * Errores: `OFFLINE` (sin intentar), `INVALID_CREDENTIALS`, `USER_INACTIVE` (queda sin sesión, R3).
 */
export async function signIn(
  deps: SignInDeps,
  input: { email: string; password: string },
): Promise<Result<void, AppError>> {
  if (!deps.connectivity.isOnline()) return err(appError(COMMON_ERROR_CODES.OFFLINE));

  const signedIn = await deps.auth.signIn({ email: input.email.trim(), password: input.password });
  if (!signedIn.ok) return signedIn;

  const profile = await deps.profiles.getCurrentProfile();
  if (!profile.ok) {
    await deps.auth.signOut();
    return profile;
  }
  if (!profile.value.isActive) {
    await deps.auth.signOut();
    return err(appError(AUTH_ERROR_CODES.USER_INACTIVE));
  }
  return ok(undefined);
}
