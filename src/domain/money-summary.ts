// Resumen de Dinero (HU-DIN-02, BR-DEP-11/14, BR-GOAL-03, ADR-0046, AF-105). Todo se deriva; nada se guarda.
import type { COP } from './money';
import { moneyAmount, type PaymentStatus, type PayMethod } from './payment';
import { compareEs, compareIds } from './text';

/** Abono tal como lo necesita el resumen (sin borrados; los de clientes descartados ya no llegan). */
export type SummaryPayment = {
  readonly status: PaymentStatus;
  readonly agreedAmount: COP | null;
  readonly paidAmount: COP | null;
  readonly method: PayMethod | null;
};

export type SummaryDeposit = {
  readonly status: 'draft' | 'confirmed';
  readonly cashAmount: COP;
  readonly transferAmount: COP;
};

export type MoneySummary = {
  /** R3: igual a lo cobrado, por método (incluye lo que está en un Abibono borrador, AF-105). */
  readonly toDeliver: { readonly total: COP; readonly cash: COP; readonly transfer: COP };
  readonly delivered: { readonly amount: COP; readonly pct: number };
  readonly collected: { readonly amount: COP; readonly pct: number };
  readonly toCollect: { readonly amount: COP; readonly pct: number };
  /** Entregado + cobrado + programado; no incluye lo sin programar (ADR-0046). */
  readonly moneyTotal: COP;
  readonly deliveredPct: number;
  /** Suma literal de lo acordado por cobrar, aunque un cliente tenga programado de más. */
  readonly scheduledTotal: COP;
  readonly unscheduledTotal: COP;
  readonly unscheduledCustomers: number;
  /** BR-DEP-11: Σ total de los Abibonos confirmados. */
  readonly totalDeliveredToLeader: COP;
};

/**
 * R2: porcentajes enteros que suman 100 por el método del resto mayor (a igual resto, el que va antes). Con
 * total 0, todos 0.
 */
export const percentagesSummingTo100 = (amounts: readonly COP[]): number[] => {
  const total = amounts.reduce((sum, a) => sum + a, 0);
  if (total === 0) return amounts.map(() => 0);
  const exact = amounts.map((a) => (a * 100) / total);
  const result = exact.map(Math.floor);
  let missing = 100 - result.reduce((sum, p) => sum + p, 0);
  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (const { index } of byRemainder) {
    if (missing === 0) break;
    result[index]! += 1;
    missing -= 1;
  }
  return result;
};

/**
 * El resumen. `unscheduled` es lo sin programar de cada cliente (de su cuenta, HU-CLI-01); los cancelados y
 * los borrados nunca cuentan (R1); los de clientes archivados sí (R6).
 */
export const computeMoneySummary = (
  payments: readonly SummaryPayment[],
  unscheduled: readonly COP[],
  deposits: readonly SummaryDeposit[],
): MoneySummary => {
  let delivered = 0;
  let cash = 0;
  let transfer = 0;
  let toCollect = 0;
  for (const p of payments) {
    // R1: real si cobrado o entregado, acordado si por cobrar, 0 si cancelado (moneyAmount, ADR-0046).
    const amount = moneyAmount(p);
    if (p.status === 'delivered') delivered += amount;
    else if (p.status === 'scheduled') toCollect += amount;
    else if (p.status === 'collected' && p.method === 'cash') cash += amount;
    else if (p.status === 'collected') transfer += amount;
  }
  const collected = cash + transfer;
  const [deliveredPct, collectedPct, toCollectPct] = percentagesSummingTo100([
    delivered,
    collected,
    toCollect,
  ]) as [number, number, number];
  return {
    toDeliver: { total: collected, cash, transfer },
    delivered: { amount: delivered, pct: deliveredPct },
    collected: { amount: collected, pct: collectedPct },
    toCollect: { amount: toCollect, pct: toCollectPct },
    moneyTotal: delivered + collected + toCollect,
    deliveredPct,
    scheduledTotal: toCollect,
    unscheduledTotal: unscheduled.reduce((sum, u) => sum + u, 0),
    unscheduledCustomers: unscheduled.filter((u) => u > 0).length,
    totalDeliveredToLeader: deposits
      .filter((d) => d.status === 'confirmed')
      .reduce((sum, d) => sum + d.cashAmount + d.transferAmount, 0),
  };
};

export type UnscheduledCustomer = {
  readonly customerId: string;
  readonly name: string;
  readonly avatarEmoji: string | null;
  readonly unscheduled: COP;
};

/** "Sin programar · N clientes": los que tienen sin programar > 0, por monto descendente (luego nombre e id). */
export const unscheduledCustomersList = (customers: readonly UnscheduledCustomer[]): UnscheduledCustomer[] =>
  customers
    .filter((c) => c.unscheduled > 0)
    .sort(
      (a, b) =>
        b.unscheduled - a.unscheduled || compareEs(a.name, b.name) || compareIds(a.customerId, b.customerId),
    );
