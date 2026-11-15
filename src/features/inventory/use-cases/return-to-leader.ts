// Devolver al líder y deshacer (HU-INV-09, BR-COPY-16, ADR-0043).
import {
  buildReturnCandidates,
  requiredNote,
  validateReturnSelection,
  type ReturnCandidates,
  type ReturnSelection,
} from '@/domain/return-to-leader';
import type { AppError } from '@/domain/shared/errors';
import { ok, type Result } from '@/domain/shared/result';
import type { Title } from '@/domain/title';
import type { StockCopy } from '@/domain/inventory';
import type { Connectivity, CopyRepository, TitleRepository } from '@/repositories';
import { runMutation } from '../../shared/run-mutation';

export type ReturnToLeaderDeps = { readonly copies: CopyRepository; readonly connectivity: Connectivity };

export type ReturnCandidatesData = {
  readonly copies: readonly StockCopy[];
  readonly titles: readonly Title[];
};

/** Lee una vez los ejemplares en físico y sus títulos; la búsqueda se aplica en el teléfono. */
export async function loadReturnCandidatesData(deps: {
  readonly copies: CopyRepository;
  readonly titles: TitleRepository;
}): Promise<Result<ReturnCandidatesData, AppError>> {
  const copies = await deps.copies.listStock();
  if (!copies.ok) return copies;
  const inStock = copies.value.filter((c) => c.status === 'in_stock');
  const titles = await deps.titles.getMany([...new Set(inStock.map((c) => c.titleId))]);
  if (!titles.ok) return titles;
  return ok({ copies: inStock, titles: titles.value });
}

/** Candidatos con la búsqueda por título. */
export const returnCandidatesFrom = (data: ReturnCandidatesData, search = ''): ReturnCandidates =>
  buildReturnCandidates(data.copies, data.titles, search);

/**
 * Devuelve en una sola operación (todo o nada). `opId` lo genera el front: reintentar con el mismo no
 * devuelve más. Errores: `OFFLINE`, `NOTE_REQUIRED`, `SELECTION_EMPTY`, `VALIDATION` (`minibookLines`),
 * `COPY_NOT_IN_STOCK` (`details.copyIds`), `NOT_ENOUGH_STOCK` (`details.titleId`), `NETWORK_ERROR`.
 */
export async function returnCopiesToLeader(
  deps: ReturnToLeaderDeps,
  input: ReturnSelection & { readonly opId: string; readonly note: string | null | undefined },
): Promise<Result<{ returnedCopyIds: string[] }, AppError>> {
  return runMutation(deps.connectivity, async () => {
    const valid = validateReturnSelection(input);
    if (!valid.ok) return valid;
    return deps.copies.returnToLeader({ opId: input.opId, ...valid.value });
  });
}

/**
 * Deshace por ejemplar desde su historial (nota obligatoria): vuelve a físico.
 * Errores: `OFFLINE`, `NOTE_REQUIRED`, `UNDO_NOT_AVAILABLE`, `NOT_FOUND`, `NETWORK_ERROR`.
 */
export async function undoReturnToLeader(
  deps: ReturnToLeaderDeps,
  copyId: string,
  note: string | null | undefined,
): Promise<Result<void, AppError>> {
  return runMutation(deps.connectivity, async () => {
    const valid = requiredNote(note);
    if (!valid.ok) return valid;
    return deps.copies.undoReturnToLeader(copyId, valid.value);
  });
}
