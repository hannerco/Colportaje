// Novedades de un ejemplar: marcar, resolver y deshacer (HU-INV-07, BR-COPY-10/11, ADR-0043).
import { resolutionNote, validateIssueNote, type IssueResolution } from '@/domain/copy-issue';
import type { AppError } from '@/domain/shared/errors';
import type { Result } from '@/domain/shared/result';
import type { Connectivity, CopyRepository } from '@/repositories';
import { runMutation } from '../../shared/run-mutation';

export type CopyIssueDeps = { readonly copies: CopyRepository; readonly connectivity: Connectivity };

/**
 * Marca un ejemplar en físico con novedad (nota obligatoria); deja de contar como físico y pasa a Por
 * resolver. Errores: `OFFLINE`, `VALIDATION` (`note`), `COPY_NOT_IN_STOCK`, `NOT_FOUND`, `NETWORK_ERROR`.
 */
export async function flagCopy(
  deps: CopyIssueDeps,
  copyId: string,
  note: string,
): Promise<Result<void, AppError>> {
  return runMutation(deps.connectivity, async () => {
    const valid = validateIssueNote(note);
    if (!valid.ok) return valid;
    return deps.copies.flag(copyId, valid.value);
  });
}

/**
 * Resuelve: Apareció (`found`), Perdido (`lost`) o Eliminar (`removed`); la nota es opcional.
 * Errores: `OFFLINE`, `COPY_NOT_FLAGGED`, `NOT_FOUND`, `NETWORK_ERROR`.
 */
export async function resolveCopyIssue(
  deps: CopyIssueDeps,
  copyId: string,
  resolution: IssueResolution,
  note?: string | null,
): Promise<Result<void, AppError>> {
  return runMutation(deps.connectivity, () =>
    deps.copies.resolveIssue(copyId, resolution, resolutionNote(note)),
  );
}

/**
 * Deshace la última resolución: el ejemplar vuelve a Por resolver con la misma novedad y su nota original.
 * Errores: `OFFLINE`, `UNDO_NOT_AVAILABLE`, `NOT_FOUND`, `NETWORK_ERROR`.
 */
export async function undoResolveCopyIssue(
  deps: CopyIssueDeps,
  copyId: string,
): Promise<Result<void, AppError>> {
  return runMutation(deps.connectivity, () => deps.copies.undoResolveIssue(copyId));
}
