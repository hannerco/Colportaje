// Lista de Abibonos (HU-DIN-06, BR-DEP-11/14, BR-GEN-14): conteo, total abonado al líder, búsqueda y orden.
import { depositDisplayTitle, nextDepositNumber, type DepositStatus } from './deposit';
import type { COP } from './money';
import type { SummaryDeposit } from './money-summary';
import { compareEs, compareIds, normalizeForSearch } from './text';
import type { LocalDate } from './time';

/** Un Abibono de la lectura de Dinero (no borrado; borrador o confirmado). */
export type MoneyDeposit = SummaryDeposit & {
  readonly id: string;
  /** `null` = nombre automático «Abibono (n)». */
  readonly title: string | null;
  /** `null` en un borrador que nunca se confirmó. */
  readonly depositNumber: number | null;
  readonly depositDate: LocalDate;
  /** R3: al menos una foto de recibo activa. */
  readonly hasReceipt: boolean;
};

export type DepositsSortKey = 'date' | 'total' | 'name';

export type DepositsListParams = {
  readonly search: string;
  readonly sort: { readonly key: DepositsSortKey; readonly dir: 'asc' | 'desc' };
};

/** Por defecto: fecha, más reciente primero. */
export const DEFAULT_DEPOSITS_LIST_PARAMS: DepositsListParams = {
  search: '',
  sort: { key: 'date', dir: 'desc' },
};

export type DepositsListRow = {
  readonly depositId: string;
  /** El nombre que se muestra, incluido el automático «Abibono (n)» (R5). */
  readonly title: string;
  readonly depositDate: LocalDate;
  readonly total: COP;
  readonly cash: COP;
  readonly transfer: COP;
  readonly status: DepositStatus;
  readonly hasReceipt: boolean;
};

export type DepositsListView = {
  /** Todos los Abibonos (la búsqueda no lo cambia). */
  readonly count: number;
  /** R2 / BR-DEP-11: Σ total de los confirmados. */
  readonly totalDeliveredToLeader: COP;
  readonly rows: readonly DepositsListRow[];
};

const primary = (key: DepositsSortKey, a: DepositsListRow, b: DepositsListRow): number => {
  if (key === 'date') return a.depositDate < b.depositDate ? -1 : a.depositDate > b.depositDate ? 1 : 0;
  if (key === 'total') return a.total - b.total;
  return compareEs(a.title, b.title);
};

/**
 * R1–R5: borradores y confirmados con su nombre que se muestra (los borradores sin título sugieren el siguiente
 * número libre); búsqueda por ese nombre sin tildes ni mayúsculas; orden por fecha, total o nombre (los números
 * como números). El sentido solo aplica a la clave elegida; los empates van por nombre ascendente y luego id.
 */
export const buildDepositsListView = (
  deposits: readonly MoneyDeposit[],
  params: DepositsListParams,
): DepositsListView => {
  const nextNumber = nextDepositNumber(deposits.map((d) => d.depositNumber));
  const all: DepositsListRow[] = deposits.map((d) => ({
    depositId: d.id,
    title: depositDisplayTitle(d, nextNumber),
    depositDate: d.depositDate,
    total: d.cashAmount + d.transferAmount,
    cash: d.cashAmount,
    transfer: d.transferAmount,
    status: d.status,
    hasReceipt: d.hasReceipt,
  }));
  const query = normalizeForSearch(params.search);
  const sign = params.sort.dir === 'asc' ? 1 : -1;
  const rows = all
    .filter((r) => normalizeForSearch(r.title).includes(query))
    .sort(
      (a, b) =>
        primary(params.sort.key, a, b) * sign ||
        compareEs(a.title, b.title) ||
        compareIds(a.depositId, b.depositId),
    );
  return {
    count: all.length,
    totalDeliveredToLeader: all.filter((r) => r.status === 'confirmed').reduce((sum, r) => sum + r.total, 0),
    rows,
  };
};
