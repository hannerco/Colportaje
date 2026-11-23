'use client';

import { copy } from '@/copy/es';
import { useCurrentProfile } from '@/features/auth';
import {
  AdminCatalogScreen,
  useAllTitles,
  useCreateTitle,
  useRemoveTitleCover,
  useSetTitleCover,
  useUpdateTitle,
} from '@/features/catalog';
import { appErrorMessage } from '@/features/shared/app-error-message';
import { NAV_HREFS, useAppShell } from '@/features/shell';
import { newId } from '@/lib/ids';
import { useToast } from '@/ui/molecules/Toast';
import { AdminSections } from './admin-sections';

/** Admin · Catálogo (HU-PAN-ADM-01): crear y editar títulos, sus precios y su portada. Solo administradores. */
export default function AdminPage() {
  const toast = useToast();
  const { nav, offlineBanner, isOnline } = useAppShell();
  const profile = useCurrentProfile();
  const isAdmin = profile.data?.isAdmin;
  const titles = useAllTitles();
  const { createTitle } = useCreateTitle();
  const { updateTitle } = useUpdateTitle();
  const { setTitleCover } = useSetTitleCover();
  const { removeTitleCover } = useRemoveTitleCover();
  const t = copy.admin.editor;

  return (
    <AdminCatalogScreen
      nav={nav}
      banner={offlineBanner}
      isOnline={isOnline}
      isAdmin={isAdmin}
      sections={<AdminSections active="catalog" />}
      titles={isAdmin ? titles.data : undefined}
      error={titles.isError}
      onRetry={() => void titles.refetch()}
      newId={newId}
      backHref={NAV_HREFS.admin}
      onSave={async ({ id, isNew, fields }) => {
        const result = isNew ? await createTitle({ id, fields }) : await updateTitle({ id, fields });
        if (!result.ok) {
          const failure = appErrorMessage(result.error);
          return { ok: false, message: failure.message, ...(failure.field ? { field: failure.field } : {}) };
        }
        const name = fields.name.trim();
        toast.show({ message: isNew ? t.created(name) : t.saved(name), tone: 'success' });
        return { ok: true };
      }}
      onSetCover={async (titleId, file) => {
        const result = await setTitleCover({ titleId, coverId: newId(), file });
        toast.show(
          result.ok
            ? { message: t.coverSaved, tone: 'success' }
            : { message: appErrorMessage(result.error).message, tone: 'error' },
        );
        return result.ok;
      }}
      onRemoveCover={async (titleId) => {
        const result = await removeTitleCover(titleId);
        toast.show(
          result.ok
            ? { message: t.coverRemoved, tone: 'success' }
            : { message: appErrorMessage(result.error).message, tone: 'error' },
        );
        return result.ok;
      }}
    />
  );
}
