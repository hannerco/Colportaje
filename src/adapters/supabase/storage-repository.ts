import { err, ok } from '@/domain/shared/result';
import type { StorageRepository } from '@/repositories';
import type { GetSupabaseClient } from './client';
import { mapStorageError } from './errors';

export const USER_PHOTOS_BUCKET = 'user-photos';

type SignedEntry = { readonly url: string; readonly expiresAt: number };

/** Bucket privado de fotos del usuario (ADR-0013). Cambiar de proveedor (R2) = otra implementación. */
export function createSupabaseStorageRepository(
  getClient: GetSupabaseClient,
  now: () => number = Date.now,
): StorageRepository {
  const bucket = () => getClient().storage.from(USER_PHOTOS_BUCKET);
  /**
   * La ficha se pide de nuevo cada vez que se abre: si cada vez se firmara otra URL, el navegador volvería a descargar
   * todas las miniaturas y parpadearían. Mientras a una URL le quede al menos la mitad de su vida, se reutiliza.
   */
  const signed = new Map<string, SignedEntry>();

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
        bucket().upload(path, blob, {
          upsert: true,
          contentType: blob.type || 'image/webp',
          cacheControl: '3600',
        }),
      );
      signed.delete(path);
      return error ? err(mapStorageError(error)) : ok(undefined);
    },

    async signedUrl(path, seconds) {
      const cached = signed.get(path);
      if (cached && cached.expiresAt - now() >= (seconds * 1000) / 2) return ok(cached.url);
      const { data, error } = await guard(() => bucket().createSignedUrl(path, seconds));
      if (error || !data) return err(mapStorageError(error ?? { message: 'sin datos' }));
      signed.set(path, { url: data.signedUrl, expiresAt: now() + seconds * 1000 });
      return ok(data.signedUrl);
    },

    async remove(paths) {
      if (paths.length === 0) return ok(undefined);
      for (const path of paths) signed.delete(path);
      const { error } = await guard(() => bucket().remove([...paths]));
      return error ? err(mapStorageError(error)) : ok(undefined);
    },
  };
}
