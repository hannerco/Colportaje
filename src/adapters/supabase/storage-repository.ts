import { err, ok } from '@/domain/shared/result';
import type { StorageRepository } from '@/repositories';
import type { GetSupabaseClient } from './client';
import { mapStorageError } from './errors';

export const USER_PHOTOS_BUCKET = 'user-photos';

/** Bucket privado de fotos del usuario (ADR-0013). Cambiar de proveedor (R2) = otra implementación. */
export function createSupabaseStorageRepository(getClient: GetSupabaseClient): StorageRepository {
  const bucket = () => getClient().storage.from(USER_PHOTOS_BUCKET);

  // Supabase Storage lanza (en vez de devolver error) cuando no hay red: se trata como NETWORK_ERROR.
  const guard = async <T>(run: () => Promise<T>) => {
    try {
      return await run();
    } catch (cause) {
      return { data: null, error: { message: String(cause), status: undefined, statusCode: undefined } };
    }
  };

  return {
    async upload(path, blob) {
      const { error } = await guard(() =>
        bucket().upload(path, blob, { upsert: true, contentType: blob.type || 'image/webp', cacheControl: '3600' }),
      );
      return error ? err(mapStorageError(error)) : ok(undefined);
    },

    async signedUrl(path, seconds) {
      const { data, error } = await guard(() => bucket().createSignedUrl(path, seconds));
      if (error || !data) return err(mapStorageError(error ?? { message: 'sin datos' }));
      return ok(data.signedUrl);
    },

    async remove(paths) {
      if (paths.length === 0) return ok(undefined);
      const { error } = await guard(() => bucket().remove([...paths]));
      return error ? err(mapStorageError(error)) : ok(undefined);
    },
  };
}
