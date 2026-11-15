'use client';

import { useQuery } from '@tanstack/react-query';
import { todayBogota } from '@/domain/time';
import { systemClock } from '@/lib/clock';
import { unwrap } from '../shared/app-failure';
import { useRepositories } from '../shared/repositories-provider';
import { loadMoneySummaryData, moneySummaryFrom, unscheduledCustomersFrom } from './use-cases/money-summary';

/** Todas las lecturas de Dinero cuelgan de `['money']`: las acciones de abonos y libros ya la invalidan. */
export const moneyQueryKeys = {
  all: ['money'] as const,
  summaryData: ['money', 'summary-data'] as const,
};

function useMoneySummaryData<T>(select: (data: Parameters<typeof moneySummaryFrom>[0]) => T) {
  const { money, customers, titles } = useRepositories();
  return useQuery({
    queryKey: moneyQueryKeys.summaryData,
    queryFn: async () => unwrap(await loadMoneySummaryData({ money, customers, titles })),
    select,
  });
}

/**
 * Resumen de Dinero (HU-DIN-02): por entregar (efectivo y transferencia), entregado, cobrado y por cobrar con
 * sus porcentajes, Dinero total, sin programar y total entregado al líder. Funciona sin conexión.
 */
export function useMoneySummary() {
  return useMoneySummaryData((data) => moneySummaryFrom(data, todayBogota(systemClock)));
}

/** "Sin programar · N clientes": `[{ customerId, name, avatarEmoji, unscheduled }]`, por monto descendente. */
export function useUnscheduledCustomers() {
  return useMoneySummaryData((data) => unscheduledCustomersFrom(data, todayBogota(systemClock)));
}
