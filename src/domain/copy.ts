// Ejemplar: estados, transiciones, precio distinto e historial (HU-INV-01, BR-COPY-*, ADR-0008, ADR-0043).
import { isValidCOP, type COP } from './money';
import { appError, validationError, type AppError } from './shared/errors';
import { err, ok, type Result } from './shared/result';
import type { Instant, LocalDate } from './time';
import type { TitleCategory } from './title';

/** Estados del ejemplar (BR-COPY-01). */
export type CopyStatus = 'in_stock' | 'sold' | 'flagged' | 'lost' | 'returned_to_leader';

/** Estado para la máquina de estados: el borrado lógico (`deletedAt`) cuenta como un estado más. */
export type CopyState = CopyStatus | 'deleted';

export type Copy = {
  readonly id: string;
  readonly titleId: string;
  /** Consecutivo por (usuario, título), nunca reutilizado (BR-COPY-05). Lo asigna la base. */
  readonly number: number;
  readonly status: CopyStatus;
  readonly customerId: string | null;
  readonly agreedPrice: COP | null;
  /** Precios copiados del título al recibirse; nunca se vuelven a leer del título (BR-COPY-03). */
  readonly publicPriceSnapshot: COP | null;
  readonly colportorPriceSnapshot: COP;
  readonly receivedAt: LocalDate;
  readonly soldAt: Instant | null;
  readonly deletedAt: Instant | null;
};

export const COPY_ERROR_CODES = { INVALID_TRANSITION: 'INVALID_TRANSITION' } as const;

export type CopyAction =
  | {
      readonly type: 'sell';
      readonly customerId: string;
      readonly agreedPrice: COP;
      readonly soldAt: Instant;
    }
  | { readonly type: 'return' }
  | { readonly type: 'flag' }
  | { readonly type: 'resolve_found' }
  | { readonly type: 'resolve_lost' }
  | { readonly type: 'resolve_removed'; readonly at: Instant }
  | { readonly type: 'undo_found' }
  | { readonly type: 'undo_lost' }
  | { readonly type: 'delete'; readonly at: Instant }
  | { readonly type: 'undo_delete' }
  | { readonly type: 'return_to_leader' }
  | { readonly type: 'undo_return_to_leader' };

export type CopyActionType = CopyAction['type'];

/**
 * Tabla ÚNICA de transiciones (R3, DOMAIN-MODEL "Máquinas de estados"). La base de datos aplica la misma
 * tabla en un trigger; una prueba verifica que coincidan.
 * `previous` = vuelve al estado que tenía antes de eliminarse (el estado no cambia al eliminar).
 */
export const COPY_TRANSITIONS: Readonly<
  Record<CopyActionType, { from: CopyState; to: CopyState | 'previous' }>
> = {
  sell: { from: 'in_stock', to: 'sold' }, // BR-COPY-06
  return: { from: 'sold', to: 'in_stock' }, // BR-COPY-09
  flag: { from: 'in_stock', to: 'flagged' }, // BR-COPY-10
  resolve_found: { from: 'flagged', to: 'in_stock' }, // BR-COPY-11 Apareció
  resolve_lost: { from: 'flagged', to: 'lost' }, // BR-COPY-11 Perdido
  resolve_removed: { from: 'flagged', to: 'deleted' }, // BR-COPY-11 Eliminar
  undo_found: { from: 'in_stock', to: 'flagged' }, // ADR-0043
  undo_lost: { from: 'lost', to: 'flagged' }, // ADR-0043
  delete: { from: 'in_stock', to: 'deleted' }, // BR-COPY-17
  undo_delete: { from: 'deleted', to: 'previous' }, // BR-COPY-17
  return_to_leader: { from: 'in_stock', to: 'returned_to_leader' }, // BR-COPY-16
  undo_return_to_leader: { from: 'returned_to_leader', to: 'in_stock' }, // BR-COPY-16
};

export const COPY_ACTIONS = Object.keys(COPY_TRANSITIONS) as readonly CopyActionType[];

export const copyStateOf = (copy: Pick<Copy, 'status' | 'deletedAt'>): CopyState =>
  copy.deletedAt ? 'deleted' : copy.status;

export const canTransition = (from: CopyState, action: CopyActionType): boolean =>
  COPY_TRANSITIONS[action].from === from;

const NOT_SOLD = { customerId: null, agreedPrice: null, soldAt: null } as const; // BR-COPY-08

/** Aplica una acción si la tabla la permite; si no, `INVALID_TRANSITION`. */
export function apply(copy: Copy, action: CopyAction): Result<Copy, AppError> {
  const from = copyStateOf(copy);
  if (!canTransition(from, action.type)) {
    return err(appError(COPY_ERROR_CODES.INVALID_TRANSITION, { from, action: action.type }));
  }
  switch (action.type) {
    case 'sell':
      if (!isValidCOP(action.agreedPrice)) return err(validationError('agreedPrice'));
      return ok({
        ...copy,
        status: 'sold',
        customerId: action.customerId,
        agreedPrice: action.agreedPrice,
        soldAt: action.soldAt,
      });
    case 'return':
    case 'resolve_found':
    case 'undo_return_to_leader':
      return ok({ ...copy, ...NOT_SOLD, status: 'in_stock' });
    case 'flag':
    case 'undo_found':
    case 'undo_lost':
      return ok({ ...copy, status: 'flagged' });
    case 'resolve_lost':
      return ok({ ...copy, status: 'lost' });
    case 'return_to_leader':
      return ok({ ...copy, status: 'returned_to_leader' });
    case 'delete':
    case 'resolve_removed':
      return ok({ ...copy, deletedAt: action.at });
    case 'undo_delete':
      return ok({ ...copy, deletedAt: null });
  }
}

type PriceInput = Pick<Copy, 'status' | 'agreedPrice' | 'publicPriceSnapshot'> & {
  readonly category?: TitleCategory;
};

/** BR-PRC-01: vendido, no minibook, con precio público y acordado ≠ público. */
export const priceDiffers = (copy: PriceInput): boolean =>
  copy.status === 'sold' &&
  copy.category !== 'minibook' &&
  copy.agreedPrice !== null &&
  copy.publicPriceSnapshot !== null &&
  copy.agreedPrice !== copy.publicPriceSnapshot;

/** BR-PRC-02: `agreedPrice − publicPriceSnapshot` solo si difiere (+ aumento, − descuento); si no, `null`. */
export const priceDelta = (copy: PriceInput): COP | null =>
  priceDiffers(copy) ? copy.agreedPrice! - copy.publicPriceSnapshot! : null;

/** Tipos de evento del historial (DOMAIN-MODEL `copy_event`, BR-AUD-01). */
export type CopyEventType =
  | 'received'
  | 'sold'
  | 'returned'
  | 'flagged'
  | 'resolved'
  | 'undo_resolved'
  | 'deleted'
  | 'undo_deleted'
  | 'price_changed'
  | 'received_date_changed'
  | 'minibook_sold'
  | 'returned_to_leader'
  | 'undo_returned_to_leader';

/** Un evento del historial de un ejemplar, listo para mostrar. */
export type CopyEvent = {
  readonly id: string;
  readonly type: CopyEventType;
  readonly at: Instant;
  readonly note: string | null;
  readonly data: {
    readonly customerId?: string;
    readonly agreedPrice?: COP;
    readonly oldPrice?: COP | null;
    readonly newPrice?: COP | null;
    readonly oldDate?: LocalDate;
    readonly newDate?: LocalDate;
    /** `returned`: customer_returned | wrong_registration (BR-COPY-09). */
    readonly reason?: string;
    /** `resolved`: found | lost | removed (BR-COPY-11). */
    readonly resolution?: string;
    /** `deleted`: estado que tenía (BR-COPY-17). */
    readonly previousStatus?: CopyStatus;
  };
};
