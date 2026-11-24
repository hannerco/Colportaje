'use client';

import { copy } from '@/copy/es';
import { useCurrentProfile } from '@/features/auth';
import { errorToast } from '@/features/shared/error-report';
import { useAppShell } from '@/features/shell';
import {
  AdminUsersScreen,
  useAuthorizeEmail,
  useRemovePendingEmail,
  useSetUserActive,
  useUsers,
} from '@/features/users';
import { useToast } from '@/ui/molecules/Toast';
import { AdminSections } from '../admin-sections';

/** Admin · Usuarios (BR-USR-07, ronda 34, #43): quién puede entrar. Solo administradores. */
export default function AdminUsersPage() {
  const toast = useToast();
  const { nav, offlineBanner, isOnline } = useAppShell();
  const profile = useCurrentProfile();
  const isAdmin = profile.data?.isAdmin === true;
  const users = useUsers(isAdmin);
  const { authorizeEmail } = useAuthorizeEmail();
  const { removePendingEmail } = useRemovePendingEmail();
  const { setUserActive } = useSetUserActive();
  const t = copy.admin.users;
  const showError = (error: unknown) => toast.show(errorToast(error));

  return (
    <AdminUsersScreen
      nav={nav}
      banner={offlineBanner}
      isOnline={isOnline}
      users={users.data}
      error={users.isError}
      onRetry={() => void users.refetch()}
      sections={<AdminSections active="users" />}
      onAuthorize={async (input) => {
        const result = await authorizeEmail(input);
        if (!result.ok) {
          toast.show(
            result.error.code === 'CONFLICT'
              ? { message: t.alreadyAuthorized, tone: 'error' }
              : errorToast(result.error),
          );
          throw new Error(result.error.code);
        }
        // El enlace de la app, para enviarlo por WhatsApp (BR-USR-05).
        toast.show({
          message: t.authorized(input.email.trim().toLowerCase()),
          tone: 'success',
          action: {
            label: t.copyLink,
            onAction: async () => {
              await navigator.clipboard?.writeText(window.location.origin);
              toast.show({ message: t.linkCopied, tone: 'success' });
            },
          },
        });
      }}
      onRemovePending={async (email) => {
        const result = await removePendingEmail(email);
        if (!result.ok) return showError(result.error);
        toast.show({ message: t.removed, tone: 'success' });
      }}
      onSetActive={async (userId, active) => {
        const result = await setUserActive({ userId, active });
        if (!result.ok)
          return result.error.code === 'VALIDATION'
            ? toast.show({ message: t.cannotDeactivateSelf, tone: 'error' })
            : showError(result.error);
        toast.show({ message: active ? t.reactivated : t.deactivated, tone: 'success' });
      }}
    />
  );
}
