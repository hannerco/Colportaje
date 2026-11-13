import { validateAddCopiesInput, type AddCopiesInput } from '@/domain/add-batch';
import type { AppError } from '@/domain/shared/errors';
import type { Result } from '@/domain/shared/result';
import { todayBogota, type Clock } from '@/domain/time';
import type { Connectivity, CopyRepository, CreatedCopy } from '@/repositories';
import { runMutation } from '../../shared/run-mutation';

export type AddCopiesBatchDeps = {
  readonly copies: CopyRepository;
  readonly connectivity: Connectivity;
  readonly clock: Clock;
};

/**
 * Confirma el lote ("Agregar N", HU-INV-02): crea todos los ejemplares o ninguno (R2).
 * Errores: `OFFLINE` (sin intentar), `BATCH_EMPTY`, `DATE_IN_FUTURE`, `TITLE_INACTIVE` (`details.titleIds`),
 * `VALIDATION`, `CONFLICT`, `NETWORK_ERROR` (reintentable con el MISMO input: no duplica, R6).
 */
export async function addCopiesBatch(
  deps: AddCopiesBatchDeps,
  input: AddCopiesInput,
): Promise<Result<{ created: CreatedCopy[] }, AppError>> {
  return runMutation(deps.connectivity, async () => {
    const valid = validateAddCopiesInput(input, todayBogota(deps.clock));
    if (!valid.ok) return valid;
    return deps.copies.addBatch(valid.value);
  });
}
