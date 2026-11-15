'use client';

import { useQuery } from '@tanstack/react-query';
import type { PaymentsListParams } from '@/domain/payments-list';
import { todayBogota } from '@/domain/time';
import { systemClock } from '@/lib/clock';
import { unwrap } from '../shared/app-failure';
import { useRepositories } from '../shared/repositories-provider';
import {
  loadMoneySummaryData,
  moneySummaryFrom,
  unscheduledCustomersFrom,
  type MoneySummaryData,
} from './use-cases/money-summary';
import { paymentsListFrom } from './use-cases/payments-list';

/** Todas las lecturas de Dinero cuelgan de `['money']`: las acciones de abonos y libros ya la invalidan. */
export const moneyQueryKeys = {
  all: ['money'] as const,
  /** Abonos, Abibonos y cuentas de los clientes: base del resumen y de la lista (una sola lectura). */
  data: ['money', 'data'] as const,
};

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
 * Lista de abonos de clientes (HU-DIN-03): `{ counts, rows }` por vista, método, chip Vencidos, búsqueda y
 * orden (por defecto `defaultPaymentsSort(view)`). Ni el filtro ni la búsqueda cambian los conteos.
 */
export function usePaymentsList(params: PaymentsListParams) {
  return useMoneyData((data) => paymentsListFrom(data, params, todayBogota(systemClock)));
}
