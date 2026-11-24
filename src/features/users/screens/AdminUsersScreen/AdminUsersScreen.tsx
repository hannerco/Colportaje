'use client';

import { useState, type ReactNode } from 'react';
import { copy } from '@/copy/es';
import type { AppUser, AppUserStatus, AuthorizeEmailInput } from '@/domain/app-user';
import { Avatar } from '@/ui/atoms/Avatar';
import { Button } from '@/ui/atoms/Button';
import { Choice } from '@/ui/atoms/Choice';
import { Field } from '@/ui/atoms/Field';
import { Menu } from '@/ui/molecules/Menu';
import { Tabs } from '@/ui/molecules/Tabs';
import type { AppNavProps } from '@/ui/organisms/AppNav';
import { ConfirmDialog } from '@/ui/organisms/ConfirmDialog';
import { EmptyState } from '@/ui/organisms/EmptyState';
import { PageHeader } from '@/ui/organisms/PageHeader';
import { RowsSkeleton } from '@/ui/templates/ListTemplate';
import { ShellScreen } from '@/features/shell';
import styles from './AdminUsersScreen.module.css';

type View = 'all' | AppUserStatus;

export type AdminUsersScreenProps = {
  nav: AppNavProps;
  banner?: ReactNode;
  isOnline: boolean;
  /** Sin valor mientras carga. */
  users?: readonly AppUser[];
  error?: boolean;
  onRetry?: () => void;
  /** Catálogo · Usuarios (las partes de Admin). */
  sections: ReactNode;
  /** «Autorizar correo». Si falla, que lance para que la ventana siga abierta (el contenedor ya avisó). */
  onAuthorize: (input: AuthorizeEmailInput) => Promise<void>;
  onRemovePending: (email: string) => void;
  onSetActive: (userId: string, active: boolean) => void;
};

const t = copy.admin.users;
const VIEWS: View[] = ['all', 'active', 'pending', 'inactive'];

/**
 * Admin · Usuarios (BR-USR-07, ronda 34, #43; propuesta 6 del lienzo): quién puede entrar a la app. El admin autoriza
 * un correo de Google (queda «Pendiente» hasta que la persona entra), desactiva o reactiva a quien ya entró y puede
 * quitar un Pendiente. Solo administradores.
 */
export function AdminUsersScreen(props: AdminUsersScreenProps) {
  const { users, isOnline } = props;
  const [view, setView] = useState<View>('all');
  const [authorizing, setAuthorizing] = useState(false);
  const [draft, setDraft] = useState<AuthorizeEmailInput>({ email: '', fullName: '', isAdmin: false });
  const count = (status: View) =>
    users ? users.filter((u) => status === 'all' || u.status === status).length : undefined;
  const shown = (users ?? []).filter((u) => view === 'all' || u.status === view);

  const startAuthorizing = () => {
    setDraft({ email: '', fullName: '', isAdmin: false });
    setAuthorizing(true);
  };

  return (
    // #102: en el celular el encabezado no muestra la acción principal (va en el botón flotante); aquí no había botón
    // flotante y «Autorizar correo» no se veía. Ahora es el botón flotante de esta pantalla.
    <ShellScreen
      nav={{
        ...props.nav,
        fab: { icon: 'new-customer', label: t.authorize, onClick: startAuthorizing, disabled: !isOnline },
      }}
      banner={props.banner}
    >
      <PageHeader
        kind="root"
        title={t.title}
        count={users?.length}
        primaryAction={{
          label: t.authorize,
          icon: 'add',
          onClick: startAuthorizing,
          disabled: !isOnline,
        }}
      />
      {props.sections}
      <Tabs
        aria-label={t.viewsLabel}
        value={view}
        onValueChange={(next) => setView(next as View)}
        items={VIEWS.map((id) => ({ id, label: t.views[id], count: count(id) }))}
      />
      {props.error ? (
        <EmptyState
          kind="error"
          {...(props.onRetry ? { action: { label: copy.errors.retry, onClick: props.onRetry } } : {})}
        />
      ) : !users ? (
        <RowsSkeleton rows={4} />
      ) : shown.length === 0 ? (
        <EmptyState kind="empty" title={t.empty} />
      ) : (
        <ul className={styles.list} aria-label={t.title}>
          {shown.map((user) => (
            <li key={user.email} className={styles.row}>
              <span className={styles.person}>
                <Avatar kind="person" size="md" decorative />
                <span className={styles.who}>
                  <span className={user.status === 'inactive' ? styles.nameMuted : styles.name}>
                    {user.fullName}
                  </span>
                  <span className={styles.email}>{user.email}</span>
                </span>
              </span>
              <span className={styles.role}>{user.isAdmin ? t.roles.admin : t.roles.colportor}</span>
              <span
                className={styles.status}
                data-status={user.status}
                aria-label={t.statusLabel(t.status[user.status])}
              >
                {t.status[user.status]}
              </span>
              <Menu
                title={user.fullName}
                trigger={
                  <Button variant="tertiary" iconOnly icon="more" state={isOnline ? 'normal' : 'disabled'}>
                    {t.actions(user.fullName)}
                  </Button>
                }
                items={
                  user.status === 'pending'
                    ? [{ id: 'remove', label: t.remove, icon: 'delete', danger: true }]
                    : user.status === 'active'
                      ? [{ id: 'deactivate', label: t.deactivate, icon: 'canceled', danger: true }]
                      : [{ id: 'reactivate', label: t.reactivate, icon: 'undo' }]
                }
                onSelect={(id) => {
                  if (id === 'remove') props.onRemovePending(user.email);
                  if (id === 'deactivate' && user.userId) props.onSetActive(user.userId, false);
                  if (id === 'reactivate' && user.userId) props.onSetActive(user.userId, true);
                }}
              />
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={authorizing}
        onOpenChange={setAuthorizing}
        title={t.authorize}
        message={t.authorizeHint}
        confirmLabel={t.authorizeConfirm}
        cancelLabel={t.cancel}
        onConfirm={() => props.onAuthorize(draft)}
      >
        <div className={styles.form}>
          <Field
            label={t.fullName}
            value={draft.fullName}
            onChange={(fullName) => setDraft((current) => ({ ...current, fullName }))}
          />
          <Field
            kind="email"
            label={t.email}
            placeholder="nombre@gmail.com"
            value={draft.email}
            onChange={(email) => setDraft((current) => ({ ...current, email }))}
          />
          <Choice
            label={t.isAdmin}
            checked={draft.isAdmin}
            onCheckedChange={(isAdmin) => setDraft((current) => ({ ...current, isAdmin }))}
          />
        </div>
      </ConfirmDialog>
    </ShellScreen>
  );
}
