'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { AssignableCopy } from '@/domain/assignable-copies';
import type { COP } from '@/domain/money';
import type { LocalDate } from '@/domain/time';
import { AddBookSheet, useAssignableCopies } from '@/features/customers';
import { ROUTES, useAppShell } from '@/features/shell';

/** Un libro elegido para el cliente nuevo: sigue En físico hasta guardar (ronda 35, #57). */
export type DraftBook = AssignableCopy & { readonly agreedPrice: COP | null; readonly soldOn: LocalDate };

type Props = {
  books: readonly DraftBook[];
  onChange: (books: readonly DraftBook[]) => void;
  today: LocalDate;
  onClose: () => void;
};

/**
 * «Agregar libro» mientras se crea un cliente (ronda 35, #57): elegir, quitar y cambiar precio o fecha solo cambia lo
 * que está en el teléfono. Nada se vende ni queda en el historial hasta «Guardar cliente».
 */
export function DraftBooksContainer({ books, onChange, today, onClose }: Props) {
  const { isOnline } = useAppShell();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const assignable = useAssignableCopies({ search });
  const chosenIds = new Set(books.map((b) => b.copyId));
  const patch = (copyId: string, change: Partial<DraftBook>) =>
    onChange(books.map((b) => (b.copyId === copyId ? { ...b, ...change } : b)));

  return (
    <AddBookSheet
      onClose={onClose}
      search={search}
      onSearchChange={setSearch}
      available={assignable.data?.filter((c) => !chosenIds.has(c.copyId))}
      chosen={books.map((b) => ({
        copyId: b.copyId,
        titleName: b.titleName,
        imageUrl: b.imageUrl,
        number: b.number,
        agreedPrice: b.agreedPrice,
        publicPrice: b.price,
        soldOn: b.soldOn,
      }))}
      isOnline={isOnline}
      onSelect={(copyId) => {
        const copy = assignable.data?.find((c) => c.copyId === copyId);
        if (copy) onChange([...books, { ...copy, agreedPrice: copy.price, soldOn: today }]);
      }}
      onRemove={(copyId) => onChange(books.filter((b) => b.copyId !== copyId))}
      onPriceChange={(copyId, agreedPrice) => patch(copyId, { agreedPrice })}
      onSoldOnChange={(copyId, soldOn) => soldOn && patch(copyId, { soldOn })}
      onAddToInventory={() => router.push(ROUTES.addToInventory)}
      backHref={ROUTES.customers}
    />
  );
}
