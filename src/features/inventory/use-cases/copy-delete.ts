// Eliminar un ejemplar y deshacer (HU-INV-08, BR-COPY-17, BR-GEN-15). Solo desde el detalle, uno a la vez.
import { DELETE_NOTE_REQUIRED, deleteNote } from '@/domain/copy-delete';
import type { AppError } from '@/domain/shared/errors';
import type { Result } from '@/domain/shared/result';
import type { Connectivity, CopyRepository } from '@/repositories';
import { runMutation } from '../../shared/run-mutation';

export type CopyDeleteDeps = { readonly copies: CopyRepository; readonly connectivity: Connectivity };

/**
 * Elimina (borrado lógico): en físico se borra; con novedad, la novedad se resuelve como Eliminar. La nota es
 * opcional salvo que la configuración la exija (`noteRequired`, por defecto `copyDelete.noteRequired`).
 * Errores: `OFFLINE`, `NOTE_REQUIRED`, `COPY_NOT_DELETABLE`, `NOT_FOUND` (también si ya se eliminó),
 * `NETWORK_ERROR`.
 */
export async function deleteCopy(
  deps: CopyDeleteDeps,
  copyId: string,
  note?: string | null,
  { noteRequired = DELETE_NOTE_REQUIRED }: { noteRequired?: boolean } = {},
): Promise<Result<void, AppError>> {
  return runMutation(deps.connectivity, async () => {
    const valid = deleteNote(note, noteRequired);
    if (!valid.ok) return valid;
    return deps.copies.delete(copyId, valid.value);
  });
}

/**
 * Deshace la eliminación (desde el aviso; el tiempo lo controla el front con `undo.toastSeconds`): vuelve a
 * físico, o a Por resolver con la misma novedad. Errores: `OFFLINE`, `UNDO_NOT_AVAILABLE`, `NOT_FOUND`.
 */
export async function undoDeleteCopy(deps: CopyDeleteDeps, copyId: string): Promise<Result<void, AppError>> {
  return runMutation(deps.connectivity, () => deps.copies.undoDelete(copyId));
}
