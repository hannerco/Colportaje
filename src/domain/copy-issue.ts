// Novedades de un ejemplar: marcar, resolver y deshacer (HU-INV-07, BR-COPY-10/11, ADR-0043).
import type { CopyEvent, CopyState } from './copy';
import { validationError, type AppError } from './shared/errors';
import { err, ok, type Result } from './shared/result';

export const COPY_ISSUE_ERROR_CODES = {
  /** Resolver un ejemplar sin novedad abierta. */
  COPY_NOT_FLAGGED: 'COPY_NOT_FLAGGED',
  /** La resolución ya no es el último cambio del ejemplar o ya no sigue vigente (R4). */
  UNDO_NOT_AVAILABLE: 'UNDO_NOT_AVAILABLE',
} as const;

/** Apareció, Perdido (lo asumo yo) o Eliminar (BR-COPY-11). */
export type IssueResolution = 'found' | 'lost' | 'removed';

/** R1: la nota al marcar es obligatoria (sin espacios sobrantes). Error: `VALIDATION` (`field: note`). */
export const validateIssueNote = (note: string): Result<string, AppError> => {
  const trimmed = note.trim();
  return trimmed ? ok(trimmed) : err(validationError('note'));
};

/** La nota al resolver es opcional: vacía o solo espacios = sin nota. */
export const resolutionNote = (note: string | null | undefined): string | null => note?.trim() || null;

/** Estado al que lleva cada resolución (R3); `deleted` = borrado lógico. */
export const RESOLUTION_TARGET: Readonly<Record<IssueResolution, CopyState>> = {
  found: 'in_stock',
  lost: 'lost',
  removed: 'deleted',
};

/** Eventos que cambian el estado del ejemplar (precio y fecha de recibido no). La base usa la misma lista. */
export const STATE_EVENT_TYPES: ReadonlySet<CopyEvent['type']> = new Set([
  'sold',
  'returned',
  'flagged',
  'resolved',
  'undo_resolved',
  'deleted',
  'undo_deleted',
  'minibook_sold',
  'returned_to_leader',
  'undo_returned_to_leader',
]);

/**
 * R4: una resolución se deshace solo si es el cambio de estado más reciente del ejemplar y sigue vigente:
 * Apareció y sigue en físico, Perdido y sigue perdido, Eliminar y sigue borrado. `events` va del más
 * reciente al más antiguo. Devuelve la resolución que se puede deshacer o `null`.
 */
export const undoableResolution = (
  events: readonly Pick<CopyEvent, 'type' | 'data'>[],
  state: CopyState,
): IssueResolution | null => {
  const last = events.find((e) => STATE_EVENT_TYPES.has(e.type));
  if (last?.type !== 'resolved') return null;
  const resolution = last.data.resolution as IssueResolution | undefined;
  return resolution && RESOLUTION_TARGET[resolution] === state ? resolution : null;
};
