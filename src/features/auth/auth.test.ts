import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import type { Profile } from '@/domain/auth';
import { appError } from '@/domain/shared/errors';
import { err, ok, type Result } from '@/domain/shared/result';
import type { AppError } from '@/domain/shared/errors';
import type { AuthChange, AuthRepository, ProfileRepository } from '@/repositories';
import { AppFailure, unwrap } from '../shared/app-failure';
import { createSessionStore } from './session-store';
import { signIn } from './use-cases/sign-in';
import { updateTimeFormat } from './use-cases/update-time-format';
import { fakeConnectivity } from '../../../tests/support/fake-connectivity';

const activeProfile: Profile = {
  id: 'u1',
  fullName: 'Hanner Conde',
  timeFormat: '12h',
  isAdmin: false,
  isActive: true,
};

/** Auth falso: guarda la sesión en memoria y emite eventos como Supabase. */
function fakeAuth(signInResult: Result<{ userId: string }, AppError> = ok({ userId: 'u1' })) {
  const listeners = new Set<(c: AuthChange) => void>();
  let userId: string | null = null;
  const emit = (change: AuthChange) => listeners.forEach((l) => l(change));
  const auth: AuthRepository = {
    signIn: vi.fn(async () => {
      if (signInResult.ok) {
        userId = signInResult.value.userId;
        emit({ type: 'signed_in', userId });
      }
      return signInResult;
    }),
    signOut: vi.fn(async () => {
      userId = null;
      emit({ type: 'signed_out', requested: true });
      return ok(undefined);
    }),
    getCurrentUserId: async () => userId,
    onAuthChange: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return { auth, emit, setStoredUser: (id: string | null) => (userId = id) };
}

const profilesReturning = (result: Result<Profile, AppError>): ProfileRepository => ({
  getCurrentProfile: async () => result,
  updateTimeFormat: async () => ok(undefined),
});

const online = fakeConnectivity(true);
const credentials = { email: ' hanner@example.test ', password: 'secreta' };

describe('signIn (HU-BASE-03)', () => {
  it('BR-USR-02: entra con correo (sin espacios) y contraseña', async () => {
    const { auth } = fakeAuth();
    const result = await signIn(
      { auth, profiles: profilesReturning(ok(activeProfile)), connectivity: online },
      credentials,
    );
    expect(result).toEqual(ok(undefined));
    expect(auth.signIn).toHaveBeenCalledWith({ email: 'hanner@example.test', password: 'secreta' });
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it('sin conexión devuelve OFFLINE sin intentar', async () => {
    const { auth } = fakeAuth();
    const result = await signIn(
      { auth, profiles: profilesReturning(ok(activeProfile)), connectivity: fakeConnectivity(false) },
      credentials,
    );
    expect(result).toEqual(err(appError('OFFLINE')));
    expect(auth.signIn).not.toHaveBeenCalled();
  });

  it('CA-2: credenciales inválidas se devuelven tal cual', async () => {
    const { auth } = fakeAuth(err(appError('INVALID_CREDENTIALS')));
    const result = await signIn(
      { auth, profiles: profilesReturning(ok(activeProfile)), connectivity: online },
      credentials,
    );
    expect(result).toEqual(err(appError('INVALID_CREDENTIALS')));
  });

  it('R3 (CA-3): usuario inactivo → cierra la sesión y devuelve USER_INACTIVE', async () => {
    const { auth } = fakeAuth();
    const result = await signIn(
      { auth, profiles: profilesReturning(ok({ ...activeProfile, isActive: false })), connectivity: online },
      credentials,
    );
    expect(result).toEqual(err(appError('USER_INACTIVE')));
    expect(auth.signOut).toHaveBeenCalledOnce();
    expect(await auth.getCurrentUserId()).toBeNull();
  });

  it('si no se puede leer el perfil, no deja una sesión a medias', async () => {
    const { auth } = fakeAuth();
    const result = await signIn(
      { auth, profiles: profilesReturning(err(appError('NETWORK_ERROR'))), connectivity: online },
      credentials,
    );
    expect(result).toEqual(err(appError('NETWORK_ERROR')));
    expect(auth.signOut).toHaveBeenCalledOnce();
  });
});

describe('createSessionStore (HU-BASE-03)', () => {
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('empieza en loading y, al suscribirse, lee la sesión guardada', async () => {
    const { auth, setStoredUser } = fakeAuth();
    setStoredUser('u1');
    const store = createSessionStore(auth);
    expect(store.getState()).toEqual({ status: 'loading' });
    const listener = vi.fn();
    store.subscribe(listener);
    await flush();
    expect(store.getState()).toEqual({ status: 'signed_in', userId: 'u1' });
    expect(listener).toHaveBeenCalled();
  });

  it('sin sesión guardada queda signed_out; entrar y salir a propósito la actualiza', async () => {
    const { auth } = fakeAuth();
    const store = createSessionStore(auth);
    store.subscribe(() => {});
    await flush();
    expect(store.getState()).toEqual({ status: 'signed_out' });
    await auth.signIn(credentials);
    expect(store.getState()).toEqual({ status: 'signed_in', userId: 'u1' });
    await auth.signOut();
    expect(store.getState()).toEqual({ status: 'signed_out' });
  });

  it('CA-5 / R4: si la sesión vence, el estado es expired y la caché de lecturas sigue disponible', async () => {
    const { auth, emit, setStoredUser } = fakeAuth();
    setStoredUser('u1');
    const store = createSessionStore(auth);
    store.subscribe(() => {});
    await flush();
    const queryClient = new QueryClient();
    queryClient.setQueryData(['customers'], [{ id: 'c1' }]);

    emit({ type: 'signed_out', requested: false }); // el token no se pudo renovar
    expect(store.getState()).toEqual({ status: 'expired' });
    expect(queryClient.getQueryData(['customers'])).toEqual([{ id: 'c1' }]);
  });

  it('dejar de escuchar no notifica más', async () => {
    const { auth, emit } = fakeAuth();
    const store = createSessionStore(auth);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    await flush();
    listener.mockClear();
    unsubscribe();
    emit({ type: 'signed_in', userId: 'u2' });
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('unwrap', () => {
  it('devuelve el valor o lanza AppFailure con el AppError', () => {
    expect(unwrap(ok(3))).toBe(3);
    expect(() => unwrap(err(appError('NOT_FOUND')))).toThrow(AppFailure);
    try {
      unwrap(err(appError('NOT_FOUND')));
    } catch (failure) {
      expect((failure as AppFailure).error).toEqual(appError('NOT_FOUND'));
    }
  });
});

describe('updateTimeFormat (Ajustes, BR-GEN-07)', () => {
  it('guarda el formato elegido', async () => {
    const profiles = {
      ...profilesReturning(ok(activeProfile)),
      updateTimeFormat: vi.fn(async () => ok(undefined)),
    };
    const result = await updateTimeFormat({ profiles, connectivity: online }, '24h');
    expect(result).toEqual(ok(undefined));
    expect(profiles.updateTimeFormat).toHaveBeenCalledWith('24h');
  });

  it('sin conexión devuelve OFFLINE sin intentar', async () => {
    const profiles = {
      ...profilesReturning(ok(activeProfile)),
      updateTimeFormat: vi.fn(async () => ok(undefined)),
    };
    const result = await updateTimeFormat({ profiles, connectivity: fakeConnectivity(false) }, '24h');
    expect(result).toEqual(err(appError('OFFLINE')));
    expect(profiles.updateTimeFormat).not.toHaveBeenCalled();
  });
});
