import type { AppError } from '@/domain/shared/errors';
import type { Result } from '@/domain/shared/result';

export type AuthChange =
  | { readonly type: 'signed_in'; readonly userId: string }
  /** `requested`: la sesión se cerró con `signOut()` de este repositorio (no por vencimiento). */
  | { readonly type: 'signed_out'; readonly requested: boolean };

/** Sesión con correo y contraseña (BR-USR-02). */
export interface AuthRepository {
  /** Errores: `INVALID_CREDENTIALS`, `USER_INACTIVE` (bloqueo en Auth), `NETWORK_ERROR`. */
  signIn(input: { email: string; password: string }): Promise<Result<{ userId: string }, AppError>>;
  /**
   * Entrar con Google (ronda 34, #41): lleva a Google y vuelve a `redirectTo`; la sesión se abre al volver. Solo entran
   * los correos que autorizó el admin (gancho de Auth). Errores: `NETWORK_ERROR`.
   */
  signInWithGoogle(redirectTo: string): Promise<Result<void, AppError>>;
  signOut(): Promise<Result<void, AppError>>;
  /** Usuario de la sesión guardada en el dispositivo, o `null`. */
  getCurrentUserId(): Promise<string | null>;
  onAuthChange(listener: (change: AuthChange) => void): () => void;
}
