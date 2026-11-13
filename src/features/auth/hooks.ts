'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { INITIAL_SESSION_STATE, type SessionState } from '@/domain/auth';
import type { AuthRepository } from '@/repositories';
import { unwrap } from '../shared/app-failure';
import { useRepositories } from '../shared/repositories-provider';
import { createSessionStore, type SessionStore } from './session-store';
import { signIn } from './use-cases/sign-in';

export const authQueryKeys = {
  all: ['auth'] as const,
  currentProfile: (userId: string | undefined) => ['auth', 'current-profile', userId] as const,
};

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
    onSuccess: (result) => {
      if (result.ok) void queryClient.invalidateQueries({ queryKey: authQueryKeys.all });
    },
  });
  return { signIn: mutation.mutateAsync, isPending: mutation.isPending };
}

/**
 * `signOut()` → `Result<void>`. Al cerrar sesión a propósito se borra la caché del dispositivo
 * (puede usarlo otra persona); si la sesión solo vence, la caché se conserva (AF-83, R4).
 */
export function useSignOut() {
  const { auth } = useRepositories();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => auth.signOut(),
    onSuccess: (result) => {
      if (result.ok) queryClient.clear();
    },
  });
  return { signOut: mutation.mutateAsync, isPending: mutation.isPending };
}
