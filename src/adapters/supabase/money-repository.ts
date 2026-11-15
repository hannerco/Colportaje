import { z } from 'zod';
import { DEPOSIT_DRAFT_ERROR_CODES, toDepositPayment } from '@/domain/deposit-draft';
import { COMMON_ERROR_CODES } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import type { LocalDate } from '@/domain/time';
import type { MoneyRepository } from '@/repositories';
import type { GetSupabaseClient } from './client';
import { PAYMENT_COLUMNS, toPayment } from './customer-repository';
import { mapPostgrestError, mapRpcError } from './errors';
import { selectAll } from './select-all';

const depositLinkSchema = z.object({ leader_deposit_id: z.uuid().nullable() });

const depositRowSchema = z.object({
  status: z.enum(['draft', 'confirmed']),
  cash_amount: z.number().int(),
  transfer_amount: z.number().int(),
  deposit_number: z.number().int().nullable(),
});

const instant = z.string().transform((value) => new Date(value));
const localDate = z.string().transform((value) => value as LocalDate);

const depositDetailSchema = z.object({
  id: z.uuid(),
  title: z.string().nullable(),
  deposit_number: z.number().int().nullable(),
  deposit_date: localDate,
  cash_amount: z.number().int(),
  transfer_amount: z.number().int(),
  note: z.string().nullable(),
  status: z.enum(['draft', 'confirmed']),
  confirmed_at: instant.nullable(),
  payment: z.array(
    z.object({
      id: z.uuid(),
      paid_at: localDate.nullable(),
      paid_amount: z.number().int().nullable(),
      method: z.enum(['cash', 'transfer']).nullable(),
      deleted_at: z.string().nullable(),
      customer: z.object({ name: z.string() }),
    }),
  ),
  photo: z.array(
    z.object({
      id: z.uuid(),
      path: z.string(),
      thumb_path: z.string().nullable(),
      created_at: instant,
      deleted_at: z.string().nullable(),
    }),
  ),
});

const DRAFT_ERRORS = [
  DEPOSIT_DRAFT_ERROR_CODES.PAYMENT_NOT_AVAILABLE,
  DEPOSIT_DRAFT_ERROR_CODES.DEPOSIT_NOT_DRAFT,
  COMMON_ERROR_CODES.VALIDATION,
  COMMON_ERROR_CODES.CONFLICT,
  COMMON_ERROR_CODES.FORBIDDEN,
];

/** Detalles: los abonos que ya no están disponibles o el campo inválido. */
const draftDetails = (code: string, detail: string | null) => {
  if (code === DEPOSIT_DRAFT_ERROR_CODES.PAYMENT_NOT_AVAILABLE && detail)
    return { paymentIds: z.array(z.uuid()).parse(JSON.parse(detail)) };
  if (code === COMMON_ERROR_CODES.VALIDATION && detail) return { field: detail };
  return undefined;
};

export function createSupabaseMoneyRepository(getClient: GetSupabaseClient): MoneyRepository {
  return {
    async listPayments() {
      const client = getClient();
      const rows = await selectAll((from, to) =>
        client
          .from('payment')
          .select(`${PAYMENT_COLUMNS}, leader_deposit_id`)
          .is('deleted_at', null)
          .order('id')
          .range(from, to),
      );
      if (!rows.ok) return rows;
      return ok(
        rows.value.map((raw) => ({
          ...toPayment(raw),
          depositId: depositLinkSchema.parse(raw).leader_deposit_id,
        })),
      );
    },

    async listSummaryDeposits() {
      const client = getClient();
      const rows = await selectAll((from, to) =>
        client
          .from('leader_deposit')
          .select('status, cash_amount, transfer_amount, deposit_number')
          .is('deleted_at', null)
          .order('id')
          .range(from, to),
      );
      if (!rows.ok) return rows;
      return ok(
        rows.value.map((raw) => {
          const row = depositRowSchema.parse(raw);
          return {
            status: row.status,
            cashAmount: row.cash_amount,
            transferAmount: row.transfer_amount,
            depositNumber: row.deposit_number,
          };
        }),
      );
    },

    async getDeposit(depositId) {
      const client = getClient();
      const [detail, last] = await Promise.all([
        client
          .from('leader_deposit')
          .select(
            `id, title, deposit_number, deposit_date, cash_amount, transfer_amount, note, status, confirmed_at,
             payment(id, paid_at, paid_amount, method, deleted_at, customer(name)),
             photo(id, path, thumb_path, created_at, deleted_at)`,
          )
          .eq('id', depositId)
          .is('deleted_at', null)
          .maybeSingle(),
        client
          .from('leader_deposit')
          .select('deposit_number')
          .not('deposit_number', 'is', null)
          .order('deposit_number', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (detail.error) return err(mapPostgrestError(detail.error));
      if (last.error) return err(mapPostgrestError(last.error));
      if (!detail.data) return ok(null);
      const row = depositDetailSchema.parse(detail.data);
      return ok({
        deposit: {
          id: row.id,
          title: row.title,
          depositNumber: row.deposit_number,
          depositDate: row.deposit_date,
          cashAmount: row.cash_amount,
          transferAmount: row.transfer_amount,
          note: row.note,
          status: row.status,
          confirmedAt: row.confirmed_at,
        },
        payments: row.payment
          .filter((p) => p.deleted_at === null)
          .map((p) =>
            toDepositPayment(
              { id: p.id, paidAt: p.paid_at, paidAmount: p.paid_amount, method: p.method },
              p.customer.name,
            ),
          ),
        receipts: row.photo
          .filter((p) => p.deleted_at === null)
          .sort((a, b) => a.created_at.getTime() - b.created_at.getTime() || (a.id < b.id ? -1 : 1))
          .map((p) => ({
            id: p.id,
            path: p.path,
            thumbPath: p.thumb_path ?? p.path,
            createdAt: p.created_at,
          })),
        lastNumber: z
          .number()
          .int()
          .nullable()
          .parse(last.data?.deposit_number ?? null),
      });
    },

    async saveDepositDraft(draft) {
      const { data, error } = await getClient().rpc('save_deposit_draft', {
        p_deposit: {
          id: draft.depositId,
          title: draft.title,
          depositDate: draft.depositDate,
          paymentIds: [...draft.paymentIds],
          cash: draft.cash,
          transfer: draft.transfer,
          note: draft.note,
          stagedReceipts: draft.stagedReceipts.map((r) => ({
            photoId: r.photoId,
            path: r.path,
            thumbPath: r.thumbPath,
            bytes: r.bytes,
          })),
        },
      });
      if (error) return err(mapRpcError(error, DRAFT_ERRORS, draftDetails));
      return ok({ depositId: z.uuid().parse(data) });
    },

    async deleteDepositDraft(depositId) {
      const { data, error } = await getClient().rpc('delete_deposit_draft', { p_deposit_id: depositId });
      if (error) return err(mapRpcError(error, DRAFT_ERRORS));
      return ok({ paths: z.array(z.string()).parse(data ?? []) });
    },
  };
}
