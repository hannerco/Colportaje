'use client';

import { useRouter } from 'next/navigation';
import { copy } from '@/copy/es';
import { useCurrentProfile, useSignOut, useUpdateTimeFormat } from '@/features/auth';
import { SettingsScreen } from '@/features/settings';
import { appErrorMessage } from '@/features/shared/app-error-message';
import { ROUTES, useAppShell } from '@/features/shell';
import { useToast } from '@/ui/molecules/Toast';

/** Ajustes, versión mínima: formato de hora y cerrar sesión (pedido del dueño, 2026-11-20). */
export default function SettingsPage() {
  const router = useRouter();
  const toast = useToast();
  const { nav, offlineBanner, isOnline } = useAppShell();
  const profile = useCurrentProfile();
  const { updateTimeFormat } = useUpdateTimeFormat();
  const { signOut } = useSignOut();

  const fail = (error: unknown): never => {
    toast.show({ message: appErrorMessage(error).message, tone: 'error' });
    throw error instanceof Error ? error : new Error('FAILED');
  };

  return (
    <SettingsScreen
      nav={nav}
      banner={offlineBanner}
      profile={profile.data}
      isOnline={isOnline}
      onTimeFormatChange={async (format) => {
        const result = await updateTimeFormat(format);
        if (!result.ok) fail(result.error);
        toast.show({ message: copy.settings.timeFormatSaved, tone: 'success' });
      }}
      onSignOut={async () => {
        const result = await signOut();
        if (!result.ok) fail(result.error);
        router.replace(ROUTES.signIn);
      }}
    />
  );
}
