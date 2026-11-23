'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { AssignableCopy } from '@/domain/assignable-copies';
import type { CustomerDetail } from '@/domain/customer-detail';
import type { COP } from '@/domain/money';
import { toBogotaDate, todayBogota, type LocalDate } from '@/domain/time';
import {
  AddBookSheet,
  useAssignableCopies,
  useAssignCopyToCustomer,
  useRemoveCopyDuringCreation,
  useUpdateSoldAt,
  chosenBookValues,
  type ChosenBook,
} from '@/features/customers';
import { useAgreedPrice } from '@/features/inventory';
import { appErrorMessage } from '@/features/shared/app-error-message';
import { ROUTES, useAppShell } from '@/features/shell';
import { systemClock } from '@/lib/clock';
import { useToast } from '@/ui/molecules/Toast';

type Props = {
  customerId: string;
  /** Los libros del cliente (de su ficha), para mostrar precio y fecha de los recién agregados. */
  books: CustomerDetail['books'];
  onClose: () => void;
};

const DELAY_MS = 600;

/**
 * Contenedor de Agregar libro (HU-PAN-CLI-04): tocar un ejemplar lo vende al cliente de una vez (ficha viva); su precio
 * acordado y su fecha de venta se escriben solos un momento después del último cambio; «Quitar» lo devuelve a físico
 * sin motivo (error de captura, HU-CLI-09 R4).
 */
export function AddBookContainer({ customerId, books, onClose }: Props) {
  const { isOnline } = useAppShell();
  const router = useRouter();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const assignable = useAssignableCopies({ search });
  const { assignCopyToCustomer } = useAssignCopyToCustomer();
  const { removeCopyDuringCreation } = useRemoveCopyDuringCreation();
  const { updateAgreedPrice } = useAgreedPrice();
  const { updateSoldAt } = useUpdateSoldAt();

  /** Agregados en esta hoja, con lo que se sabía de ellos al tocarlos. */
  const [picked, setPicked] = useState<AssignableCopy[]>([]);
  const [prices, setPrices] = useState<Record<string, COP | null>>({});
  const [soldOns, setSoldOns] = useState<Record<string, LocalDate | null>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [today] = useState(() => todayBogota(systemClock));
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const later = (key: string, run: () => void) => {
    clearTimeout(timers.current.get(key));
    timers.current.set(key, setTimeout(run, DELAY_MS));
  };
  const setError = (copyId: string, message: string | null) =>
    setErrors((current) => {
      const next = { ...current };
      if (message) next[copyId] = message;
      else delete next[copyId];
      return next;
    });

  const chosen: ChosenBook[] = picked.map((copy) => {
    const book = books.find((b) => b.copyId === copy.copyId);
    return {
      copyId: copy.copyId,
      titleName: copy.titleName,
      number: copy.number,
      ...chosenBookValues({
        typed: {
          ...(copy.copyId in prices && { agreedPrice: prices[copy.copyId]! }),
          ...(copy.copyId in soldOns && { soldOn: soldOns[copy.copyId]! }),
        },
        saved: book && { agreedPrice: book.agreedPrice, soldOn: toBogotaDate(book.soldAt) },
        publicPrice: copy.price,
        today,
      }),
      publicPrice: book?.publicPriceSnapshot ?? copy.price,
      error: errors[copy.copyId],
    };
  });
  const pickedIds = new Set(picked.map((c) => c.copyId));

  return (
    <AddBookSheet
      onClose={onClose}
      search={search}
      onSearchChange={setSearch}
      available={assignable.data?.filter((c) => !pickedIds.has(c.copyId))}
      chosen={chosen}
      isOnline={isOnline}
      onSelect={async (copyId) => {
        const copy = assignable.data?.find((c) => c.copyId === copyId);
        if (!copy) return;
        setPicked((list) => [...list, copy]);
        const result = await assignCopyToCustomer({ copyId, customerId });
        if (!result.ok) {
          setPicked((list) => list.filter((c) => c.copyId !== copyId));
          toast.show({ message: appErrorMessage(result.error).message, tone: 'error' });
        }
      }}
      onRemove={async (copyId) => {
        const result = await removeCopyDuringCreation(copyId);
        if (!result.ok) return toast.show({ message: appErrorMessage(result.error).message, tone: 'error' });
        setPicked((list) => list.filter((c) => c.copyId !== copyId));
      }}
      onPriceChange={(copyId, price) => {
        setPrices((current) => ({ ...current, [copyId]: price }));
        if (price === null) return;
        later(`price-${copyId}`, async () => {
          const result = await updateAgreedPrice({ copyId, price });
          setError(copyId, result.ok ? null : appErrorMessage(result.error).message);
        });
      }}
      onSoldOnChange={(copyId, soldOn) => {
        setSoldOns((current) => ({ ...current, [copyId]: soldOn }));
        if (soldOn === null) return;
        later(`sold-${copyId}`, async () => {
          const result = await updateSoldAt({ copyId, soldOn });
          setError(copyId, result.ok ? null : appErrorMessage(result.error).message);
        });
      }}
      onAddToInventory={() => router.push(ROUTES.addToInventory)}
      backHref={ROUTES.customers}
    />
  );
}
