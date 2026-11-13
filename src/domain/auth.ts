import type { TimeFormat } from './time';

/** Perfil del usuario actual tal como lo usa la app (HU-BASE-03, BR-USR-08). */
export type Profile = {
  readonly id: string;
  readonly fullName: string;
  readonly timeFormat: TimeFormat;
  /** Tiene el rol admin y está activo (igual que `is_admin()` en la base de datos). */
  readonly isAdmin: boolean;
  readonly isActive: boolean;
};

export const AUTH_ERROR_CODES = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  /** BR-USR-07: un usuario desactivado no puede entrar. */
  USER_INACTIVE: 'USER_INACTIVE',
} as const;

export const toProfile = (input: {
  id: string;
  fullName: string;
  timeFormat: TimeFormat;
  isActive: boolean;
  roles: readonly string[];
}): Profile => ({
  id: input.id,
  fullName: input.fullName,
  timeFormat: input.timeFormat,
  isActive: input.isActive,
  isAdmin: input.isActive && input.roles.includes('admin'),
});

/** Estado de la sesión que ve el front (`useSession`). */
export type SessionStatus = 'loading' | 'signed_in' | 'signed_out' | 'expired';

export type SessionState = { readonly status: SessionStatus; readonly userId?: string };

export type SessionEvent =
  /** Lo que había guardado al abrir la app. */
  | { readonly type: 'initial'; readonly userId: string | null }
  | { readonly type: 'signed_in'; readonly userId: string }
  /** `requested`: el usuario (o la app, p. ej. por usuario inactivo) pidió cerrar la sesión. */
  | { readonly type: 'signed_out'; readonly requested: boolean };

export const INITIAL_SESSION_STATE: SessionState = { status: 'loading' };

/**
 * AF-83: si la sesión se pierde sin que nadie la haya cerrado (el token venció y no se pudo renovar),
 * el estado es `expired`, no `signed_out`, para que la app conserve lo guardado y lleve al login.
 */
export const nextSessionState = (state: SessionState, event: SessionEvent): SessionState => {
  switch (event.type) {
    case 'initial':
      if (state.status !== 'loading') return state;
      return event.userId === null ? { status: 'signed_out' } : { status: 'signed_in', userId: event.userId };
    case 'signed_in':
      return { status: 'signed_in', userId: event.userId };
    case 'signed_out':
      if (event.requested) return { status: 'signed_out' };
      return state.status === 'signed_in' || state.status === 'expired'
        ? { status: 'expired' }
        : { status: 'signed_out' };
  }
};
