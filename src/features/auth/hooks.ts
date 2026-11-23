'use client';

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { INITIAL_SESSION_STATE, type SessionState } from '@/domain/auth';
import type { AuthRepository } from '@/repositories';
import { unwrap } from '../shared/app-failure';
import { useRepositories } from '../shared/repositories-provider';
import { createSessionStore, type SessionStore } from './session-store';
import { signInWithGoogle } from './use-cases/sign-in-with-google';
import { signIn } from './use-cases/sign-in';
import { updateTimeFormat } from './use-cases/update-time-format';
import type { TimeFormat } from '@/domain/time';

export const authQueryKeys = {
  all: ['auth'] as const,
  currentProfile: (userId: string | undefined) => ['auth', 'current-profile', userId] as const,
};

/** ¿Hay en caché un perfil de un usuario distinto de `userId`? */
export const cacheBelongsToAnotherUser = (queryClient: QueryClient, userId: string | null): boolean =>
  queryClient
    .getQueriesData({ queryKey: ['auth', 'current-profile'] })
    .some(([key, data]) => data !== undefined && key[2] !== userId);

const stores = new WeakMap<AuthRepository, SessionStore>();

const sessionStoreFor = (auth: AuthRepository): SessionStore => {
  let store = stores.get(auth);
  if (!store) {
    store = createSessionStore(auth);
    stores.set(auth, store);
  }
  return store;
};

const serverSnapshot = (): SessionState => INITIAL_SESSION_STATE;

/** `{ status: 'loading' | 'signed_in' | 'signed_out' | 'expired'; userId? }` (HU-BASE-03). */
export function useSession(): SessionState {
  const { auth } = useRepositories();
  const store = sessionStoreFor(auth);
  return useSyncExternalStore(store.subscribe, store.getState, serverSnapshot);
}

/** Perfil del usuario actual: `{ id, fullName, timeFormat, isAdmin, isActive }`. */
export function useCurrentProfile() {
  const { profiles } = useRepositories();
  const session = useSession();
  return useQuery({
    queryKey: authQueryKeys.currentProfile(session.userId),
    queryFn: async () => unwrap(await profiles.getCurrentProfile()),
    enabled: session.status === 'signed_in',
  });
}

/** `signIn({ email, password })` → `Result<void>`; errores `INVALID_CREDENTIALS`, `USER_INACTIVE`, `OFFLINE`. */
export function useSignIn() {
  const repositories = useRepositories();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: { email: string; password: string }) => signIn(repositories, input),
    onSuccess: async (result) => {
      if (!result.ok) return;
      // La caché guardada es del usuario anterior si la sesión venció y entró otra persona (HU-BASE-06).
      const userId = await repositories.auth.getCurrentUserId();
      if (cacheBelongsToAnotherUser(queryClient, userId)) {
        queryClient.clear();
        await repositories.offlineCache.clear();
      }
      void queryClient.invalidateQueries({ queryKey: authQueryKeys.all });
    },
  });
  return { signIn: mutation.mutateAsync, isPending: mutation.isPending };
}

/** `signInWithGoogle(redirectTo)` → `Result<void>`: sale a Google (ronda 34, #41). */
export function useSignInWithGoogle() {
  const repositories = useRepositories();
  const mutation = useMutation({
    mutationFn: (redirectTo: string) => signInWithGoogle(repositories, redirectTo),
  });
  return { signInWithGoogle: mutation.mutateAsync, isPending: mutation.isPending };
}

/**
 * `signOut()` → `Result<void>`. Al cerrar sesión a propósito se borra la caché del dispositivo
 * (puede usarlo otra persona); si la sesión solo vence, la caché se conserva (AF-83, R4).
 */
export function useSignOut() {
  const { auth, offlineCache, lastPickerPoint } = useRepositories();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => auth.signOut(),
    onSuccess: async (result) => {
      if (!result.ok) return;
      queryClient.clear();
      lastPickerPoint.clear(); // último punto del selector de ubicación: dato personal (HU-CLI-06)
      await offlineCache.clear(); // de inmediato, sin esperar al guardado periódico (HU-BASE-06)
    },
  });
  return { signOut: mutation.mutateAsync, isPending: mutation.isPending };
}

/** Cambia el formato de hora del usuario (Ajustes, BR-GEN-07). Devuelve `Result<void>`; errores `OFFLINE`, `FORBIDDEN`. */
export function useUpdateTimeFormat() {
  const { profiles, connectivity } = useRepositories();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (format: TimeFormat) => updateTimeFormat({ profiles, connectivity }, format),
    onSuccess: (result) => {
      if (!result.ok) return;
      void queryClient.invalidateQueries({ queryKey: authQueryKeys.all });
    },
  });
  return { updateTimeFormat: mutation.mutateAsync, isPending: mutation.isPending };
}
