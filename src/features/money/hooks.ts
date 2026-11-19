'use client';

import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DepositDraftInput } from '@/domain/deposit-draft';
import type { DepositsListParams } from '@/domain/deposits-list';
import type { PaymentsListParams } from '@/domain/payments-list';
import { todayBogota } from '@/domain/time';
import { systemClock } from '@/lib/clock';
import { photoQueryKeys } from '../photos/hooks';
import { unwrap } from '../shared/app-failure';
import { useRepositories } from '../shared/repositories-provider';
import {
  addDepositReceipt,
  deleteDepositDraft,
  deleteDepositReceipt,
  loadDeposit,
  newDepositProposalFrom,
  saveDepositDraft,
} from './use-cases/deposit-draft';
import {
  loadMoneySummaryData,
  moneySummaryFrom,
  unscheduledCustomersFrom,
  type MoneySummaryData,
} from './use-cases/money-summary';
import { confirmDeposit, reopenDeposit, updateDepositNote } from './use-cases/confirm-deposit';
import { depositsListFrom } from './use-cases/deposits-list';
import { paymentsListFrom } from './use-cases/payments-list';

/** Todas las lecturas de Dinero cuelgan de `['money']`: las acciones de abonos y libros ya la invalidan. */
export const moneyQueryKeys = {
  all: ['money'] as const,
  /** Abonos, Abibonos y cuentas de los clientes: base del resumen y de la lista (una sola lectura). */
  data: ['money', 'data'] as const,
  /** Un Abibono (HU-DIN-04). */
  deposit: (depositId: string) => ['money', 'deposit', depositId] as const,
};

/**
 * Lecturas que cambian al vincular o desvincular abonos: Dinero, clientes ("Descartar" se bloquea con abonos en
 * un Abibono) y abonos.
 */
const DEPOSIT_AFFECTED_ROOTS = [['money'], ['customers'], ['payments']] as const;

function useMoneyData<T>(select: (data: MoneySummaryData) => T) {
  const { money, customers, titles } = useRepositories();
  return useQuery({
    queryKey: moneyQueryKeys.data,
    queryFn: async () => unwrap(await loadMoneySummaryData({ money, customers, titles })),
    select,
  });
}

/**
 * Resumen de Dinero (HU-DIN-02): por entregar (efectivo y transferencia), entregado, cobrado y por cobrar con
 * sus porcentajes, Dinero total, sin programar y total entregado al líder. Funciona sin conexión.
 */
export function useMoneySummary() {
  return useMoneyData((data) => moneySummaryFrom(data, todayBogota(systemClock)));
}

/** "Sin programar · N clientes": `[{ customerId, name, avatarEmoji, unscheduled }]`, por monto descendente. */
export function useUnscheduledCustomers() {
  return useMoneyData((data) => unscheduledCustomersFrom(data, todayBogota(systemClock)));
}

/**
 * De qué cliente es un abono (HU-PAN-DIN-02): `{ customerId }`, o `null` si ya no existe. Sale de la misma lectura
 * que Dinero (funciona sin conexión); el detalle del abono sale del detalle de ese cliente.
 */
export function usePaymentCustomer(paymentId: string) {
  return useMoneyData((data) => {
    const payment = data.payments.find((p) => p.id === paymentId);
    return payment ? { customerId: payment.customerId } : null;
  });
}

/**
 * Lista de abonos de clientes (HU-DIN-03): `{ counts, rows }` por vista, método, chip Vencidos, búsqueda y
 * orden (por defecto `defaultPaymentsSort(view)`). Ni el filtro ni la búsqueda cambian los conteos.
 */
export function usePaymentsList(params: PaymentsListParams) {
  return useMoneyData((data) => paymentsListFrom(data, params, todayBogota(systemClock)));
}

/**
 * Lista de Abibonos (HU-DIN-06): `{ count, totalDeliveredToLeader, rows }`; búsqueda por nombre y orden por
 * `'date' | 'total' | 'name'` (por defecto `DEFAULT_DEPOSITS_LIST_PARAMS`: fecha, más reciente primero).
 */
export function useDepositsList(params: DepositsListParams) {
  return useMoneyData((data) => depositsListFrom(data, params));
}

/**
 * Nuevo Abibono precargado (HU-DIN-04): todos los cobrados libres marcados, montos calculados, «Abibono (n)» y
 * fecha de hoy. No escribe nada (R1); el `depositId` nuevo se mantiene mientras el asistente esté abierto.
 * Recalcular al marcar y desmarcar: `recalcProposal(seleccionados)`.
 */
export function useNewDepositProposal() {
  const [depositId] = useState(() => crypto.randomUUID());
  const select = useCallback(
    (data: MoneySummaryData) => newDepositProposalFrom(data, depositId, todayBogota(systemClock)),
    [depositId],
  );
  return useMoneyData(select);
}

/** Un Abibono con su cuadre, lo calculado, recibos y lo que se puede hacer (`can`). */
export function useDeposit(depositId: string | null | undefined) {
  const { money, storage } = useRepositories();
  return useQuery({
    queryKey: moneyQueryKeys.deposit(depositId ?? ''),
    queryFn: async () => unwrap(await loadDeposit({ money, storage }, depositId!)),
    enabled: Boolean(depositId),
  });
}

/** Guarda el borrador (crea o actualiza). Devuelve `Result<{ depositId }>`. */
export function useSaveDepositDraft() {
  const { money, connectivity } = useRepositories();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: DepositDraftInput) => saveDepositDraft({ money, connectivity }, input),
    onSuccess: (result) => {
      if (!result.ok) return;
      for (const queryKey of DEPOSIT_AFFECTED_ROOTS) void queryClient.invalidateQueries({ queryKey });
    },
  });
  return { saveDepositDraft: mutation.mutateAsync, isPending: mutation.isPending };
}

/** Sube un recibo: con Abibono guardado crea la foto; en una propuesta devuelve `staged` para enviarlo al guardar. */
export function useAddDepositReceipt() {
  const repositories = useRepositories();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: { depositId: string; photoId: string; file: Blob }) =>
      addDepositReceipt(repositories, input),
    onSuccess: (result, input) => {
      if (!result.ok) return;
      void queryClient.invalidateQueries({ queryKey: moneyQueryKeys.deposit(input.depositId) });
      void queryClient.invalidateQueries({ queryKey: photoQueryKeys.usage });
    },
  });
  return { addDepositReceipt: mutation.mutateAsync, isPending: mutation.isPending };
}

/** Borra (lógico) un recibo de un borrador; en uno confirmado da `RECEIPT_LOCKED`. */
export function useDeleteDepositReceipt() {
  const { photos, connectivity } = useRepositories();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (photoId: string) => deleteDepositReceipt({ photos, connectivity }, photoId),
    onSuccess: (result) => {
      if (!result.ok) return;
      void queryClient.invalidateQueries({ queryKey: moneyQueryKeys.all });
    },
  });
  return { deleteDepositReceipt: mutation.mutateAsync, isPending: mutation.isPending };
}

/** Borra el borrador (filas y archivos de sus recibos); sus abonos quedan libres. */
export function useDeleteDepositDraft() {
  const { money, storage, connectivity } = useRepositories();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (depositId: string) => deleteDepositDraft({ money, storage, connectivity }, depositId),
    onSuccess: (result, depositId) => {
      if (!result.ok) return;
      queryClient.removeQueries({ queryKey: moneyQueryKeys.deposit(depositId) });
      for (const queryKey of DEPOSIT_AFFECTED_ROOTS) void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({ queryKey: photoQueryKeys.usage });
    },
  });
  return { deleteDepositDraft: mutation.mutateAsync, isPending: mutation.isPending };
}

/** Guarda y confirma el Abibono (desde un borrador o desde la propuesta). Devuelve `Result<{ depositId }>`. */
export function useConfirmDeposit() {
  const { money, connectivity } = useRepositories();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: DepositDraftInput) => confirmDeposit({ money, connectivity }, input),
    onSuccess: (result) => {
      if (!result.ok) return;
      for (const queryKey of DEPOSIT_AFFECTED_ROOTS) void queryClient.invalidateQueries({ queryKey });
    },
  });
  return { confirmDeposit: mutation.mutateAsync, isPending: mutation.isPending };
}

/** Cambia la nota de un borrador o de un confirmado. */
export function useUpdateDepositNote() {
  const { money, connectivity } = useRepositories();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: { depositId: string; note: string | null }) =>
      updateDepositNote({ money, connectivity }, input.depositId, input.note),
    onSuccess: (result) => {
      if (!result.ok) return;
      void queryClient.invalidateQueries({ queryKey: moneyQueryKeys.all });
    },
  });
  return { updateDepositNote: mutation.mutateAsync, isPending: mutation.isPending };
}

/** Reabre un Abibono confirmado con un motivo (HU-DIN-07). Devuelve `Result<void>`. */
export function useReopenDeposit() {
  const { money, connectivity } = useRepositories();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: { depositId: string; reason: string }) =>
      reopenDeposit({ money, connectivity }, input.depositId, input.reason),
    onSuccess: (result) => {
      if (!result.ok) return;
      for (const queryKey of DEPOSIT_AFFECTED_ROOTS) void queryClient.invalidateQueries({ queryKey });
    },
  });
  return { reopenDeposit: mutation.mutateAsync, isPending: mutation.isPending };
}
