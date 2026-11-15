// Lista de clientes (HU-CLI-04, BR-CUS-05/13, BR-GEN-14, BR-GOAL-03 #8). La cuenta de cada cliente se
// deriva aquí con computeCustomerAccount; nada se guarda (BR-GEN-03).
import { computeCustomerAccount, type AccountPayment, type PaymentStanding, type SoldCopy } from './customer';
import type { SortDir } from './copies-list';
import type { COP } from './money';
import { compareEs, compareIds } from './text';
import type { Instant, LocalDate } from './time';

export type CustomerListTab = 'all' | 'debtors' | 'settled' | 'archived';
export type { SortDir };
export type CustomerSortKey = 'recent' | 'modified' | 'name' | 'balance' | 'next_due';

export type CustomerListParams = {
  readonly tab: CustomerListTab;
  /** "Incluir prospectos": solo aplica en Todos. */
  readonly includeProspects: boolean;
  /** Vacío = sin filtro. */
  readonly statusFilter: readonly PaymentStanding[];
  readonly sort: { readonly key: CustomerSortKey; readonly dir: SortDir };
};

/** R4: sentido por defecto de cada criterio. */
export const DEFAULT_SORT_DIR: Readonly<Record<CustomerSortKey, SortDir>> = {
  recent: 'desc',
  modified: 'desc',
  name: 'asc',
  balance: 'desc',
  next_due: 'asc',
};

/** Por defecto: Todos, sin prospectos ni filtro, Más recientes descendente. */
export const DEFAULT_CUSTOMER_LIST_PARAMS: CustomerListParams = {
  tab: 'all',
  includeProspects: false,
  statusFilter: [],
  sort: { key: 'recent', dir: 'desc' },
};

/** Datos propios del cliente (no borrado; los descartados no llegan aquí). */
export type CustomerListCustomer = {
  readonly id: string;
  readonly name: string;
  readonly avatarEmoji: string | null;
  readonly phone: string | null;
  readonly createdAt: Instant;
  readonly updatedAt: Instant;
  readonly archived: boolean;
};

/** Lo que hace falta para la cuenta y la columna Libro(s): ejemplares vendidos con su título y abonos. */
export type CustomerListAccountData = {
  readonly customerId: string;
  readonly soldCopies: readonly (SoldCopy & { readonly copyId: string; readonly titleName: string })[];
  readonly payments: readonly AccountPayment[];
};

export type CustomerListRow = {
  readonly id: string;
  readonly name: string;
  readonly avatarEmoji: string | null;
  readonly phone: string | null;
  /** R5: título del vendido más reciente y cuántos más; `null` en prospectos. */
  readonly books: { readonly title: string; readonly extraCount: number } | null;
  readonly isProspect: boolean;
  /** Saldo pendiente; negativo = saldo a favor. */
  readonly balance: COP;
  readonly credit: COP;
  readonly lastPaymentAt: LocalDate | null;
  /** `null` en prospectos (BR-CUS-13). */
  readonly standing: PaymentStanding | null;
  readonly archived: boolean;
};

export type CustomerListView = {
  readonly counts: {
    readonly all: number;
    readonly debtors: number;
    readonly settled: number;
    readonly archived: number;
  };
  readonly statusCounts: { readonly current: number; readonly overdue: number; readonly settled: number };
  readonly isDefaultView: boolean;
  readonly rows: readonly CustomerListRow[];
};

type Item = {
  readonly row: CustomerListRow;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly nextDueDate: LocalDate | null;
};

/** R1: a qué pestaña pertenece cada cliente. */
const inTab = (tab: CustomerListTab, includeProspects: boolean, row: CustomerListRow): boolean => {
  switch (tab) {
    case 'all':
      return !row.archived && (!row.isProspect || includeProspects);
    case 'debtors':
      return !row.archived && (row.standing === 'overdue' || row.standing === 'current');
    case 'settled':
      return !row.archived && row.standing === 'settled';
    case 'archived':
      return row.archived;
  }
};

/** Valor del criterio de orden; `null` = vacío (va al final en ambos sentidos, BR-GEN-14). */
const sortValue = (key: CustomerSortKey, item: Item): number | string | null => {
  switch (key) {
    case 'recent':
      return item.createdAt;
    case 'modified':
      return item.updatedAt;
    case 'name':
      return item.row.name;
    case 'balance':
      // Un prospecto no tiene saldo pendiente que mostrar ("—"): es un vacío.
      return item.row.isProspect ? null : item.row.balance;
    case 'next_due':
      return item.nextDueDate;
  }
};

const compareValues = (key: CustomerSortKey, a: number | string, b: number | string): number =>
  key === 'name' ? compareEs(String(a), String(b)) : a < b ? -1 : a > b ? 1 : 0;

const comparator =
  (sort: CustomerListParams['sort']) =>
  (a: Item, b: Item): number => {
    const x = sortValue(sort.key, a);
    const y = sortValue(sort.key, b);
    if (x === null || y === null) {
      if (x !== y) return x === null ? 1 : -1; // vacíos al final en ambos sentidos
    } else {
      const primary = compareValues(sort.key, x, y) * (sort.dir === 'asc' ? 1 : -1);
      if (primary !== 0) return primary;
    }
    // Desempate: nombre en español y, al final, id (00-REGLAS-COMUNES §7).
    return compareEs(a.row.name, b.row.name) || compareIds(a.row.id, b.row.id);
  };

/** R5: el vendido más reciente (desempate determinista por id) y cuántos más. */
const booksOf = (copies: CustomerListAccountData['soldCopies']): CustomerListRow['books'] => {
  if (copies.length === 0) return null;
  const latest = copies.reduce((a, b) => {
    const diff = b.soldAt.getTime() - a.soldAt.getTime();
    return diff > 0 || (diff === 0 && compareIds(b.copyId, a.copyId) > 0) ? b : a;
  });
  return { title: latest.titleName, extraCount: copies.length - 1 };
};

/** R6: el botón Restablecer aparece si algo difiere del valor por defecto (la pestaña no cuenta). */
export const isDefaultCustomerListView = (params: CustomerListParams): boolean =>
  params.sort.key === DEFAULT_CUSTOMER_LIST_PARAMS.sort.key &&
  params.sort.dir === DEFAULT_CUSTOMER_LIST_PARAMS.sort.dir &&
  params.statusFilter.length === 0 &&
  params.includeProspects === DEFAULT_CUSTOMER_LIST_PARAMS.includeProspects;

/**
 * Lista de clientes lista para pintar: pestaña → filtro de estado → orden. Los conteos de las pestañas no
 * dependen del filtro (R2) y `statusCounts` cuenta los no archivados por estado (R3). `accounts` trae los
 * ejemplares vendidos y abonos de cada cliente (sin borrados); un cliente sin entrada es un prospecto sin
 * abonos. `today` (Bogotá) decide qué abonos están vencidos.
 */
export const buildCustomerListView = (
  customers: readonly CustomerListCustomer[],
  accounts: readonly CustomerListAccountData[],
  params: CustomerListParams,
  today: LocalDate,
): CustomerListView => {
  const dataById = new Map(accounts.map((a) => [a.customerId, a]));

  const items: Item[] = customers.map((customer) => {
    const data = dataById.get(customer.id);
    const soldCopies = data?.soldCopies ?? [];
    const account = computeCustomerAccount(
      { customer: { createdAt: customer.createdAt }, soldCopies, payments: data?.payments ?? [] },
      today,
    );
    return {
      createdAt: customer.createdAt.getTime(),
      updatedAt: customer.updatedAt.getTime(),
      nextDueDate: account.nextDueDate,
      row: {
        id: customer.id,
        name: customer.name,
        avatarEmoji: customer.avatarEmoji,
        phone: customer.phone,
        books: booksOf(soldCopies),
        isProspect: account.isProspect,
        balance: account.balance,
        credit: account.credit,
        lastPaymentAt: account.lastPaymentAt,
        standing: account.standing,
        archived: customer.archived,
      },
    };
  });

  const countTab = (tab: CustomerListTab) =>
    items.filter((i) => inTab(tab, params.includeProspects, i.row)).length;
  const active = items.filter((i) => !i.row.archived);
  const countStanding = (standing: PaymentStanding) =>
    active.filter((i) => i.row.standing === standing).length;

  const statuses = new Set(params.statusFilter);
  const rows = items
    .filter(
      (i) =>
        inTab(params.tab, params.includeProspects, i.row) &&
        (statuses.size === 0 || (i.row.standing !== null && statuses.has(i.row.standing))),
    )
    .sort(comparator(params.sort))
    .map((i) => i.row);

  return {
    counts: {
      all: countTab('all'),
      debtors: countTab('debtors'),
      settled: countTab('settled'),
      archived: countTab('archived'),
    },
    statusCounts: {
      current: countStanding('current'),
      overdue: countStanding('overdue'),
      settled: countStanding('settled'),
    },
    isDefaultView: isDefaultCustomerListView(params),
    rows,
  };
};
