'use client';

import { copy } from '@/copy/es';
import { Logo } from '@/ui/atoms/Logo';
import { Icon } from '@/ui/icons';
import { ConfirmDialog } from '@/ui/organisms/ConfirmDialog';
import styles from './InstallPrompt.module.css';

export type InstallPromptProps = {
  /** `native`: el navegador instala con un botón. `ios`: Safari del iPhone, se explican los pasos. */
  kind: 'native' | 'ios';
  open: boolean;
  onInstall: () => void | Promise<void>;
  /** «Ahora no» o «Entendido»: no vuelve a salir en este dispositivo. */
  onDismiss: () => void;
};

const t = copy.app.install;

/**
 * Invitación a instalar (lienzo «Invitación a instalar», ronda 37): el ícono de app de 64, un beneficio y «Instalar».
 * En el celular es una hoja inferior y en el computador un diálogo pequeño (el Diálogo de la biblioteca hace las dos).
 */
export function InstallPrompt({ kind, open, onInstall, onDismiss }: InstallPromptProps) {
  const ios = kind === 'ios';
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => !next && onDismiss()}
      title={t.title}
      message={t.benefit}
      confirmLabel={ios ? t.understood : t.install}
      cancelLabel={t.later}
      onConfirm={ios ? onDismiss : onInstall}
    >
      <div className={styles.icon}>
        <Logo variant="app-icon" size={64} decorative />
      </div>
      {ios && (
        <ol className={styles.steps}>
          <li>
            <Icon name="share" size={20} tone="current" className={styles.stepIcon} />
            {t.iosShare}
          </li>
          <li>
            <Icon name="add" size={20} tone="current" className={styles.stepIcon} />
            {t.iosAdd}
          </li>
          <li>{t.iosConfirm}</li>
        </ol>
      )}
    </ConfirmDialog>
  );
}
