import type { AppError } from '@/domain/shared/errors';
import type { Result } from '@/domain/shared/result';
import type { TimeFormat } from '@/domain/time';
import type { Connectivity, ProfileRepository } from '@/repositories';
import { runMutation } from '../../shared/run-mutation';

/** Formato de hora del usuario actual (Ajustes, BR-GEN-07). Errores: `OFFLINE` (sin intentar), `FORBIDDEN`. */
export async function updateTimeFormat(
  deps: { readonly profiles: ProfileRepository; readonly connectivity: Connectivity },
  format: TimeFormat,
): Promise<Result<void, AppError>> {
  return runMutation(deps.connectivity, () => deps.profiles.updateTimeFormat(format));
}
