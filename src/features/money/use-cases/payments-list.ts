// Lista de abonos de clientes (HU-DIN-03): sale de la misma lectura que el resumen (HU-DIN-02).
import {
  buildPaymentsListView,
  type PaymentsListParams,
  type PaymentsListView,
} from '@/domain/payments-list';
import type { LocalDate } from '@/domain/time';
import type { MoneySummaryData } from './money-summary';

/** La lista con sus conteos; cada abono con su cliente (nombre, emoji y si está archivado, AF-47). */
export const paymentsListFrom = (
  data: MoneySummaryData,
  params: PaymentsListParams,
  today: LocalDate,
): PaymentsListView =>
  buildPaymentsListView(
    data.payments,
    data.customers.customers.map((c) => ({
      id: c.id,
      name: c.name,
      avatarEmoji: c.avatarEmoji,
      archived: c.archived,
    })),
    params,
    today,
  );
