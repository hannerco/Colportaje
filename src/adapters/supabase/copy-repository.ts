import { z } from 'zod';
import type { CopyEvent } from '@/domain/copy';
import { appError, COMMON_ERROR_CODES } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import type { LocalDate } from '@/domain/time';
import type { CopyRepository } from '@/repositories';
import type { GetSupabaseClient } from './client';
import { mapPostgrestError } from './errors';

const localDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .transform((value) => value as LocalDate);

const eventRowSchema = z.object({
  id: z.uuid(),
  type: z.enum([
    'received',
    'sold',
    'returned',
    'flagged',
    'resolved',
    'undo_resolved',
    'deleted',
    'undo_deleted',
    'price_changed',
    'received_date_changed',
    'minibook_sold',
    'returned_to_leader',
    'undo_returned_to_leader',
  ]),
  note: z.string().nullable(),
  at: z.string().transform((value) => new Date(value)),
  data: z
    .object({
      customerId: z.uuid().optional(),
      agreedPrice: z.number().int().optional(),
      oldPrice: z.number().int().nullable().optional(),
      newPrice: z.number().int().nullable().optional(),
      oldDate: localDate.optional(),
      newDate: localDate.optional(),
      reason: z.string().optional(),
      resolution: z.string().optional(),
      previousStatus: z.enum(['in_stock', 'sold', 'flagged', 'lost', 'returned_to_leader']).optional(),
    })
    .loose(),
});

export function createSupabaseCopyRepository(getClient: GetSupabaseClient): CopyRepository {
  return {
    async getHistory(copyId) {
      const client = getClient();
      // R5: un ejemplar eliminado no aparece en ninguna lectura.
      const copy = await client
        .from('copy')
        .select('id')
        .eq('id', copyId)
        .is('deleted_at', null)
        .maybeSingle();
      if (copy.error) return err(mapPostgrestError(copy.error));
      if (!copy.data) return err(appError(COMMON_ERROR_CODES.NOT_FOUND));

      const { data, error } = await client
        .from('copy_event')
        .select('id, type, note, at, data')
        .eq('copy_id', copyId)
        .order('seq', { ascending: false });
      if (error) return err(mapPostgrestError(error));
      return ok(
        data.map((row): CopyEvent => {
          const event = eventRowSchema.parse(row);
          const {
            customerId,
            agreedPrice,
            oldPrice,
            newPrice,
            oldDate,
            newDate,
            reason,
            resolution,
            previousStatus,
          } = event.data;
          return {
            id: event.id,
            type: event.type,
            at: event.at,
            note: event.note,
            data: Object.fromEntries(
              Object.entries({
                customerId,
                agreedPrice,
                oldPrice,
                newPrice,
                oldDate,
                newDate,
                reason,
                resolution,
                previousStatus,
              }).filter(([, value]) => value !== undefined),
            ),
          };
        }),
      );
    },
  };
}
