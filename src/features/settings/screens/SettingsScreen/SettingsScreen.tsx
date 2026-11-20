'use client';

import { useState, type ReactNode } from 'react';
import { copy } from '@/copy/es';
import { formatTime, type TimeFormat } from '@/domain/time';
import { Button } from '@/ui/atoms/Button';
import { Choice, ChoiceGroup } from '@/ui/atoms/Choice';
import { DataList, DataRow } from '@/ui/molecules/DataRow';
import type { AppNavProps } from '@/ui/organisms/AppNav';
import { ConfirmDialog } from '@/ui/organisms/ConfirmDialog';
import { EmptyState } from '@/ui/organisms/EmptyState';
import { Island } from '@/ui/organisms/Island';
import { ShellScreen } from '@/features/shell';
import styles from './SettingsScreen.module.css';

export type SettingsScreenProps = {
  /** La navegación del armazón (`useAppShell().nav`). */
  nav: AppNavProps;
  /** Franja de sin conexión. */
  banner?: ReactNode;
  /** El perfil; sin valor mientras carga. */
  profile?: { fullName: string; isAdmin: boolean; timeFormat: TimeFormat };
  isOnline: boolean;
  /** Guarda el formato de hora; si falla, que lance (el contenedor ya avisó). */
  onTimeFormatChange: (format: TimeFormat) => Promise<void>;
  /** Cierra la sesión; si falla, que lance para que el diálogo siga abierto. */
  onSignOut: () => Promise<void>;
};

const t = copy.settings;
/** Un ejemplo fijo para mostrar cada formato: 3:30 p. m. en Bogotá. */
const EXAMPLE = new Date('2026-01-15T20:30:00Z');
const FORMATS: readonly TimeFormat[] = ['12h', '24h'];

/**
 * Ajustes, versión mínima (pedido del dueño, 2026-11-20; sin diseño del lienzo): la cuenta, el formato de hora
 * (BR-GEN-07, 12 h por defecto) y «Cerrar sesión», que borra de este celular los datos guardados (AF-83). El resto de
 * Ajustes (y el modo administrador, BR-USR-04) espera su diseño.
 */
export function SettingsScreen({
  nav,
  banner,
  profile,
  isOnline,
  onTimeFormatChange,
  onSignOut,
}: SettingsScreenProps) {
  const [signingOut, setSigningOut] = useState(false);
  const [saving, setSaving] = useState<TimeFormat | null>(null);
  const shown = saving ?? profile?.timeFormat;

  const change = async (value: string) => {
    const format = value as TimeFormat;
    if (!profile || format === profile.timeFormat) return;
    setSaving(format);
    try {
      await onTimeFormatChange(format);
    } catch {
      // El contenedor ya avisó; vuelve a mostrarse el formato guardado.
    } finally {
      setSaving(null);
    }
  };

  return (
    <ShellScreen nav={nav} title={copy.ui.nav.items.settings} banner={banner}>
      {!profile ? (
        <EmptyState kind="loading" rows={4} />
      ) : (
        <div className={styles.stack}>
          <Island title={t.account} icon="person">
            <DataList>
              <DataRow label={t.name} value={profile.fullName} divider={false} />
              <DataRow label={t.role} value={profile.isAdmin ? t.roles.admin : t.roles.colportor} />
            </DataList>
          </Island>

          <Island title={t.timeFormat} icon="scheduled">
            <ChoiceGroup legend={t.timeFormatLegend} value={shown} onValueChange={(v) => void change(v)}>
              {FORMATS.map((format) => (
                <Choice
                  key={format}
                  kind="radio"
                  value={format}
                  label={t.formats[format]}
                  description={t.example(formatTime(EXAMPLE, format))}
                  disabled={!isOnline || saving !== null}
                />
              ))}
            </ChoiceGroup>
            {!isOnline && <p className={styles.muted}>{copy.ui.empty.needsConnection}</p>}
          </Island>

          <Island title={t.session} icon="settings">
            <p className={styles.muted}>{t.signOutHint}</p>
            <div className={styles.actions}>
              <Button variant="secondary" onClick={() => setSigningOut(true)}>
                {t.signOut}
              </Button>
            </div>
          </Island>
        </div>
      )}
      <ConfirmDialog
        open={signingOut}
        onOpenChange={setSigningOut}
        title={t.signOutTitle}
        message={t.signOutHint}
        confirmLabel={t.signOut}
        cancelLabel={t.cancel}
        onConfirm={onSignOut}
      />
    </ShellScreen>
  );
}
