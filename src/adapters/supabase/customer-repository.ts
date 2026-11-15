import type { PostgrestError } from '@supabase/supabase-js';
import { z } from 'zod';
import { CUSTOMER_ERROR_CODES, type CustomerPatch } from '@/domain/customer-data';
import type { Payment } from '@/domain/payment';
import { appError, COMMON_ERROR_CODES } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import type { LocalDate } from '@/domain/time';
import type { CustomerRepository } from '@/repositories';
import type { GetSupabaseClient } from './client';
import { mapPostgrestError, mapRpcError } from './errors';
import { selectAll } from './select-all';

const localDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .transform((value) => value as LocalDate);
const instant = z.string().transform((value) => new Date(value));

const customerRowSchema = z.object({ id: z.uuid(), created_at: instant });
const soldCopyRowSchema = z.object({ agreed_price: z.number().int(), sold_at: instant });

const PAYMENT_COLUMNS =
  'id, customer_id, kind, status, original_due_date, due_date, paid_at, agreed_amount, paid_amount, method, canceled_at, cancel_reason, created_at' as const;

const paymentRowSchema = z.object({
  id: z.uuid(),
  customer_id: z.uuid(),
  kind: z.enum(['down_payment', 'scheduled', 'extra']),
  status: z.enum(['scheduled', 'collected', 'delivered', 'canceled']),
  original_due_date: localDate.nullable(),
  due_date: localDate.nullable(),
  paid_at: localDate.nullable(),
  agreed_amount: z.number().int().nullable(),
  paid_amount: z.number().int().nullable(),
  method: z.enum(['cash', 'transfer']).nullable(),
  canceled_at: instant.nullable(),
  cancel_reason: z.enum(['book_returned', 'overpaid', 'manual', 'customer_archived']).nullable(),
  created_at: instant,
});

/** Fila de `payment` → `Payment` del dominio. */
export const toPayment = (raw: unknown): Payment => {
  const row = paymentRowSchema.parse(raw);
  return {
    id: row.id,
    customerId: row.customer_id,
    kind: row.kind,
    status: row.status,
    originalDueDate: row.original_due_date,
    dueDate: row.due_date,
    paidAt: row.paid_at,
    agreedAmount: row.agreed_amount,
    paidAmount: row.paid_amount,
    method: row.method,
    canceledAt: row.canceled_at,
    cancelReason: row.cancel_reason,
    createdAt: row.created_at,
  };
};

export function createSupabaseCustomerRepository(getClient: GetSupabaseClient): CustomerRepository {
  return {
    async getAccountData(customerId) {
      const client = getClient();
      const customer = await client
        .from('customer')
        .select('id, created_at')
        .eq('id', customerId)
        .is('deleted_at', null)
        .maybeSingle();
      if (customer.error) return err(mapPostgrestError(customer.error));
      if (!customer.data) return err(appError(COMMON_ERROR_CODES.NOT_FOUND));

      const [copies, payments] = await Promise.all([
        selectAll((from, to) =>
          client
            .from('copy')
            .select('agreed_price, sold_at')
            .eq('customer_id', customerId)
            .eq('status', 'sold')
            .is('deleted_at', null)
            .order('id')
            .range(from, to),
        ),
        selectAll((from, to) =>
          client
            .from('payment')
            .select(PAYMENT_COLUMNS)
            .eq('customer_id', customerId)
            .is('deleted_at', null)
            .order('id')
            .range(from, to),
        ),
      ]);
      if (!copies.ok) return copies;
      if (!payments.ok) return payments;
      return ok({
        customer: { createdAt: customerRowSchema.parse(customer.data).created_at },
        soldCopies: copies.value.map((raw) => {
          const row = soldCopyRowSchema.parse(raw);
          return { agreedPrice: row.agreed_price, soldAt: row.sold_at };
        }),
        payments: payments.value.map(toPayment),
      });
    },

    async create({ id, name }) {
      const client = getClient();
      const inserted = await client
        .from('customer')
        .upsert({ id, name }, { onConflict: 'id', ignoreDuplicates: true })
        .select('id');
      if (inserted.error) return err(mapCustomerWriteError(inserted.error));
      if (inserted.data.length > 0) return ok({ id });
      // Ya existía: es un reintento si el cliente es del usuario; si no, el id está ocupado.
      const existing = await client.from('customer').select('id').eq('id', id).maybeSingle();
      if (existing.error) return err(mapPostgrestError(existing.error));
      return existing.data ? ok({ id }) : err(appError(COMMON_ERROR_CODES.CONFLICT));
    },

    async update(id, patch) {
      const { data, error } = await getClient()
        .from('customer')
        .update(toCustomerColumns(patch))
        .eq('id', id)
        .is('deleted_at', null)
        .select('id');
      if (error) return err(mapCustomerWriteError(error));
      return data.length > 0 ? ok(undefined) : err(appError(COMMON_ERROR_CODES.NOT_FOUND));
    },

    async setLocation(id, location) {
      const { data, error } = await getClient()
        .from('customer')
        .update({
          latitude: location?.latitude ?? null,
          longitude: location?.longitude ?? null,
          location_accuracy_m: location?.accuracyMeters ?? null,
        })
        .eq('id', id)
        .is('deleted_at', null)
        .select('id');
      if (error) return err(mapCustomerWriteError(error));
      return data.length > 0 ? ok(undefined) : err(appError(COMMON_ERROR_CODES.NOT_FOUND));
    },

    async archive(id) {
      const { error } = await getClient().rpc('archive_customer', { p_customer_id: id });
      if (error)
        return err(
          mapRpcError(error, [CUSTOMER_ERROR_CODES.CUSTOMER_HAS_BOOKS, COMMON_ERROR_CODES.NOT_FOUND]),
        );
      return ok(undefined);
    },

    async restore(id) {
      const { error } = await getClient().rpc('restore_customer', { p_customer_id: id });
      if (error)
        return err(
          mapRpcError(error, [CUSTOMER_ERROR_CODES.CUSTOMER_NOT_ARCHIVED, COMMON_ERROR_CODES.NOT_FOUND]),
        );
      return ok(undefined);
    },

    async listRefs() {
      const client = getClient();
      const rows = await selectAll((from, to) =>
        client
          .from('customer')
          .select('id, name, avatar_emoji')
          .is('deleted_at', null)
          .order('id')
          .range(from, to),
      );
      if (!rows.ok) return rows;
      return ok(
        rows.value.map((raw) => {
          const row = refRowSchema.parse(raw);
          return { id: row.id, name: row.name, avatarEmoji: row.avatar_emoji };
        }),
      );
    },

    async getRefs(ids) {
      if (ids.length === 0) return ok([]);
      const { data, error } = await getClient()
        .from('customer')
        .select('id, name, avatar_emoji')
        .in('id', [...new Set(ids)]);
      if (error) return err(mapPostgrestError(error));
      return ok(
        data.map((raw) => {
          const row = refRowSchema.parse(raw);
          return { id: row.id, name: row.name, avatarEmoji: row.avatar_emoji };
        }),
      );
    },

    async listForCustomerList() {
      const client = getClient();
      const [customers, copies, payments] = await Promise.all([
        selectAll((from, to) =>
          client
            .from('customer')
            .select('id, name, avatar_emoji, phone, info, address, created_at, updated_at, archived_at')
            .is('deleted_at', null)
            .order('id')
            .range(from, to),
        ),
        selectAll((from, to) =>
          client
            .from('copy')
            .select('id, customer_id, title_id, agreed_price, sold_at')
            .eq('status', 'sold')
            .is('deleted_at', null)
            .order('id')
            .range(from, to),
        ),
        selectAll((from, to) =>
          client
            .from('payment')
            .select('customer_id, status, agreed_amount, paid_amount, due_date, paid_at')
            .is('deleted_at', null)
            .order('id')
            .range(from, to),
        ),
      ]);
      if (!customers.ok) return customers;
      if (!copies.ok) return copies;
      if (!payments.ok) return payments;
      return ok({
        customers: customers.value.map((raw) => {
          const row = listCustomerRowSchema.parse(raw);
          return {
            id: row.id,
            name: row.name,
            avatarEmoji: row.avatar_emoji,
            phone: row.phone,
            info: row.info,
            address: row.address,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            archived: row.archived_at !== null,
          };
        }),
        soldCopies: copies.value.map((raw) => {
          const row = listCopyRowSchema.parse(raw);
          return {
            copyId: row.id,
            customerId: row.customer_id,
            titleId: row.title_id,
            agreedPrice: row.agreed_price,
            soldAt: row.sold_at,
          };
        }),
        payments: payments.value.map((raw) => {
          const row = listPaymentRowSchema.parse(raw);
          return {
            customerId: row.customer_id,
            status: row.status,
            agreedAmount: row.agreed_amount,
            paidAmount: row.paid_amount,
            dueDate: row.due_date,
            paidAt: row.paid_at,
          };
        }),
      });
    },

    async getDiscardSummary(customerId) {
      const { data, error } = await getClient().rpc('customer_discard_summary', {
        p_customer_id: customerId,
      });
      if (error) return err(mapRpcError(error, [COMMON_ERROR_CODES.NOT_FOUND]));
      const row = discardSummaryRowsSchema.parse(data)[0]!;
      return ok({
        books: row.books,
        payments: row.payments,
        invoices: row.invoices,
        photos: row.photos,
        blockedByDeposit: row.blocked_by_deposit,
      });
    },

    async discardNew(customerId) {
      const { error } = await getClient().rpc('discard_new_customer', { p_customer_id: customerId });
      if (error)
        return err(
          mapRpcError(error, [
            CUSTOMER_ERROR_CODES.CUSTOMER_DISCARD_BLOCKED,
            CUSTOMER_ERROR_CODES.CUSTOMER_ARCHIVED,
            COMMON_ERROR_CODES.NOT_FOUND,
          ]),
        );
      return ok(undefined);
    },

    async listDuplicateCandidates() {
      const client = getClient();
      const rows = await selectAll((from, to) =>
        client
          .from('customer')
          .select('id, name, phone, archived_at')
          .is('deleted_at', null)
          .order('id')
          .range(from, to),
      );
      if (!rows.ok) return rows;
      return ok(
        rows.value.map((raw) => {
          const row = candidateRowSchema.parse(raw);
          return { id: row.id, name: row.name, phone: row.phone, archived: row.archived_at !== null };
        }),
      );
    },
  };
}

const listCustomerRowSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  avatar_emoji: z.string().nullable(),
  phone: z.string().nullable(),
  info: z.string().nullable(),
  address: z.string().nullable(),
  created_at: instant,
  updated_at: instant,
  archived_at: z.string().nullable(),
});
const listCopyRowSchema = z.object({
  id: z.uuid(),
  customer_id: z.uuid(),
  title_id: z.uuid(),
  agreed_price: z.number().int(),
  sold_at: instant,
});
const listPaymentRowSchema = paymentRowSchema.pick({
  customer_id: true,
  status: true,
  agreed_amount: true,
  paid_amount: true,
  due_date: true,
  paid_at: true,
});

const count = z.number().int().nonnegative();
const discardSummaryRowsSchema = z
  .array(
    z.object({
      books: count,
      payments: count,
      invoices: count,
      photos: count,
      blocked_by_deposit: z.boolean(),
    }),
  )
  .length(1);

const refRowSchema = z.object({ id: z.uuid(), name: z.string(), avatar_emoji: z.string().nullable() });

const candidateRowSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  phone: z.string().nullable(),
  archived_at: z.string().nullable(),
});

/** Parche del dominio → columnas; solo las que vienen en el parche. */
const toCustomerColumns = (patch: CustomerPatch) => {
  const columns: {
    name?: string;
    phone?: string | null;
    info?: string | null;
    address?: string | null;
    avatar_emoji?: string | null;
    maps_url?: string | null;
  } = {};
  if (patch.name !== undefined) columns.name = patch.name;
  if (patch.phone !== undefined) columns.phone = patch.phone;
  if (patch.info !== undefined) columns.info = patch.info;
  if (patch.address !== undefined) columns.address = patch.address;
  if (patch.avatarEmoji !== undefined) columns.avatar_emoji = patch.avatarEmoji;
  if (patch.mapsUrl !== undefined) columns.maps_url = patch.mapsUrl;
  return columns;
};

/** Checks de la base → VALIDATION con su campo (el dominio valida antes; esto es la red de seguridad). */
const CHECK_FIELDS: Readonly<Record<string, string>> = {
  customer_name_check: 'name',
  customer_avatar_emoji_check: 'avatarEmoji',
  customer_maps_url_allowed: 'mapsUrl',
  customer_latitude_check: 'latitude',
  customer_longitude_check: 'longitude',
  customer_location_accuracy_m_check: 'accuracyMeters',
  customer_coordinates_together: 'latitude',
};

const mapCustomerWriteError = (error: PostgrestError) => {
  if (error.code === '23514') {
    const field = Object.entries(CHECK_FIELDS).find(([constraint]) =>
      error.message.includes(constraint),
    )?.[1];
    if (field) return appError(COMMON_ERROR_CODES.VALIDATION, { field });
  }
  return mapRpcError(error, [CUSTOMER_ERROR_CODES.CUSTOMER_ARCHIVED]);
};
