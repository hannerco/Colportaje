import {
  compareAppUsers,
  validateAuthorizeEmail,
  type AppUser,
  type AuthorizeEmailInput,
} from '@/domain/app-user';
import type { AppError } from '@/domain/shared/errors';
import { ok, type Result } from '@/domain/shared/result';
import type { Connectivity, UserAdminRepository } from '@/repositories';
import { runMutation } from '../../shared/run-mutation';

export type UsersDeps = { readonly users: UserAdminRepository; readonly connectivity: Connectivity };

/** Todos los usuarios con su estado, Pendientes primero (BR-USR-07). */
export async function listUsers(deps: Pick<UsersDeps, 'users'>): Promise<Result<AppUser[], AppError>> {
  const result = await deps.users.list();
  return result.ok ? ok([...result.value].sort(compareAppUsers)) : result;
}

/** «Autorizar correo» (BR-USR-05, ronda 34). Errores: `OFFLINE`, `VALIDATION`, `CONFLICT`, `FORBIDDEN`. */
export function authorizeEmail(deps: UsersDeps, input: AuthorizeEmailInput): Promise<Result<void, AppError>> {
  return runMutation(deps.connectivity, async () => {
    const valid = validateAuthorizeEmail(input);
    if (!valid.ok) return valid;
    return deps.users.authorize(valid.value);
  });
}

/** Quitar un correo Pendiente (nunca entró). Errores: `OFFLINE`, `NOT_FOUND`, `FORBIDDEN`. */
export function removePendingEmail(deps: UsersDeps, email: string): Promise<Result<void, AppError>> {
  return runMutation(deps.connectivity, () => deps.users.removePending(email));
}

/** Desactivar o reactivar (BR-USR-07). Errores: `OFFLINE`, `VALIDATION` (a sí mismo), `NOT_FOUND`, `FORBIDDEN`. */
export function setUserActive(
  deps: UsersDeps,
  input: { userId: string; active: boolean },
): Promise<Result<void, AppError>> {
  return runMutation(deps.connectivity, () => deps.users.setActive(input.userId, input.active));
}
