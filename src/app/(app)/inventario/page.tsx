'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { copy } from '@/copy/es';
import {
  DEFAULT_COPIES_LIST_PARAMS,
  InStockScreen,
  useCopiesList,
  useCopyIssueActions,
  useFlaggedCopies,
  useInStockCopiesOfTitle,
  useInStockSummary,
  type FlaggedCopy,
  type FlaggedResolution,
} from '@/features/inventory';
import { appErrorMessage } from '@/features/shared/app-error-message';
import { ROUTES, ShellScreen, useAppShell } from '@/features/shell';
import { useToast } from '@/ui/molecules/Toast';

const t = copy.inventory;
/** El título abierto y Por resolver van en la URL: «atrás» los cierra y se pueden compartir o recargar. */
const TITLE_PARAM = 'titulo';
const FLAGGED_PARAM = 'por-resolver';

/** Contenedor de Libros en físico y Por resolver (HU-PAN-INV-01). */
function InStockRoute() {
  const shell = useAppShell();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const titleId = searchParams.get(TITLE_PARAM);
  const flaggedOpen = searchParams.has(FLAGGED_PARAM);

  const summary = useInStockSummary();
  const titleCopies = useInStockCopiesOfTitle(titleId);
  const flagged = useFlaggedCopies();
  const copiesList = useCopiesList(DEFAULT_COPIES_LIST_PARAMS);
  const { resolveCopyIssue, undoResolveCopyIssue } = useCopyIssueActions();

  const setParam = (name: string, value: string | null) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value === null) next.delete(name);
    else next.set(name, value);
    const query = next.toString();
    // Sin ir al servidor (también sin conexión); `useSearchParams` se entera igual.
    window.history.pushState(null, '', query ? `${pathname}?${query}` : pathname);
  };
  const showError = (error: unknown) =>
    toast.show({ message: appErrorMessage(error).message, tone: 'error' });

  const resolve = async (item: FlaggedCopy, resolution: FlaggedResolution, note: string | null) => {
    const result = await resolveCopyIssue({ copyId: item.copyId, resolution, note });
    if (!result.ok) return showError(result.error);
    const name = t.flagged.copyName(item.titleName, item.number);
    // CA-2: el Aviso con «Deshacer» devuelve el ejemplar a Por resolver.
    toast.show({
      message: t.flagged.done[resolution](name),
      tone: 'success',
      action: {
        label: t.flagged.undo,
        onAction: async () => {
          const undone = await undoResolveCopyIssue(item.copyId);
          if (!undone.ok) showError(undone.error);
        },
      },
    });
  };

  return (
    <ShellScreen
      nav={{
        ...shell.nav,
        fab: {
          icon: 'add',
          label: t.addToInventory,
          onClick: () => router.push(ROUTES.addToInventory),
          disabled: !shell.isOnline,
        },
      }}
    >
      <InStockScreen
        summary={summary.data}
        loading={summary.isPending}
        error={summary.isError}
        onRetry={() => void summary.refetch()}
        isOnline={shell.isOnline}
        banner={shell.offlineBanner}
        copiesCount={copiesList.data?.counts.all}
        onOpenCopies={() => router.push(ROUTES.copies)}
        onAdd={() => router.push(ROUTES.addToInventory)}
        onReturnToLeader={() => router.push(ROUTES.returnToLeader)}
        openTitle={titleId ? { titleId, data: titleCopies.data } : null}
        onOpenTitle={(id) => setParam(TITLE_PARAM, id)}
        copyHref={ROUTES.copy}
        flaggedOpen={flaggedOpen}
        onFlaggedOpenChange={(open) => setParam(FLAGGED_PARAM, open ? '' : null)}
        flagged={flagged.data}
        onResolve={resolve}
        backHref={ROUTES.inventory}
      />
    </ShellScreen>
  );
}

export default function InventoryPage() {
  return (
    <Suspense>
      <InStockRoute />
    </Suspense>
  );
}
