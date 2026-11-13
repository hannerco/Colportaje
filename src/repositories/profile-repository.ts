import type { Profile } from '@/domain/auth';
import type { AppError } from '@/domain/shared/errors';
import type { Result } from '@/domain/shared/result';

export interface ProfileRepository {
  /** Perfil del usuario de la sesión. Errores: `SESSION_EXPIRED`, `NOT_FOUND`, `NETWORK_ERROR`. */
  getCurrentProfile(): Promise<Result<Profile, AppError>>;
}
