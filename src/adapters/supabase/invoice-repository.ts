import { z } from 'zod';
import { CUSTOMER_ERROR_CODES } from '@/domain/customer-data';
import type { LocalDate } from '@/domain/time';
import { COMMON_ERROR_CODES } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import type { InvoiceRepository } from '@/repositories';
import type { GetSupabaseClient } from './client';
import { mapPostgrestError, mapRpcError } from './errors';

const INVOICE_ERRORS = [
  CUSTOMER_ERROR_CODES.CUSTOMER_ARCHIVED,
  COMMON_ERROR_CODES.NOT_FOUND,
  COMMON_ERROR_CODES.CONFLICT,
  COMMON_ERROR_CODES.VALIDATION,
  COMMON_ERROR_CODES.FORBIDDEN,
];

const mapInvoiceError = (error: Parameters<typeof mapRpcError>[0]) =>
  mapRpcError(error, INVOICE_ERRORS, (code, detail) =>
    code === COMMON_ERROR_CODES.VALIDATION && detail ? { field: detail } : undefined,
  );

const instant = z.string().transform((value) => new Date(value));

const invoiceRowsSchema = z.array(
  z.object({
    id: z.uuid(),
    invoice_number: z.string().nullable(),
    invoice_date: z
      .string()
      .nullable()
      .transform((value) => value as LocalDate | null),
    created_at: instant,
    photo: z.array(
      z.object({
        id: z.uuid(),
        path: z.string(),
        thumb_path: z.string().nullable(),
        created_at: instant,
        deleted_at: z.string().nullable(),
      }),
    ),
  }),
);

export function createSupabaseInvoiceRepository(getClient: GetSupabaseClient): InvoiceRepository {
  return {
    async listOfCustomer(customerId) {
      const { data, error } = await getClient()
        .from('customer_invoice')
        .select(
          'id, invoice_number, invoice_date, created_at, photo(id, path, thumb_path, created_at, deleted_at)',
        )
        .eq('customer_id', customerId)
        .is('deleted_at', null);
      if (error) return err(mapPostgrestError(error));
      return ok(
        invoiceRowsSchema.parse(data).map((row) => ({
          id: row.id,
          number: row.invoice_number,
          date: row.invoice_date,
          createdAt: row.created_at,
          photos: row.photo
            .filter((p) => p.deleted_at === null)
            .map((p) => ({
              id: p.id,
              path: p.path,
              thumbPath: p.thumb_path ?? p.path,
              createdAt: p.created_at,
            })),
        })),
      );
    },

    async createWithPhoto({ invoiceId, customerId, photo }) {
      const { error } = await getClient().rpc('create_invoice_with_photo', {
        p_invoice_id: invoiceId,
        p_photo_id: photo.photoId,
        p_customer_id: customerId,
        p_path: photo.path,
        p_thumb_path: photo.thumbPath,
        p_bytes: photo.bytes,
      });
      return error ? err(mapInvoiceError(error)) : ok(undefined);
    },

    async addPhoto(invoiceId, photo) {
      const { error } = await getClient().rpc('add_invoice_photo', {
        p_invoice_id: invoiceId,
        p_photo_id: photo.photoId,
        p_path: photo.path,
        p_thumb_path: photo.thumbPath,
        p_bytes: photo.bytes,
      });
      return error ? err(mapInvoiceError(error)) : ok(undefined);
    },

    async update(invoiceId, patch) {
      const { error } = await getClient().rpc('update_invoice', {
        p_invoice_id: invoiceId,
        p_patch: { ...patch },
      });
      return error ? err(mapInvoiceError(error)) : ok(undefined);
    },

    async deletePhoto(photoId) {
      const { data, error } = await getClient().rpc('delete_invoice_photo', { p_photo_id: photoId });
      if (error) return err(mapInvoiceError(error));
      return ok({ invoiceDeleted: z.boolean().parse(data) });
    },
  };
}
