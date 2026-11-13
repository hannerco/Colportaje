import { z } from 'zod';
import { ADD_COPIES_ERROR_CODES } from '@/domain/add-batch';
import { ASSIGN_ERROR_CODES } from '@/domain/assignable-copies';
import { CUSTOMER_ERROR_CODES } from '@/domain/customer-data';
import type { CopiesListCopy } from '@/domain/copies-list';
import type { CopyEvent } from '@/domain/copy';
import { RECEIVED_DATE_ERROR_CODES } from '@/domain/copy-detail';
import { appError, COMMON_ERROR_CODES } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import type { LocalDate } from '@/domain/time';
import type { FlaggedCopyInput, StockCopy } from '@/domain/inventory';
import type { CopyRepository } from '@/repositories';
import type { GetSupabaseClient } from './client';
import { mapPostgrestError, mapRpcError } from './errors';
import { selectAll } from './select-all';

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

    async listStock() {
      const client = getClient();
      const rows = await selectAll((from, to) =>
        client
          .from('copy')
          .select(STOCK_COLUMNS)
          .in('status', ['in_stock', 'flagged'])
          .is('deleted_at', null)
          .order('id')
          .range(from, to),
      );
      return rows.ok ? ok(rows.value.map(toStockCopy)) : rows;
    },

    async listInStockOfTitle(titleId) {
      const client = getClient();
      const rows = await selectAll((from, to) =>
        client
          .from('copy')
          .select(STOCK_COLUMNS)
          .eq('title_id', titleId)
          .eq('status', 'in_stock')
          .is('deleted_at', null)
          .order('id')
          .range(from, to),
      );
      return rows.ok ? ok(rows.value.map(toStockCopy)) : rows;
    },

    async listFlagged() {
      const client = getClient();
      const flagged = await selectAll((from, to) =>
        client
          .from('copy')
          .select('id, title_id, number, updated_at')
          .eq('status', 'flagged')
          .is('deleted_at', null)
          .order('id')
          .range(from, to),
      );
      if (!flagged.ok) return flagged;
      if (flagged.value.length === 0) return ok([]);
      // Las novedades abiertas son pocas (una por ejemplar con novedad, R6 de HU-INV-01).
      const issues = await selectAll((from, to) =>
        client
          .from('copy_issue')
          .select('copy_id, note, created_at')
          .is('resolved_at', null)
          .order('id')
          .range(from, to),
      );
      if (!issues.ok) return issues;
      const openIssue = new Map(
        issues.value.map((raw) => {
          const issue = openIssueSchema.parse(raw);
          return [issue.copy_id, issue] as const;
        }),
      );
      return ok(
        flagged.value.map((raw): FlaggedCopyInput => {
          const row = flaggedRowSchema.parse(raw);
          const issue = openIssue.get(row.id);
          // Sin novedad abierta (no debería pasar): sin nota y con la fecha del último cambio del ejemplar.
          return {
            copyId: row.id,
            titleId: row.title_id,
            number: row.number,
            note: issue?.note ?? null,
            flaggedAt: new Date(issue?.created_at ?? row.updated_at),
          };
        }),
      );
    },

    async listAll() {
      const client = getClient();
      const rows = await selectAll((from, to) =>
        client.from('copy').select(LIST_COLUMNS).is('deleted_at', null).order('id').range(from, to),
      );
      if (!rows.ok) return rows;
      return ok(
        rows.value.map((raw): CopiesListCopy => {
          const row = listRowSchema.parse(raw);
          return {
            id: row.id,
            titleId: row.title_id,
            number: row.number,
            status: row.status,
            customerId: row.customer_id,
            agreedPrice: row.agreed_price,
            publicPriceSnapshot: row.public_price_snapshot,
            receivedAt: row.received_at,
            soldAt: row.sold_at === null ? null : new Date(row.sold_at),
            deletedAt: null,
          };
        }),
      );
    },

    async getDetail(copyId) {
      const client = getClient();
      const copy = await client
        .from('copy')
        .select(LIST_COLUMNS)
        .eq('id', copyId)
        .is('deleted_at', null)
        .maybeSingle();
      if (copy.error) return err(mapPostgrestError(copy.error));
      if (!copy.data) return err(appError(COMMON_ERROR_CODES.NOT_FOUND));
      const issue = await client
        .from('copy_issue')
        .select('note, created_at')
        .eq('copy_id', copyId)
        .is('resolved_at', null)
        .maybeSingle();
      if (issue.error) return err(mapPostgrestError(issue.error));
      const row = listRowSchema.parse(copy.data);
      const open = issue.data ? openIssueDetailSchema.parse(issue.data) : null;
      return ok({
        copy: {
          id: row.id,
          titleId: row.title_id,
          number: row.number,
          status: row.status,
          customerId: row.customer_id,
          agreedPrice: row.agreed_price,
          publicPriceSnapshot: row.public_price_snapshot,
          receivedAt: row.received_at,
          soldAt: row.sold_at === null ? null : new Date(row.sold_at),
          deletedAt: null,
        },
        openIssue: open && { note: open.note, createdAt: new Date(open.created_at) },
      });
    },

    async updateReceivedDate(copyId, date) {
      const { error } = await getClient().rpc('update_copy_received_date', {
        p_copy_id: copyId,
        p_date: date,
      });
      if (error) return err(mapRpcError(error, RECEIVED_DATE_ERRORS));
      return ok(undefined);
    },

    async assignToCustomer(copyId, customerId) {
      const { error } = await getClient().rpc('assign_copy_to_customer', {
        p_copy_id: copyId,
        p_customer_id: customerId,
      });
      if (error) return err(mapRpcError(error, ASSIGN_ERRORS));
      return ok(undefined);
    },

    async returnFromCustomer(copyId, reason) {
      const { data, error } = await getClient().rpc('return_copy_from_customer', {
        p_copy_id: copyId,
        p_reason: reason,
      });
      if (error) return err(mapRpcError(error, ASSIGN_ERRORS));
      return ok({ customerId: z.uuid().parse(data) });
    },

    async addBatch(input) {
      const { data, error } = await getClient().rpc('add_copies', {
        p_batch_id: input.batchId,
        p_received_at: input.receivedAt,
        p_lines: input.lines.map((line) => ({ titleId: line.titleId, copyIds: [...line.copyIds] })),
      });
      if (error) return err(mapRpcError(error, ADD_COPIES_ERRORS, addCopiesDetails));
      return ok({
        created: createdRowsSchema.parse(data).map((row) => ({
          copyId: row.copy_id,
          titleId: row.title_id,
          number: row.number,
        })),
      });
    },
  };
}

const ADD_COPIES_ERRORS = [
  ...Object.values(ADD_COPIES_ERROR_CODES),
  COMMON_ERROR_CODES.VALIDATION,
  COMMON_ERROR_CODES.CONFLICT,
  COMMON_ERROR_CODES.FORBIDDEN,
];

const addCopiesDetails = (code: string, detail: string | null) => {
  if (code === ADD_COPIES_ERROR_CODES.TITLE_INACTIVE && detail) {
    return { titleIds: z.array(z.uuid()).parse(JSON.parse(detail)) };
  }
  // La base revalida la forma del lote; el dominio ya rechaza antes lo que puede (VALIDATION con field).
  return code === COMMON_ERROR_CODES.VALIDATION ? { field: 'lines' } : undefined;
};

const createdRowsSchema = z.array(
  z.object({ copy_id: z.uuid(), title_id: z.uuid(), number: z.number().int().positive() }),
);

const STOCK_COLUMNS = 'id, title_id, number, status, received_at' as const;

const stockRowSchema = z.object({
  id: z.uuid(),
  title_id: z.uuid(),
  number: z.number().int(),
  status: z.enum(['in_stock', 'sold', 'flagged', 'lost', 'returned_to_leader']),
  received_at: localDate,
});

const toStockCopy = (raw: unknown): StockCopy => {
  const row = stockRowSchema.parse(raw);
  return {
    id: row.id,
    titleId: row.title_id,
    number: row.number,
    status: row.status,
    receivedAt: row.received_at,
  };
};

const flaggedRowSchema = z.object({
  id: z.uuid(),
  title_id: z.uuid(),
  number: z.number().int(),
  updated_at: z.string(),
});

const openIssueSchema = z.object({ copy_id: z.uuid(), note: z.string(), created_at: z.string() });

const LIST_COLUMNS =
  'id, title_id, number, status, customer_id, agreed_price, public_price_snapshot, received_at, sold_at' as const;

const listRowSchema = z.object({
  id: z.uuid(),
  title_id: z.uuid(),
  number: z.number().int(),
  status: z.enum(['in_stock', 'sold', 'flagged', 'lost', 'returned_to_leader']),
  customer_id: z.uuid().nullable(),
  agreed_price: z.number().int().nullable(),
  public_price_snapshot: z.number().int().nullable(),
  received_at: localDate,
  sold_at: z.string().nullable(),
});

const openIssueDetailSchema = z.object({ note: z.string(), created_at: z.string() });

const RECEIVED_DATE_ERRORS = [
  ...Object.values(RECEIVED_DATE_ERROR_CODES),
  COMMON_ERROR_CODES.NOT_FOUND,
  COMMON_ERROR_CODES.FORBIDDEN,
];

const ASSIGN_ERRORS = [
  ...Object.values(ASSIGN_ERROR_CODES),
  CUSTOMER_ERROR_CODES.CUSTOMER_ARCHIVED,
  COMMON_ERROR_CODES.NOT_FOUND,
  COMMON_ERROR_CODES.FORBIDDEN,
  COMMON_ERROR_CODES.VALIDATION,
];
