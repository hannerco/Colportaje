import { z } from 'zod';
import { ok } from '@/domain/shared/result';
import type { MoneyRepository } from '@/repositories';
import type { GetSupabaseClient } from './client';
import { selectAll } from './select-all';

const paymentRowSchema = z.object({
  customer_id: z.uuid(),
  status: z.enum(['scheduled', 'collected', 'delivered', 'canceled']),
  agreed_amount: z.number().int().nullable(),
  paid_amount: z.number().int().nullable(),
  method: z.enum(['cash', 'transfer']).nullable(),
});

const depositRowSchema = z.object({
  status: z.enum(['draft', 'confirmed']),
  cash_amount: z.number().int(),
  transfer_amount: z.number().int(),
});

export function createSupabaseMoneyRepository(getClient: GetSupabaseClient): MoneyRepository {
  return {
    async listSummaryPayments() {
      const client = getClient();
      const rows = await selectAll((from, to) =>
        client
          .from('payment')
          .select('customer_id, status, agreed_amount, paid_amount, method')
          .is('deleted_at', null)
          .order('id')
          .range(from, to),
      );
      if (!rows.ok) return rows;
      return ok(
        rows.value.map((raw) => {
          const row = paymentRowSchema.parse(raw);
          return {
            customerId: row.customer_id,
            status: row.status,
            agreedAmount: row.agreed_amount,
            paidAmount: row.paid_amount,
            method: row.method,
          };
        }),
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
