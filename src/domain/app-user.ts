// Usuarios de la app para Admin · Usuarios (BR-USR-07, ronda 34, #43).
import { validationError, type AppError } from './shared/errors';
import { err, ok, type Result } from './shared/result';
import { compareEs } from './text';

/** Pendiente: el admin autorizó su correo de Google y aún no entra. */
export type AppUserStatus = 'pending' | 'active' | 'inactive';

export type AppUser = {
  /** `null` mientras está Pendiente (todavía no tiene cuenta). */
  readonly userId: string | null;
  readonly email: string;
  readonly fullName: string;
  readonly isAdmin: boolean;
  readonly status: AppUserStatus;
};

export type AuthorizeEmailInput = {
  readonly email: string;
  readonly fullName: string;
  readonly isAdmin: boolean;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Valida «Autorizar correo»: nombre obligatorio y un correo válido (se guarda en minúsculas y sin espacios).
 * Errores: `VALIDATION` con `details.field` (`fullName` o `email`).
 */
export function validateAuthorizeEmail(input: AuthorizeEmailInput): Result<AuthorizeEmailInput, AppError> {
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  if (!fullName) return err(validationError('fullName'));
  if (!EMAIL.test(email)) return err(validationError('email'));
  return ok({ email, fullName, isAdmin: input.isAdmin });
}

const STATUS_ORDER: Record<AppUserStatus, number> = { pending: 0, active: 1, inactive: 2 };

/** Pendientes primero (hay que hacerles seguimiento), luego activos y desactivados; dentro, por nombre. */
export const compareAppUsers = (a: AppUser, b: AppUser): number =>
  STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || compareEs(a.fullName, b.fullName);
