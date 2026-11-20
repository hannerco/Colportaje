import type { Profile } from '@/domain/auth';
import type { AppError } from '@/domain/shared/errors';
import type { Result } from '@/domain/shared/result';
import type { TimeFormat } from '@/domain/time';

export interface ProfileRepository {
  /** Perfil del usuario de la sesión. Errores: `SESSION_EXPIRED`, `NOT_FOUND`, `NETWORK_ERROR`. */
  getCurrentProfile(): Promise<Result<Profile, AppError>>;
  /** Formato de hora del usuario actual (Ajustes, BR-GEN-07). Errores: `FORBIDDEN`, `NETWORK_ERROR`. */
  updateTimeFormat(format: TimeFormat): Promise<Result<void, AppError>>;
}
