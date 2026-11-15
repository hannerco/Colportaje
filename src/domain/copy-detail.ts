// Detalle de un ejemplar: historial legible, qué se puede deshacer y qué acciones se permiten
// (HU-INV-05, BR-COPY-04/11/16/17, BR-AUD-01).
import {
  canTransition,
  copyStateOf,
  priceDelta,
  type Copy,
  type CopyEvent,
  type CopyEventType,
} from './copy';
import { STATE_EVENT_TYPES, undoableResolution } from './copy-issue';
import type { CustomerRef } from './copies-list';
import type { COP } from './money';
import { appError, type AppError } from './shared/errors';
import { err, ok, type Result } from './shared/result';
import { toBogotaDate, type Instant, type LocalDate } from './time';
import type { Title, TitleCategory } from './title';

export const RECEIVED_DATE_ERROR_CODES = {
  DATE_IN_FUTURE: 'DATE_IN_FUTURE',
  DATE_AFTER_SALE: 'DATE_AFTER_SALE',
} as const;

export type CopyCapabilities = {
  readonly editAgreedPrice: boolean;
  readonly restorePublicPrice: boolean;
  readonly editReceivedAt: boolean;
  readonly flag: boolean;
  readonly delete: boolean;
  readonly returnFromCustomer: boolean;
};

type CapabilityInput = Pick<Copy, 'status' | 'deletedAt' | 'agreedPrice' | 'publicPriceSnapshot'>;

/**
 * R3: indicadores sacados de la MISMA tabla de transiciones (COPY_TRANSITIONS). Precio acordado y devolver
 * de un cliente: solo vendido y no minibook; restaurar el público: además con precio distinto.
 */
export const copyCapabilities = (copy: CapabilityInput, category: TitleCategory): CopyCapabilities => {
  const state = copyStateOf(copy);
  const soldBook = state === 'sold' && category !== 'minibook';
  return {
    editAgreedPrice: soldBook,
    restorePublicPrice: soldBook && priceDelta({ ...copy, category }) !== null,
    editReceivedAt: state !== 'deleted',
    flag: canTransition(state, 'flag'),
    delete: canTransition(state, 'delete') || canTransition(state, 'resolve_removed'),
    returnFromCustomer: soldBook && canTransition(state, 'return'),
  };
};

export type HistoryUndo = 'none' | 'returned_to_leader' | 'resolution';

export type HistoryItem = {
  readonly eventId: string;
  readonly type: CopyEventType;
  readonly at: Instant;
  readonly note: string | null;
  /** Datos del evento; si menciona un cliente, también su nombre (`customerName`). */
  readonly data: CopyEvent['data'] & { readonly customerName?: string };
  readonly undo: HistoryUndo;
};

/**
 * Solo el cambio de estado más reciente se puede deshacer, y solo si sigue vigente: un "Devuelto al líder"
 * con el ejemplar aún devuelto, o una resolución "Apareció" (sigue en físico) o "Perdido" (sigue perdido).
 * `events` va del más reciente al más antiguo.
 */
const undoableEventId = (
  events: readonly CopyEvent[],
  status: Copy['status'],
): { id: string; undo: Exclude<HistoryUndo, 'none'> } | null => {
  const last = events.find((e) => STATE_EVENT_TYPES.has(e.type));
  if (!last) return null;
  if (last.type === 'returned_to_leader' && status === 'returned_to_leader') {
    return { id: last.id, undo: 'returned_to_leader' };
  }
  // R4 de HU-INV-07; en el detalle el ejemplar no está borrado, así que Eliminar nunca aparece aquí.
  if (undoableResolution(events, status)) return { id: last.id, undo: 'resolution' };
  return null;
};

export const buildHistory = (
  events: readonly CopyEvent[],
  status: Copy['status'],
  customers: readonly CustomerRef[],
): HistoryItem[] => {
  const names = new Map(customers.map((c) => [c.id, c.name]));
  const undoable = undoableEventId(events, status);
  return events.map((event) => {
    const customerName = event.data.customerId ? names.get(event.data.customerId) : undefined;
    return {
      eventId: event.id,
      type: event.type,
      at: event.at,
      note: event.note,
      data: customerName === undefined ? event.data : { ...event.data, customerName },
      undo: undoable?.id === event.id ? undoable.undo : 'none',
    };
  });
};

export type DetailCopy = Pick<
  Copy,
  | 'id'
  | 'titleId'
  | 'number'
  | 'status'
  | 'customerId'
  | 'agreedPrice'
  | 'publicPriceSnapshot'
  | 'receivedAt'
  | 'soldAt'
  | 'deletedAt'
>;

export type CopyDetail = {
  readonly copyId: string;
  readonly titleName: string;
  readonly imageUrl: string | null;
  readonly category: TitleCategory;
  readonly number: number;
  readonly status: Copy['status'];
  readonly customer: CustomerRef | null;
  readonly agreedPrice: COP | null;
  readonly publicPriceSnapshot: COP | null;
  readonly priceDelta: COP | null;
  readonly soldAt: Instant | null;
  readonly receivedAt: LocalDate;
  readonly openIssue: { readonly note: string; readonly createdAt: Instant } | null;
  readonly history: readonly HistoryItem[];
  readonly can: CopyCapabilities;
};

/** Modelo de vista del detalle (eventos del más reciente al más antiguo). */
export const buildCopyDetail = (input: {
  readonly copy: DetailCopy;
  readonly title: Pick<Title, 'name' | 'imageUrl' | 'category'>;
  readonly customers: readonly CustomerRef[];
  readonly openIssue: { readonly note: string; readonly createdAt: Instant } | null;
  readonly events: readonly CopyEvent[];
}): CopyDetail => {
  const { copy, title } = input;
  const sold = copy.status === 'sold';
  return {
    copyId: copy.id,
    titleName: title.name,
    imageUrl: title.imageUrl,
    category: title.category,
    number: copy.number,
    status: copy.status,
    customer:
      sold && copy.customerId ? (input.customers.find((c) => c.id === copy.customerId) ?? null) : null,
    agreedPrice: sold ? copy.agreedPrice : null,
    publicPriceSnapshot: copy.publicPriceSnapshot,
    priceDelta: priceDelta({ ...copy, category: title.category }),
    soldAt: copy.soldAt,
    receivedAt: copy.receivedAt,
    openIssue: input.openIssue,
    history: buildHistory(input.events, copy.status, input.customers),
    can: copyCapabilities(copy, title.category),
  };
};

/**
 * R1 / BR-COPY-04: la fecha de recibido no es futura (Bogotá) ni posterior al día de la venta.
 * Errores: `DATE_IN_FUTURE`, `DATE_AFTER_SALE`.
 */
export const validateReceivedDate = (
  date: LocalDate,
  today: LocalDate,
  soldAt: Instant | null,
): Result<LocalDate, AppError> => {
  if (date > today) return err(appError(RECEIVED_DATE_ERROR_CODES.DATE_IN_FUTURE));
  if (soldAt && date > toBogotaDate(soldAt)) return err(appError(RECEIVED_DATE_ERROR_CODES.DATE_AFTER_SALE));
  return ok(date);
};
