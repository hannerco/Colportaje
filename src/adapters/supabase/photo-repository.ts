import { z } from 'zod';
import { appError, COMMON_ERROR_CODES } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import type { PhotoRepository } from '@/repositories';
import type { GetSupabaseClient } from './client';
import { mapPostgrestError } from './errors';

export function createSupabasePhotoRepository(getClient: GetSupabaseClient): PhotoRepository {
  return {
    async create(photo) {
      // Reintentar con el mismo id no duplica ni falla (AF-91).
      const { error } = await getClient().from('photo').upsert(
        {
          id: photo.id,
          kind: photo.kind,
          path: photo.path,
          thumb_path: photo.thumbPath,
          bytes: photo.bytes,
        },
        { onConflict: 'id', ignoreDuplicates: true },
      );
      return error ? err(mapPostgrestError(error)) : ok(undefined);
    },

    async softDelete(id) {
      const client = getClient();
      const { data, error } = await client
        .from('photo')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .is('deleted_at', null)
        .select('id');
      if (error) return err(mapPostgrestError(error));
      if (data.length > 0) return ok(undefined);
      // Ya estaba borrada (reintento) o no existe / no es del usuario.
      const existing = await client.from('photo').select('id').eq('id', id).maybeSingle();
      if (existing.error) return err(mapPostgrestError(existing.error));
      return existing.data ? ok(undefined) : err(appError(COMMON_ERROR_CODES.NOT_FOUND));
    },

    async totalBytes() {
      const { data, error } = await getClient().rpc('photo_total_bytes');
      if (error) return err(mapPostgrestError(error));
      return ok(z.coerce.number().int().nonnegative().parse(data));
    },
  };
}
