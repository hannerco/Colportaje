import { z } from 'zod';
import { ok } from '@/domain/shared/result';
import type { MoneyRepository } from '@/repositories';
import type { GetSupabaseClient } from './client';
import { PAYMENT_COLUMNS, toPayment } from './customer-repository';
import { selectAll } from './select-all';

const depositLinkSchema = z.object({ leader_deposit_id: z.uuid().nullable() });

const depositRowSchema = z.object({
  status: z.enum(['draft', 'confirmed']),
  cash_amount: z.number().int(),
  transfer_amount: z.number().int(),
});

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
          .select('status, cash_amount, transfer_amount')
          .is('deleted_at', null)
          .order('id')
          .range(from, to),
      );
      if (!rows.ok) return rows;
      return ok(
        rows.value.map((raw) => {
          const row = depositRowSchema.parse(raw);
          return { status: row.status, cashAmount: row.cash_amount, transferAmount: row.transfer_amount };
        }),
      );
    },
  };
}
