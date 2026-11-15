import { z } from 'zod';
import { CUSTOMER_ERROR_CODES } from '@/domain/customer-data';
import { appError, COMMON_ERROR_CODES } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import type { PhotoRepository } from '@/repositories';
import type { GetSupabaseClient } from './client';
import { mapPostgrestError, mapRpcError } from './errors';

/** Errores de los triggers de `photo` (HU-CLI-07). */
const PHOTO_WRITE_ERRORS = [CUSTOMER_ERROR_CODES.CUSTOMER_ARCHIVED, COMMON_ERROR_CODES.NOT_FOUND];

const storedPhotoSchema = z.object({
  id: z.uuid(),
  path: z.string(),
  thumb_path: z.string().nullable(),
  created_at: z.string().transform((value) => new Date(value)),
});

export function createSupabasePhotoRepository(getClient: GetSupabaseClient): PhotoRepository {
  return {
    async create(photo) {
      // Reintentar con el mismo id no duplica ni falla (AF-91).
      const { error } = await getClient()
        .from('photo')
        .upsert(
          {
            id: photo.id,
            kind: photo.kind,
            path: photo.path,
            thumb_path: photo.thumbPath,
            bytes: photo.bytes,
            customer_id: photo.customerId ?? null,
          },
          { onConflict: 'id', ignoreDuplicates: true },
        );
      return error ? err(mapRpcError(error, PHOTO_WRITE_ERRORS)) : ok(undefined);
    },

    async softDelete(id, options = {}) {
      const client = getClient();
      let update = client
        .from('photo')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .is('deleted_at', null);
      if (options.kind) update = update.eq('kind', options.kind);
      const { data, error } = await update.select('id');
      if (error) return err(mapPostgrestError(error));
      if (data.length > 0) return ok(undefined);
      // Ya estaba borrada (reintento) o no existe / no es del usuario / es de otro tipo.
      let existing = client.from('photo').select('id').eq('id', id);
      if (options.kind) existing = existing.eq('kind', options.kind);
      const found = await existing.maybeSingle();
      if (found.error) return err(mapPostgrestError(found.error));
      return found.data ? ok(undefined) : err(appError(COMMON_ERROR_CODES.NOT_FOUND));
    },

    async listOfCustomer(customerId, kind) {
      const { data, error } = await getClient()
        .from('photo')
        .select('id, path, thumb_path, created_at')
        .eq('customer_id', customerId)
        .eq('kind', kind)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });
      if (error) return err(mapPostgrestError(error));
      return ok(
        z
          .array(storedPhotoSchema)
          .parse(data)
          .map((row) => ({
            id: row.id,
            path: row.path,
            thumbPath: row.thumb_path ?? row.path,
            createdAt: row.created_at,
          })),
      );
    },

    async getPaths(id) {
      const { data, error } = await getClient()
        .from('photo')
        .select('path, thumb_path')
        .eq('id', id)
        .is('deleted_at', null)
        .maybeSingle();
      if (error) return err(mapPostgrestError(error));
      if (!data) return err(appError(COMMON_ERROR_CODES.NOT_FOUND));
      return ok({ path: data.path, thumbPath: data.thumb_path ?? data.path });
    },

    async totalBytes() {
      const { data, error } = await getClient().rpc('photo_total_bytes');
      if (error) return err(mapPostgrestError(error));
      return ok(z.coerce.number().int().nonnegative().parse(data));
    },
  };
}
