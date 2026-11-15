// Eliminar un ejemplar (HU-INV-08, BR-COPY-17, BR-GEN-15): qué estados lo permiten y la nota configurable.
import { businessConfig } from './config/business-config';
import { canTransition, type CopyState } from './copy';
import { appError, type AppError } from './shared/errors';
import { err, ok, type Result } from './shared/result';

export const COPY_DELETE_ERROR_CODES = {
  /** Vendido (primero se devuelve), perdido o devuelto al líder (R3). */
  COPY_NOT_DELETABLE: 'COPY_NOT_DELETABLE',
  /** La configuración exige nota y no la hay (R4). */
  NOTE_REQUIRED: 'NOTE_REQUIRED',
} as const;

/** BR-COPY-17: hoy la nota es opcional; el dueño puede volverla obligatoria (BR-GEN-15). */
export const DELETE_NOTE_REQUIRED = businessConfig.copyDelete.noteRequired;

/** R1–R3: se elimina en físico (borrado directo) o con novedad (se resuelve como Eliminar). */
export const isDeletable = (state: CopyState): boolean =>
  canTransition(state, 'delete') || canTransition(state, 'resolve_removed');

/**
 * R4: la nota sin espacios sobrantes (vacía = sin nota); si la configuración la exige y no hay, `NOTE_REQUIRED`.
 */
export const deleteNote = (
  note: string | null | undefined,
  required: boolean = DELETE_NOTE_REQUIRED,
): Result<string | null, AppError> => {
  const trimmed = note?.trim() || null;
  return required && trimmed === null ? err(appError(COPY_DELETE_ERROR_CODES.NOTE_REQUIRED)) : ok(trimmed);
};
