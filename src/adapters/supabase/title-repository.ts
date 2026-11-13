import { z } from 'zod';
import { ok, err } from '@/domain/shared/result';
import { compareTitles, type Title } from '@/domain/title';
import type { TitleRepository } from '@/repositories';
import type { AppSupabaseClient, GetSupabaseClient } from './client';
import { mapPostgrestError } from './errors';

export const TITLE_IMAGES_BUCKET = 'title-images';

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
    imageUrl: row.image_path
      ? client.storage.from(TITLE_IMAGES_BUCKET).getPublicUrl(row.image_path).data.publicUrl
      : null,
    publicPrice: row.public_price,
    colportorPrice: row.colportor_price,
    category: row.category,
    isActive: row.is_active,
  };
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
  };
}
