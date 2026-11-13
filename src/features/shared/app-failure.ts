import type { AppError } from '@/domain/shared/errors';
import type { Result } from '@/domain/shared/result';

/** Envuelve un `AppError` para las lecturas de TanStack Query, que esperan un error lanzado. */
export class AppFailure extends Error {
  constructor(readonly error: AppError) {
    super(error.code);
    this.name = 'AppFailure';
  }
}

/** Devuelve el valor o lanza `AppFailure`; el front lee `query.error.error.code`. */
export const unwrap = <T>(result: Result<T, AppError>): T => {
  if (!result.ok) throw new AppFailure(result.error);
  return result.value;
};
