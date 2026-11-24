'use client';

import { useInstallPrompt } from '../../install-prompt';
import { InstallPrompt } from './InstallPrompt';

/** Muestra la invitación a instalar cuando corresponde (ya con sesión abierta). */
export function InstallGate() {
  const { kind, install, dismiss } = useInstallPrompt();
  if (!kind) return null;
  return <InstallPrompt kind={kind} open onInstall={install} onDismiss={dismiss} />;
}
