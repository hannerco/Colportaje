'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import { copy } from '@/copy/es';
import type { AddCopiesInput } from '@/domain/add-batch';
import { todayBogota } from '@/domain/time';
import {
  AddCopiesScreen,
  createAddBatch,
  prepareAddCopies,
  useAddCatalog,
  useAddCopiesBatch,
} from '@/features/inventory';
import { appErrorMessage } from '@/features/shared/app-error-message';
import { ROUTES, ShellScreen, useAppShell } from '@/features/shell';
import { systemClock } from '@/lib/clock';
import { useToast } from '@/ui/molecules/Toast';
import { usePlatform } from '@/ui/platform';

/**
 * Contenedor de Agregar al inventario (HU-PAN-INV-04): el lote vive en el teléfono hasta «Agregar N» (BR-COPY-02). Al
 * abrir el resumen se prepara UNA vez el envío con sus identificadores; si falla, el lote sigue en pantalla y reintentar
 * manda lo mismo, así no se duplica nada (R6).
 */
export default function AddToInventoryPage() {
  const shell = useAppShell();
  const router = useRouter();
  const toast = useToast();
  const mobile = usePlatform() === 'mobile';
  const [today] = useState(() => todayBogota(systemClock));
  const [search, setSearch] = useState('');
  const [receivedAt, setReceivedAt] = useState(today);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const prepared = useRef<AddCopiesInput | null>(null);

  const all = useAddCatalog();
  const shown = useAddCatalog({ search });
  const titles = useMemo(
    () =>
      (all.data?.groups ?? []).flatMap((group) =>
        group.titles.map((title) => ({ id: title.id, name: title.name, category: group.category })),
      ),
    [all.data],
  );
  const [batch, setBatch] = useState(() => createAddBatch([]));
  // El lote se crea cuando llega el catálogo; mientras tanto es uno vacío sobre ningún título.
  const [batchTitles, setBatchTitles] = useState(titles);
  if (batchTitles !== titles) {
    setBatchTitles(titles);
    setBatch(createAddBatch(titles));
  }
  const { addCopiesBatch } = useAddCopiesBatch();
  const summary = batch.summary();

  const openSummary = (open: boolean) => {
    // Cada vez que se abre, el envío se prepara de nuevo con lo que lleva el lote ahora; cerrado no hay nada pendiente.
    prepared.current = open ? prepareAddCopies(batch, receivedAt) : null;
    setSummaryOpen(open);
  };

  const confirm = async () => {
    const input = prepared.current ?? prepareAddCopies(batch, receivedAt);
    prepared.current = input;
    const result = await addCopiesBatch(input);
    if (!result.ok) {
      toast.show({
        message: appErrorMessage(result.error).message,
        tone: 'error',
        action: { label: copy.errors.retry, onAction: () => setSummaryOpen(true) },
      });
      // Que el diálogo no se cierre: el lote sigue ahí para reintentar con los mismos identificadores.
      throw new Error(result.error.code);
    }
    toast.show({ message: copy.inventory.addCopies.result.added(summary.total), tone: 'success' });
    prepared.current = null;
    router.push(ROUTES.inventory);
  };

  const screen = (
    <AddCopiesScreen
      groups={shown.data?.groups ?? []}
      loading={shown.isPending}
      search={search}
      onSearchChange={setSearch}
      quantityOf={batch.quantityOf}
      onAdd={(id) => setBatch((current) => current.increment(id))}
      onRemove={(id) => setBatch((current) => current.decrement(id))}
      onSetQuantity={(id, quantity) => setBatch((current) => current.setQuantity(id, quantity))}
      summary={summary}
      receivedAt={receivedAt}
      onReceivedAtChange={setReceivedAt}
      today={today}
      isOnline={shell.isOnline}
      banner={shell.offlineBanner}
      summaryOpen={summaryOpen}
      onSummaryOpenChange={openSummary}
      onConfirm={confirm}
      onDiscard={() => setBatch((current) => current.clear())}
      onCancel={() => router.push(ROUTES.inventory)}
    />
  );
  if (mobile) return screen;
  return (
    <ShellScreen nav={shell.nav} title={copy.inventory.addCopies.title}>
      {screen}
    </ShellScreen>
  );
}
