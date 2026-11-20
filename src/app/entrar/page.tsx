'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSession, useSignIn, SignInScreen } from '@/features/auth';
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
  const [error, setError] = useState<{ kind: 'credentials' | 'other'; message: string } | null>(null);

  useEffect(() => {
    if (session.status === 'signed_in') router.replace(ROUTES.customers);
  }, [session.status, router]);

  return (
    <SignInScreen
      isOnline={online}
      pending={isPending || session.status === 'signed_in'}
      error={error}
      onEdit={() => setError(null)}
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
