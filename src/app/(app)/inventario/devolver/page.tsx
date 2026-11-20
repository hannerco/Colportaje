'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { copy } from '@/copy/es';
import {
  returnSelectionSummary,
  useReturnToLeader,
  useReturnToLeaderCandidates,
  ReturnToLeaderScreen,
  type ReturnSelection,
} from '@/features/inventory';
import { appErrorMessage } from '@/features/shared/app-error-message';
import { ROUTES, ShellScreen, useAppShell } from '@/features/shell';
import { newId } from '@/lib/ids';
import { useToast } from '@/ui/molecules/Toast';
import { usePlatform } from '@/ui/platform';

const t = copy.inventory.returnLeader;

/**
 * Contenedor de Devolver al líder (HU-PAN-INV-05): la selección vive en el teléfono hasta «Devolver N». Al abrir el
 * resumen se prepara UNA vez el envío con su `opId`; si falla, la selección sigue en pantalla y reintentar manda lo
 * mismo, así no se devuelve de más (R6). El Aviso con «Deshacer» deshace cada ejemplar con la misma nota.
 */
export default function ReturnToLeaderPage() {
  const shell = useAppShell();
  const router = useRouter();
  const toast = useToast();
  const mobile = usePlatform() === 'mobile';
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [quantities, setQuantities] = useState<Readonly<Record<string, number>>>({});
  const [note, setNote] = useState('');
  const [summaryOpen, setSummaryOpen] = useState(false);
  const prepared = useRef<(ReturnSelection & { opId: string; note: string }) | null>(null);

  const all = useReturnToLeaderCandidates();
  const shown = useReturnToLeaderCandidates({ search });
  const { returnCopiesToLeader, undoReturnToLeader } = useReturnToLeader();

  const selection: ReturnSelection = {
    copyIds: [...selected],
    minibookLines: Object.entries(quantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([titleId, quantity]) => ({ titleId, quantity })),
  };
  const summary = all.data
    ? returnSelectionSummary(selection, all.data)
    : returnSelectionSummary({ copyIds: [], minibookLines: [] }, { books: [], minibooks: [] });

  const openSummary = (open: boolean) => {
    // Cada vez que se abre, el envío se prepara de nuevo con lo elegido ahora; cerrado no hay nada pendiente.
    prepared.current = open ? { ...selection, opId: newId(), note: note.trim() } : null;
    setSummaryOpen(open);
  };

  const confirm = async () => {
    const input = prepared.current ?? { ...selection, opId: newId(), note: note.trim() };
    prepared.current = input;
    const result = await returnCopiesToLeader(input);
    if (!result.ok) {
      toast.show({
        message: appErrorMessage(result.error).message,
        tone: 'error',
        action: { label: copy.errors.retry, onAction: () => setSummaryOpen(true) },
      });
      // Que el diálogo no se cierre: la selección sigue ahí para reintentar con el mismo opId.
      throw new Error(result.error.code);
    }
    const { returnedCopyIds } = result.value;
    prepared.current = null;
    toast.show({
      message: t.result.returned(returnedCopyIds.length),
      tone: 'success',
      action: {
        label: t.result.undo,
        onAction: async () => {
          // CA-2: cada ejemplar vuelve a En físico (el deshacer es por ejemplar y pide nota).
          for (const copyId of returnedCopyIds) {
            const undone = await undoReturnToLeader({ copyId, note: input.note });
            if (!undone.ok) {
              toast.show({ message: appErrorMessage(undone.error).message, tone: 'error' });
              return;
            }
          }
        },
      },
    });
    router.push(ROUTES.inventory);
  };

  const screen = (
    <ReturnToLeaderScreen
      candidates={shown.data}
      loading={shown.isPending}
      error={shown.isError}
      onRetry={() => void shown.refetch()}
      search={search}
      onSearchChange={setSearch}
      selectedCopyIds={selected}
      onToggleCopy={(id, on) =>
        setSelected((current) => {
          const next = new Set(current);
          if (on) next.add(id);
          else next.delete(id);
          return next;
        })
      }
      minibookQuantityOf={(titleId) => quantities[titleId] ?? 0}
      onMinibookQuantityChange={(titleId, quantity) =>
        setQuantities((current) => ({ ...current, [titleId]: quantity }))
      }
      summary={summary}
      note={note}
      onNoteChange={setNote}
      isOnline={shell.isOnline}
      banner={shell.offlineBanner}
      summaryOpen={summaryOpen}
      onSummaryOpenChange={openSummary}
      onConfirm={confirm}
      onCancel={() => router.push(ROUTES.inventory)}
    />
  );
  if (mobile) return screen;
  return (
    <ShellScreen nav={shell.nav} title={t.title}>
      {screen}
    </ShellScreen>
  );
}
