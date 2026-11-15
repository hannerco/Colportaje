// Lista de Abibonos (HU-DIN-06): sale de la misma lectura que el resumen (HU-DIN-02); funciona sin conexión.
import {
  buildDepositsListView,
  type DepositsListParams,
  type DepositsListView,
} from '@/domain/deposits-list';
import type { MoneySummaryData } from './money-summary';

/** `{ count, totalDeliveredToLeader, rows }` con búsqueda y orden. */
export const depositsListFrom = (data: MoneySummaryData, params: DepositsListParams): DepositsListView =>
  buildDepositsListView(data.deposits, params);
