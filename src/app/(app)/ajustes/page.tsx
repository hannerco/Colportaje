'use client';

import { useRouter } from 'next/navigation';
import { copy } from '@/copy/es';
import { useCurrentProfile, useSignOut, useUpdateTimeFormat } from '@/features/auth';
import { SettingsScreen } from '@/features/settings';
import { errorToast } from '@/features/shared/error-report';
import { ROUTES, setAdminMode, useAdminMode, useAppShell } from '@/features/shell';
import { useState } from 'react';
import packageJson from '../../../../package.json';
import { applyThemePreference, readThemePreference } from '@/ui/platform';
import { useToast } from '@/ui/molecules/Toast';

/** Ajustes (#42): tema de este dispositivo, modo administrador, formato de hora y cerrar sesión. */
export default function SettingsPage() {
  const router = useRouter();
  const toast = useToast();
  const { nav, offlineBanner, isOnline } = useAppShell();
  const profile = useCurrentProfile();
  const { updateTimeFormat } = useUpdateTimeFormat();
  const { signOut } = useSignOut();
  const [theme, setTheme] = useState(readThemePreference);
  const adminMode = useAdminMode();

  const fail = (error: unknown): never => {
    toast.show(errorToast(error));
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
      theme={theme}
      onThemeChange={(next) => {
        setTheme(next);
        applyThemePreference(next);
      }}
      adminMode={adminMode}
      onAdminModeChange={setAdminMode}
      version={packageJson.version}
      onInvite={async () => {
        const { inviteText, copied } = copy.app.about;
        const url = window.location.origin;
        // La hoja de compartir del teléfono; si no la hay (computador), se copia el texto.
        if (navigator.share) {
          await navigator.share({ title: copy.app.name, text: inviteText, url }).catch(() => undefined);
          return;
        }
        await navigator.clipboard?.writeText(`${inviteText} ${url}`);
        toast.show({ message: copied, tone: 'success' });
      }}
      onSignOut={async () => {
        const result = await signOut();
        if (!result.ok) fail(result.error);
        router.replace(ROUTES.signIn);
      }}
    />
  );
}
