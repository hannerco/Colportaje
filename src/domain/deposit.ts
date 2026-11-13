// Abibono ("Entrega al líder"): modelo, cuadre y nombre (HU-DIN-01, BR-DEP-01..09/11/12, ADR-0010, ADR-0041).
// total, esperado y diferencia se DERIVAN aquí; nunca se guardan (R1, BR-GEN-03).
import type { COP } from './money';
import type { Payment, PayMethod } from './payment';
import type { Instant, LocalDate } from './time';

export type DepositStatus = 'draft' | 'confirmed';

export type LeaderDeposit = {
  readonly id: string;
  /** `null` = nombre automático «Abibono (n)» (BR-DEP-02). */
  readonly title: string | null;
  /** Se asigna al confirmar por primera vez y no cambia nunca (R7). `null` en un borrador nuevo. */
  readonly depositNumber: number | null;
  readonly depositDate: LocalDate;
  /** Lo realmente entregado (R1). */
  readonly cashAmount: COP;
  readonly transferAmount: COP;
  readonly note: string | null;
  readonly status: DepositStatus;
  readonly confirmedAt: Instant | null;
};

/**
 * Un aporte al esperado. Hoy solo abonos; el módulo Minibooks sumará `{ source: 'minibook', … }`
 * sin reescribir el cálculo (ADR-0041, BR-DEP-05).
 */
export type DepositContribution = {
  readonly source: 'payment';
  readonly id: string;
  readonly amount: COP;
  readonly method: PayMethod;
};

/** Aportes de los abonos vinculados: lo realmente cobrado de cada uno (BR-DEP-05). */
export const depositContributions = (
  linkedPayments: readonly Pick<Payment, 'id' | 'paidAmount' | 'method'>[],
): DepositContribution[] =>
  linkedPayments.map((p) => ({
    source: 'payment',
    id: p.id,
    amount: p.paidAmount ?? 0,
    // Un abono vinculado siempre está cobrado y tiene método (la base lo exige).
    method: p.method ?? 'cash',
  }));

const sumAmounts = (contributions: readonly DepositContribution[]): COP =>
  contributions.reduce((sum, c) => sum + c.amount, 0);

/** BR-DEP-04/05: total = efectivo + transferencia; esperado = Σ aportes; diferencia = total − esperado. */
export const depositSummary = (
  deposit: Pick<LeaderDeposit, 'cashAmount' | 'transferAmount'>,
  contributions: readonly DepositContribution[],
): { total: COP; expected: COP; difference: COP } => {
  const total = deposit.cashAmount + deposit.transferAmount;
  const expected = sumAmounts(contributions);
  return { total, expected, difference: total - expected };
};

/** BR-DEP-04: efectivo y transferencia autocalculados sumando los aportes por método. */
export const autoAmounts = (contributions: readonly DepositContribution[]): { cash: COP; transfer: COP } => ({
  cash: sumAmounts(contributions.filter((c) => c.method === 'cash')),
  transfer: sumAmounts(contributions.filter((c) => c.method === 'transfer')),
});

export const DEPOSIT_BLOCKERS = {
  NO_RECEIPT: 'NO_RECEIPT',
  TOTAL_ZERO: 'TOTAL_ZERO',
  NOTE_REQUIRED: 'NOTE_REQUIRED',
} as const;

export type DepositBlocker = (typeof DEPOSIT_BLOCKERS)[keyof typeof DEPOSIT_BLOCKERS];

/**
 * Motivos por los que aún no se puede confirmar (BR-DEP-09, BR-DEP-06, BR-PHO-03): sin foto de recibo,
 * total en 0, o diferencia distinta de 0 sin nota. Lista vacía = se puede confirmar.
 */
export const confirmBlockers = (
  deposit: Pick<LeaderDeposit, 'cashAmount' | 'transferAmount' | 'note'>,
  contributions: readonly DepositContribution[],
  receiptCount: number,
): DepositBlocker[] => {
  const { total, difference } = depositSummary(deposit, contributions);
  const blockers: DepositBlocker[] = [];
  if (receiptCount < 1) blockers.push(DEPOSIT_BLOCKERS.NO_RECEIPT);
  if (total <= 0) blockers.push(DEPOSIT_BLOCKERS.TOTAL_ZERO);
  if (difference !== 0 && !deposit.note?.trim()) blockers.push(DEPOSIT_BLOCKERS.NOTE_REQUIRED);
  return blockers;
};

/** BR-DEP-02: el mayor número asignado + 1 (1 si no hay ninguno). No depende de los nombres. */
export const nextDepositNumber = (assignedNumbers: readonly (number | null)[]): number =>
  assignedNumbers.reduce<number>((max, n) => (n !== null && n > max ? n : max), 0) + 1;

/**
 * Nombre que se muestra (BR-DEP-02): el título que escribió el usuario; si no, «Abibono (n)» con su
 * número o, en un borrador sin número, el siguiente libre (los borradores no consumen número).
 */
export const depositDisplayTitle = (
  deposit: Pick<LeaderDeposit, 'title' | 'depositNumber'>,
  nextNumber: number,
): string => {
  const title = deposit.title?.trim();
  return title ? title : `Abibono (${deposit.depositNumber ?? nextNumber})`;
};
