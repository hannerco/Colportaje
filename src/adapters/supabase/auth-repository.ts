import { err, ok } from '@/domain/shared/result';
import type { AuthRepository } from '@/repositories';
import type { GetSupabaseClient } from './client';
import { isMissingSessionError, mapAuthError } from './errors';

export function createSupabaseAuthRepository(getClient: GetSupabaseClient): AuthRepository {
  // Un SIGNED_OUT que llega después de llamar a signOut() lo pidió la app; si no, la sesión venció (AF-83).
  let signOutRequested = false;

  return {
    async signIn({ email, password }) {
      const { data, error } = await getClient().auth.signInWithPassword({ email, password });
      if (error) return err(mapAuthError(error));
      return ok({ userId: data.user.id });
    },

    async signOut() {
      signOutRequested = true;
      const { error } = await getClient().auth.signOut();
      if (error && !isMissingSessionError(error)) {
        signOutRequested = false;
        return err(mapAuthError(error));
      }
      return ok(undefined);
    },

    async getCurrentUserId() {
      const { data } = await getClient().auth.getSession();
      return data.session?.user.id ?? null;
    },

    onAuthChange(listener) {
      const { data } = getClient().auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
          const requested = signOutRequested;
          signOutRequested = false;
          listener({ type: 'signed_out', requested });
        } else if (session) {
          listener({ type: 'signed_in', userId: session.user.id });
        }
      });
      return () => data.subscription.unsubscribe();
    },
  };
}
