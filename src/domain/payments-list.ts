// Lista de abonos de clientes (HU-DIN-03, BR-DEP-14, BR-PAY-02/08, BR-GEN-14, ADR-0046, AF-47).
import type { COP } from './money';
import { displayAgreed, isOverdue, overdueDays, type Payment, type PayMethod } from './payment';
import { compareEs, compareIds, normalizeForSearch } from './text';
import type { LocalDate } from './time';

export type PaymentsView = 'all' | 'to_collect' | 'to_deliver' | 'delivered' | 'canceled';
export type PaymentsSortKey = 'agreed_date' | 'paid_date' | 'agreed_amount' | 'paid_amount' | 'customer';
export type PaymentsSortDir = 'asc' | 'desc';

export type PaymentsListParams = {
  readonly view: PaymentsView;
  /** `null` = sin filtro. Se ignora en Por cobrar y Cancelados (R3). */
  readonly method: PayMethod | null;
  /** Chip "Vencidos": solo aplica en Por cobrar (R3). */
  readonly overdueOnly: boolean;
  readonly search: string;
  readonly sort: { readonly key: PaymentsSortKey; readonly dir: PaymentsSortDir };
};

/** Por defecto fecha acordada descendente; en Por cobrar, ascendente (la más antigua primero). */
export const defaultPaymentsSort = (view: PaymentsView): PaymentsListParams['sort'] => ({
  key: 'agreed_date',
  dir: view === 'to_collect' ? 'asc' : 'desc',
});

export const DEFAULT_PAYMENTS_LIST_PARAMS: PaymentsListParams = {
  view: 'all',
  method: null,
  overdueOnly: false,
  search: '',
  sort: defaultPaymentsSort('all'),
};

/** Abono tal como lo necesita la lista: el del dominio más el Abibono en el que está (si alguno). */
export type ListPayment = Payment & { readonly depositId: string | null };

export type PaymentsListCustomer = {
  readonly id: string;
  readonly name: string;
  readonly avatarEmoji: string | null;
  readonly archived: boolean;
};

export type PaymentsListRow = {
  readonly paymentId: string;
  readonly customer: PaymentsListCustomer;
  readonly kind: Payment['kind'];
  readonly status: Payment['status'];
  /** R4: de `displayAgreed` (la cuota inicial y el abono extra muestran sus valores reales). */
  readonly agreedAmount: COP;
  readonly agreedDate: LocalDate | null;
  readonly paidAt: LocalDate | null;
  readonly paidAmount: COP | null;
  readonly method: PayMethod | null;
  readonly isOverdue: boolean;
  readonly overdueDays: number;
  /** Cobrado y metido en un Abibono que aún es borrador (sigue contando por entregar, AF-105). */
  readonly inDraftDeposit: boolean;
  /** R6: solo por cobrar (y de un cliente no archivado). */
  readonly canCollect: boolean;
};

export type PaymentsListView = {
  readonly counts: {
    readonly all: number;
    readonly toCollect: number;
    readonly toDeliver: number;
    readonly delivered: number;
    readonly canceled: number;
  };
  readonly rows: readonly PaymentsListRow[];
};

const STATUS_OF_VIEW: Readonly<Record<Exclude<PaymentsView, 'all'>, Payment['status']>> = {
  to_collect: 'scheduled',
  to_deliver: 'collected',
  delivered: 'delivered',
  canceled: 'canceled',
};

/** R1: Todos = por cobrar + cobrados + entregados (sin cancelados). */
const inView = (view: PaymentsView, status: Payment['status']): boolean =>
  view === 'all' ? status !== 'canceled' : STATUS_OF_VIEW[view] === status;

/** Valor del criterio de orden; `null` = vacío (al final en ambos sentidos, R5). */
const sortValue = (key: PaymentsSortKey, row: PaymentsListRow): string | number | null => {
  switch (key) {
    case 'agreed_date':
      return row.agreedDate;
    case 'paid_date':
      return row.paidAt;
    case 'agreed_amount':
      return row.agreedAmount;
    case 'paid_amount':
      return row.paidAmount;
    case 'customer':
      return row.customer.name;
  }
};

const comparator =
  (sort: PaymentsListParams['sort']) =>
  (a: PaymentsListRow, b: PaymentsListRow): number => {
    const x = sortValue(sort.key, a);
    const y = sortValue(sort.key, b);
    if (x === null || y === null) {
      if (x !== y) return x === null ? 1 : -1;
    } else {
      const primary =
        (sort.key === 'customer' ? compareEs(String(x), String(y)) : x < y ? -1 : x > y ? 1 : 0) *
        (sort.dir === 'asc' ? 1 : -1);
      if (primary !== 0) return primary;
    }
    return compareEs(a.customer.name, b.customer.name) || compareIds(a.paymentId, b.paymentId);
  };

/**
 * La lista lista para pintar: vista → método → Vencidos → búsqueda → orden. Los conteos no dependen del
 * método, la búsqueda ni el chip (R2). Los abonos de clientes que no están en `customers` (descartados) no
 * aparecen (R1).
 */
export const buildPaymentsListView = (
  payments: readonly ListPayment[],
  customers: readonly PaymentsListCustomer[],
  params: PaymentsListParams,
  today: LocalDate,
): PaymentsListView => {
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const all: PaymentsListRow[] = [];
  for (const p of payments) {
    const customer = customerById.get(p.customerId);
    if (!customer) continue; // cliente descartado (R1); los abonos borrados ya no llegan
    const agreed = displayAgreed(p);
    all.push({
      paymentId: p.id,
      customer,
      kind: p.kind,
      status: p.status,
      agreedAmount: agreed.amount,
      agreedDate: agreed.date,
      paidAt: p.paidAt,
      paidAmount: p.paidAmount,
      method: p.method,
      isOverdue: isOverdue(p, today),
      overdueDays: overdueDays(p, today),
      inDraftDeposit: p.status === 'collected' && p.depositId !== null,
      canCollect: p.status === 'scheduled' && !customer.archived,
    });
  }

  const count = (status: Payment['status']) => all.filter((r) => r.status === status).length;
  const counts = {
    all: all.filter((r) => r.status !== 'canceled').length,
    toCollect: count('scheduled'),
    toDeliver: count('collected'),
    delivered: count('delivered'),
    canceled: count('canceled'),
  };

  const usesMethod = params.view !== 'to_collect' && params.view !== 'canceled';
  const query = normalizeForSearch(params.search);
  const rows = all
    .filter(
      (r) =>
        inView(params.view, r.status) &&
        (!usesMethod || params.method === null || r.method === params.method) &&
        (params.view !== 'to_collect' || !params.overdueOnly || r.isOverdue) &&
        (!query || normalizeForSearch(r.customer.name).includes(query)),
    )
    .sort(comparator(params.sort));
  return { counts, rows };
};
