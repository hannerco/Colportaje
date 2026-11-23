import type { PostgrestError } from '@supabase/supabase-js';
import { z } from 'zod';
import { appError, COMMON_ERROR_CODES, type AppError } from '@/domain/shared/errors';
import { ok, err } from '@/domain/shared/result';
import { compareTitles, type Title } from '@/domain/title';
import type { TitleRepository, TitleWrite } from '@/repositories';
import type { AppSupabaseClient, GetSupabaseClient } from './client';
import { mapPostgrestError, mapStorageError } from './errors';

export const TITLE_IMAGES_BUCKET = 'title-images';

/** La dirección pública de una portada (bucket público), o `null` sin portada (#53). */
export const titleCoverUrl = (client: AppSupabaseClient, imagePath: string | null): string | null =>
  imagePath ? client.storage.from(TITLE_IMAGES_BUCKET).getPublicUrl(imagePath).data.publicUrl : null;

const TITLE_COLUMNS =
  'id, name, author, description, image_path, public_price, colportor_price, category, is_active' as const;

const titleRowSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  author: z.string().nullable(),
  description: z.string().nullable(),
  image_path: z.string().nullable(),
  public_price: z.number().int().nullable(),
  colportor_price: z.number().int(),
  category: z.enum(['cultural', 'religious', 'minibook']),
  is_active: z.boolean(),
});

const toTitle = (client: AppSupabaseClient, raw: unknown): Title => {
  const row = titleRowSchema.parse(raw);
  return {
    id: row.id,
    name: row.name,
    author: row.author,
    description: row.description,
    imageUrl: titleCoverUrl(client, row.image_path),
    publicPrice: row.public_price,
    colportorPrice: row.colportor_price,
    category: row.category,
    isActive: row.is_active,
  };
};

/** Columnas de `title` que escribe el admin (los datos y, si viene, la portada). */
const toRow = (title: Partial<TitleWrite>) => ({
  ...(title.name !== undefined && { name: title.name }),
  ...(title.author !== undefined && { author: title.author }),
  ...(title.description !== undefined && { description: title.description }),
  ...(title.publicPrice !== undefined && { public_price: title.publicPrice }),
  ...(title.colportorPrice !== undefined && { colportor_price: title.colportorPrice }),
  ...(title.category !== undefined && { category: title.category }),
  ...(title.isActive !== undefined && { is_active: title.isActive }),
  ...(title.imagePath !== undefined && { image_path: title.imagePath }),
});

/** Al escribir: sin permiso (RLS, no es admin) → `FORBIDDEN`; un check de la tabla → `VALIDATION`. */
const mapWriteError = (error: PostgrestError): AppError => {
  if (error.code === '42501') return appError(COMMON_ERROR_CODES.FORBIDDEN);
  if (error.code === '23514') return appError(COMMON_ERROR_CODES.VALIDATION, { constraint: error.message });
  return mapPostgrestError(error);
};

export function createSupabaseTitleRepository(getClient: GetSupabaseClient): TitleRepository {
  return {
    async listActive() {
      const client = getClient();
      const { data, error } = await client.from('title').select(TITLE_COLUMNS).eq('is_active', true);
      if (error) return err(mapPostgrestError(error));
      return ok(data.map((row) => toTitle(client, row)).sort(compareTitles));
    },

    async getMany(ids) {
      if (ids.length === 0) return ok([]);
      const client = getClient();
      const { data, error } = await client
        .from('title')
        .select(TITLE_COLUMNS)
        .in('id', [...new Set(ids)]);
      if (error) return err(mapPostgrestError(error));
      return ok(data.map((row) => toTitle(client, row)).sort(compareTitles));
    },

    async listAll() {
      const client = getClient();
      const { data, error } = await client.from('title').select(TITLE_COLUMNS);
      if (error) return err(mapPostgrestError(error));
      return ok(data.map((row) => toTitle(client, row)).sort(compareTitles));
    },

    async create(id, title) {
      // upsert por id: reintentar la misma creación no falla ni duplica (AF-91).
      const { error } = await getClient()
        .from('title')
        .upsert({
          id,
          ...toRow(title),
          name: title.name,
          colportor_price: title.colportorPrice,
          category: title.category,
        });
      return error ? err(mapWriteError(error)) : ok(undefined);
    },

    async update(id, title) {
      const { data, error } = await getClient().from('title').update(toRow(title)).eq('id', id).select('id');
      if (error) return err(mapWriteError(error));
      // Sin filas: no existe o la RLS no deja (no es admin).
      return data.length === 0 ? err(appError(COMMON_ERROR_CODES.NOT_FOUND)) : ok(undefined);
    },

    async uploadCover(path, blob) {
      try {
        const { error } = await getClient()
          .storage.from(TITLE_IMAGES_BUCKET)
          // Cada portada tiene su propia ruta (titleCoverPath): se puede guardar en caché mucho tiempo.
          .upload(path, blob, {
            upsert: true,
            contentType: blob.type || 'image/webp',
            cacheControl: '31536000',
          });
        return error ? err(mapStorageError(error)) : ok(undefined);
      } catch (cause) {
        // Supabase Storage lanza (en vez de devolver error) cuando no hay red.
        return err(mapStorageError({ message: String(cause) }));
      }
    },
  };
}
