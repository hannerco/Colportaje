import { INITIAL_SESSION_STATE, nextSessionState, type SessionEvent, type SessionState } from '@/domain/auth';
import type { AuthRepository } from '@/repositories';

export type SessionStore = {
  getState(): SessionState;
  /** Se suscribe y, la primera vez, empieza a escuchar a Auth y lee la sesión guardada. */
  subscribe(listener: () => void): () => void;
};

/** Estado de la sesión compartido por todos los `useSession()` (compatible con `useSyncExternalStore`). */
export function createSessionStore(auth: AuthRepository): SessionStore {
  let state = INITIAL_SESSION_STATE;
  let started = false;
  const listeners = new Set<() => void>();

  const apply = (event: SessionEvent) => {
    const next = nextSessionState(state, event);
    if (next.status === state.status && next.userId === state.userId) return;
    state = next;
    for (const listener of listeners) listener();
  };

  const start = () => {
    started = true;
    auth.onAuthChange(apply);
    void auth.getCurrentUserId().then((userId) => apply({ type: 'initial', userId }));
  };

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      if (!started) start();
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
