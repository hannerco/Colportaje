// Nuevo Abibono precargado, borradores y lectura de un Abibono (HU-DIN-04, BR-DEP-02/03/04/08/10/13, AF-106).
// La propuesta se arma aquí, en el teléfono, sin escribir nada en la base (R1).
import {
  autoAmounts,
  confirmBlockers,
  depositContributions,
  depositDisplayTitle,
  depositSummary,
  nextDepositNumber,
  type DepositBlocker,
  type DepositStatus,
  type LeaderDeposit,
} from './deposit';
import { isValidCOP, type COP } from './money';
import type { MoneyDeposit } from './deposits-list';
import type { PayMethod } from './payment';
import type { ListPayment } from './payments-list';
import { validationError, type AppError } from './shared/errors';
import { err, ok, type Result } from './shared/result';
import { compareEs, compareIds } from './text';
import { parseLocalDate, type LocalDate } from './time';

export const DEPOSIT_DRAFT_ERROR_CODES = {
  /** Algún abono ya no está cobrado o ya está en otro Abibono (`details.paymentIds`). */
  PAYMENT_NOT_AVAILABLE: 'PAYMENT_NOT_AVAILABLE',
  /** El Abibono está confirmado (o fue confirmado alguna vez, al borrarlo). */
  DEPOSIT_NOT_DRAFT: 'DEPOSIT_NOT_DRAFT',
  /** Un recibo de un Abibono confirmado no se borra (BR-PHO-03). */
  RECEIPT_LOCKED: 'RECEIPT_LOCKED',
} as const;

/** Los montos se guardan en `integer` de Postgres. */
const MAX_AMOUNT = 2_147_483_647;

/** Un abono cobrado tal como se muestra en el Abibono. */
export type DepositPayment = {
  readonly paymentId: string;
  readonly customerName: string;
  readonly paidAt: LocalDate;
  readonly paidAmount: COP;
  readonly method: PayMethod;
};

/** Lo que el usuario sube a una propuesta que aún no existe en la base (R7): se envía al guardar o confirmar. */
export type StagedReceipt = {
  readonly photoId: string;
  readonly path: string;
  readonly thumbPath: string;
  readonly bytes: number;
};

/** BR-DEP-04: efectivo y transferencia sumando los marcados por método; esperado = la suma. */
export const recalcProposal = (
  selected: readonly Pick<DepositPayment, 'paymentId' | 'paidAmount' | 'method'>[],
): { cash: COP; transfer: COP; expected: COP } => {
  const contributions = depositContributions(
    selected.map((p) => ({ id: p.paymentId, paidAmount: p.paidAmount, method: p.method })),
  );
  const { cash, transfer } = autoAmounts(contributions);
  return { cash, transfer, expected: cash + transfer };
};

/** Fecha real más reciente primero; desempate por cliente y luego id. */
const sortDepositPayments = (rows: DepositPayment[]): DepositPayment[] =>
  rows.sort(
    (a, b) =>
      (a.paidAt < b.paidAt ? 1 : a.paidAt > b.paidAt ? -1 : 0) ||
      compareEs(a.customerName, b.customerName) ||
      compareIds(a.paymentId, b.paymentId),
  );

/** Un abono cobrado con su cliente, en la forma del Abibono. */
export const toDepositPayment = (
  payment: Pick<ListPayment, 'id' | 'paidAt' | 'paidAmount' | 'method'>,
  customerName: string,
): DepositPayment => ({
  paymentId: payment.id,
  customerName,
  // Un cobrado siempre tiene fecha real, valor y método (la base lo exige).
  paidAt: payment.paidAt ?? ('' as LocalDate),
  paidAmount: payment.paidAmount ?? 0,
  method: payment.method ?? 'cash',
});

export type NewDepositProposal = {
  readonly depositId: string;
  readonly title: null;
  readonly displayTitle: string;
  readonly depositDate: LocalDate;
  readonly available: readonly DepositPayment[];
  readonly selectedIds: readonly string[];
  readonly cash: COP;
  readonly transfer: COP;
  readonly expected: COP;
};

/**
 * R1 / BR-DEP-13: todos los cobrados que no están en ningún Abibono, marcados; montos calculados; nombre
 * «Abibono (n)» con el siguiente número libre y fecha de hoy. Solo entran abonos de `customers` (vivos).
 */
export const buildNewDepositProposal = (input: {
  depositId: string;
  payments: readonly ListPayment[];
  customers: readonly { id: string; name: string }[];
  deposits: readonly Pick<MoneyDeposit, 'depositNumber'>[];
  today: LocalDate;
}): NewDepositProposal => {
  const nameOf = new Map(input.customers.map((c) => [c.id, c.name]));
  const available = sortDepositPayments(
    input.payments
      .filter((p) => p.status === 'collected' && p.depositId === null && nameOf.has(p.customerId))
      .map((p) => toDepositPayment(p, nameOf.get(p.customerId)!)),
  );
  return {
    depositId: input.depositId,
    title: null,
    displayTitle: depositDisplayTitle(
      { title: null, depositNumber: null },
      nextDepositNumber(input.deposits.map((d) => d.depositNumber)),
    ),
    depositDate: input.today,
    available,
    selectedIds: available.map((p) => p.paymentId),
    ...recalcProposal(available),
  };
};

export type DepositDraftInput = {
  readonly depositId: string;
  /** `null` o vacío = nombre automático. */
  readonly title: string | null;
  readonly depositDate: string;
  readonly paymentIds: readonly string[];
  readonly cash: number;
  readonly transfer: number;
  readonly note: string | null;
  readonly stagedReceipts: readonly StagedReceipt[];
};

export type ValidDepositDraft = Omit<DepositDraftInput, 'depositDate'> & { readonly depositDate: LocalDate };

const isAmount = (n: number) => isValidCOP(n) && n <= MAX_AMOUNT;
const blankToNull = (text: string | null) => {
  const trimmed = text?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
};

/** R3 / R4: montos enteros ≥ 0, fecha válida; título y nota sin espacios sobrantes (vacío = `null`). */
export const validateDepositDraft = (input: DepositDraftInput): Result<ValidDepositDraft, AppError> => {
  const date = parseLocalDate(input.depositDate);
  if (!date.ok) return err(validationError('depositDate'));
  if (!isAmount(input.cash)) return err(validationError('cash'));
  if (!isAmount(input.transfer)) return err(validationError('transfer'));
  return ok({
    ...input,
    title: blankToNull(input.title),
    note: blankToNull(input.note),
    depositDate: date.value,
    paymentIds: [...new Set(input.paymentIds)],
  });
};

export type DepositView = {
  readonly id: string;
  readonly title: string | null;
  readonly displayTitle: string;
  readonly depositNumber: number | null;
  readonly depositDate: LocalDate;
  readonly status: DepositStatus;
  readonly cash: COP;
  readonly transfer: COP;
  readonly note: string | null;
  readonly payments: readonly DepositPayment[];
  readonly receipts: readonly { photoId: string; thumbUrl: string }[];
  readonly summary: { total: COP; expected: COP; difference: COP };
  /** Lo que darían los abonos vinculados (R3): "Calculado $X · Restaurar". */
  readonly calculated: { cash: COP; transfer: COP };
  /** Por qué aún no se puede confirmar (HU-DIN-01). */
  readonly blockers: readonly DepositBlocker[];
  readonly can: { edit: boolean; confirm: boolean; reopen: boolean; delete: boolean };
};

/**
 * El Abibono con su cuadre (lo escrito por el usuario frente a lo calculado). Solo se borra un borrador que
 * nunca se confirmó: uno reabierto conserva su número (BR-DEP-02).
 */
export const buildDepositView = (input: {
  deposit: LeaderDeposit;
  payments: readonly DepositPayment[];
  receipts: readonly { photoId: string; thumbUrl: string }[];
  nextNumber: number;
}): DepositView => {
  const { deposit } = input;
  const contributions = depositContributions(
    input.payments.map((p) => ({ id: p.paymentId, paidAmount: p.paidAmount, method: p.method })),
  );
  const draft = deposit.status === 'draft';
  const blockers = confirmBlockers(deposit, contributions, input.receipts.length);
  return {
    id: deposit.id,
    title: deposit.title,
    displayTitle: depositDisplayTitle(deposit, input.nextNumber),
    depositNumber: deposit.depositNumber,
    depositDate: deposit.depositDate,
    status: deposit.status,
    cash: deposit.cashAmount,
    transfer: deposit.transferAmount,
    note: deposit.note,
    payments: sortDepositPayments([...input.payments]),
    receipts: input.receipts,
    summary: depositSummary(deposit, contributions),
    calculated: autoAmounts(contributions),
    blockers,
    can: {
      edit: draft,
      confirm: draft && blockers.length === 0,
      reopen: !draft,
      delete: draft && deposit.depositNumber === null,
    },
  };
};
