'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  googleErrorFromUrl,
  SignInScreen,
  useSession,
  useSignIn,
  useSignInWithGoogle,
} from '@/features/auth';
import { copy } from '@/copy/es';
import { googleSignInEnabled } from '@/lib/env';
import { useConnection } from '@/features/connection';
import { appErrorMessage } from '@/features/shared/app-error-message';
import { ROUTES } from '@/features/shell';
import { AUTH_ERROR_CODES } from '@/domain/auth';

/**
 * Iniciar sesión (HU-PAN-BASE-02): con sesión abierta lleva a Clientes (las rutas de la app mandan aquí a quien no la
 * tiene). Entrar con éxito también lleva a Clientes; si falla, el motivo se ve en la pantalla.
 */
export default function SignInPage() {
  const router = useRouter();
  const session = useSession();
  const { online } = useConnection();
  const { signIn, isPending } = useSignIn();
  const { signInWithGoogle, isPending: openingGoogle } = useSignInWithGoogle();
  const [error, setError] = useState<{ kind: 'credentials' | 'other'; message: string } | null>(null);

  // #41: Google vuelve aquí; si el correo no está autorizado, trae el error en la dirección.
  useEffect(() => {
    const failure = googleErrorFromUrl(window.location.search) ?? googleErrorFromUrl(window.location.hash);
    if (!failure) return;
    window.history.replaceState(null, '', window.location.pathname);
    // Se muestra después de pintar (la dirección solo existe en el navegador, no al generar la página).
    const frame = requestAnimationFrame(() =>
      setError({
        kind: 'other',
        message: failure === 'no-access' ? copy.auth.signIn.noAccess : copy.auth.signIn.googleFailed,
      }),
    );
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (session.status === 'signed_in') router.replace(ROUTES.customers);
  }, [session.status, router]);

  return (
    <SignInScreen
      isOnline={online}
      pending={isPending || session.status === 'signed_in'}
      error={error}
      onEdit={() => setError(null)}
      google={
        googleSignInEnabled()
          ? {
              pending: openingGoogle,
              onClick: async () => {
                setError(null);
                const result = await signInWithGoogle(`${window.location.origin}${ROUTES.signIn}`);
                if (!result.ok) setError({ kind: 'other', message: appErrorMessage(result.error).message });
              },
            }
          : undefined
      }
      onSubmit={async (credentials) => {
        setError(null);
        const result = await signIn(credentials);
        if (result.ok) return;
        setError({
          kind: result.error.code === AUTH_ERROR_CODES.INVALID_CREDENTIALS ? 'credentials' : 'other',
          message: appErrorMessage(result.error).message,
        });
      }}
    />
  );
}
