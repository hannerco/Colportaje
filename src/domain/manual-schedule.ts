// Abonos a mano (ronda 38, ADR-0052): sin plan automático. El colportor arma cada abono con la fecha y el valor que
// quiera; nada bloquea, todo es aviso. Aquí, la lista mientras se arma, el totalizador y los avisos.
import { businessConfig } from './config/business-config';
import type { COP } from './money';
import { addMonthsClamped, daysBetween, isPastDate, type LocalDate } from './time';

/** Un abono mientras se arma (Nuevo cliente, o uno recién agregado en la ficha): puede no tener fecha ni valor. */
export type ScheduleDraftRow = {
  readonly id: string;
  readonly dueDate: LocalDate | null;
  readonly amount: COP;
};

/** Por fecha; los que aún no tienen fecha van al final, en el orden en que se agregaron. */
export const sortByDueDate = <T extends { readonly dueDate: LocalDate | null }>(rows: readonly T[]): T[] =>
  rows
    .map((row, i) => ({ row, i }))
    .sort((a, b) => {
      if (a.row.dueDate === b.row.dueDate) return a.i - b.i;
      if (a.row.dueDate === null) return 1;
      if (b.row.dueDate === null) return -1;
      return a.row.dueDate < b.row.dueDate ? -1 : 1;
    })
    .map(({ row }) => row);

/** «+ Agregar abono» propone lo que falta por programar; $0 si ya está cubierto (o de más). */
export const proposedAmount = (pending: COP, scheduled: COP): COP => Math.max(0, pending - scheduled);

/** Solo se guardan los abonos con fecha y valor mayor que 0 («Pon el valor», «Elige la fecha»). */
export const isSavable = (
  row: Pick<ScheduleDraftRow, 'dueDate' | 'amount'>,
): row is ScheduleDraftRow & {
  readonly dueDate: LocalDate;
} => row.dueDate !== null && row.amount > 0;

export type ScheduleTotals = {
  /** Saldo pendiente: lo que falta pagar (al crear, total de los libros − cuota inicial). Nunca negativo. */
  readonly pending: COP;
  /** Lo que suman los abonos por cobrar. */
  readonly scheduled: COP;
  /** `missing`: falta programar; `over`: programaste de más; `exact`: todo programado. */
  readonly state: 'missing' | 'over' | 'exact';
  /** Cuánto falta o sobra (0 si cuadra). */
  readonly difference: COP;
};

/** El totalizador: solo responde «¿programé de más o de menos?». */
export const scheduleTotals = (pending: COP, amounts: readonly COP[]): ScheduleTotals => {
  const safePending = Math.max(0, pending);
  const scheduled = amounts.reduce((sum, amount) => sum + Math.max(0, amount), 0);
  const diff = safePending - scheduled;
  return {
    pending: safePending,
    scheduled,
    state: diff > 0 ? 'missing' : diff < 0 ? 'over' : 'exact',
    difference: Math.abs(diff),
  };
};

/** Hasta esta fecha no se avisa «Es más de 2 meses desde hoy» (antes pedía confirmar, OQ-31). */
export const farAheadLimit = (today: LocalDate): LocalDate =>
  addMonthsClamped(today, businessConfig.reschedule.confirmBeyondMonths);

/** Avisos fijos de una fila (se ven mientras sigan vigentes). */
export type RowNote =
  | { readonly kind: 'noDate' }
  | { readonly kind: 'zero' }
  | { readonly kind: 'past' }
  | { readonly kind: 'overdue'; readonly days: number }
  | { readonly kind: 'farAhead' }
  | { readonly kind: 'rescheduled'; readonly before: LocalDate };

export const rowNotes = (input: {
  readonly dueDate: LocalDate | null;
  readonly amount: COP;
  readonly today: LocalDate;
  /** Al crear, una fecha pasada «ya pasó»; con el cliente guardado, el abono está vencido. */
  readonly saved: boolean;
  /** La fecha acordada antes de aplazarlo (solo si se aplazó). */
  readonly rescheduledFrom?: LocalDate | null;
}): RowNote[] => {
  const notes: RowNote[] = [];
  const { dueDate, today } = input;
  if (dueDate === null) notes.push({ kind: 'noDate' });
  else if (isPastDate(dueDate, today))
    notes.push(input.saved ? { kind: 'overdue', days: daysBetween(dueDate, today) } : { kind: 'past' });
  else if (dueDate > farAheadLimit(today)) notes.push({ kind: 'farAhead' });
  if (input.amount <= 0) notes.push({ kind: 'zero' });
  if (input.rescheduledFrom && dueDate && input.rescheduledFrom !== dueDate)
    notes.push({ kind: 'rescheduled', before: input.rescheduledFrom });
  return notes;
};

/** Por qué cambia la fecha de un abono ya guardado: me equivoqué (corrige) o el cliente pidió aplazar. */
export type DateChangeReason = 'correct' | 'reschedule';

/** Avisos dentro de la ventana de la fecha, mientras se elige (nunca bloquean). */
export type DateChangeNote =
  | { readonly kind: 'past' }
  | { readonly kind: 'earlier'; readonly previous: LocalDate }
  | {
      readonly kind: 'later';
      readonly previous: LocalDate;
      readonly days: number;
      readonly reason: DateChangeReason;
    }
  | { readonly kind: 'paymentAfter'; readonly other: LocalDate }
  | { readonly kind: 'paymentBefore'; readonly other: LocalDate }
  | { readonly kind: 'farAhead' };

/**
 * Los avisos al elegir `next` para un abono que tenía `previous` (o ninguna). Si la fecha salta por encima de otro
 * abono, se avisa una vez: hacia atrás, «hay un abono programado después»; hacia adelante, «…antes».
 */
export const dateChangeNotes = (input: {
  readonly previous: LocalDate | null;
  readonly next: LocalDate;
  readonly today: LocalDate;
  /** Las fechas de los otros abonos por cobrar del cliente. */
  readonly others: readonly LocalDate[];
  readonly reason: DateChangeReason;
}): DateChangeNote[] => {
  const { previous, next, today, others } = input;
  const notes: DateChangeNote[] = [];
  if (isPastDate(next, today)) notes.push({ kind: 'past' });
  if (previous !== null && next < previous) notes.push({ kind: 'earlier', previous });
  if (previous !== null && next > previous)
    notes.push({ kind: 'later', previous, days: daysBetween(previous, next), reason: input.reason });
  if (previous !== null) {
    const passedOver = (other: LocalDate) =>
      next < previous ? other >= next && other < previous : other <= next && other > previous;
    const crossed = [...others].filter(passedOver).sort();
    if (next < previous && crossed.length > 0) notes.push({ kind: 'paymentAfter', other: crossed[0]! });
    if (next > previous && crossed.length > 0) notes.push({ kind: 'paymentBefore', other: crossed.at(-1)! });
  }
  if (next > farAheadLimit(today)) notes.push({ kind: 'farAhead' });
  return notes;
};
