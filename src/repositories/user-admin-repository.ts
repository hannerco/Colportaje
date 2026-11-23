import type { AppUser, AuthorizeEmailInput } from '@/domain/app-user';
import type { AppError } from '@/domain/shared/errors';
import type { Result } from '@/domain/shared/result';

/** Admin · Usuarios (BR-USR-07, ronda 34). Solo un admin activo puede (RLS); el resto recibe `FORBIDDEN`. */
export interface UserAdminRepository {
  list(): Promise<Result<AppUser[], AppError>>;
  /** Autoriza un correo de Google. Errores: `CONFLICT` (ya estaba), `FORBIDDEN`, `NETWORK_ERROR`. */
  authorize(input: AuthorizeEmailInput): Promise<Result<void, AppError>>;
  /** Quita un correo Pendiente (nunca entró). Errores: `NOT_FOUND` (ya entró o no existe), `FORBIDDEN`. */
  removePending(email: string): Promise<Result<void, AppError>>;
  /** Desactiva o reactiva a un usuario que ya entró. Errores: `VALIDATION` (a sí mismo), `NOT_FOUND`, `FORBIDDEN`. */
  setActive(userId: string, active: boolean): Promise<Result<void, AppError>>;
}
