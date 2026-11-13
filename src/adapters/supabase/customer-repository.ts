import { z } from 'zod';
import type { Payment } from '@/domain/payment';
import { appError, COMMON_ERROR_CODES } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import type { LocalDate } from '@/domain/time';
import type { CustomerRepository } from '@/repositories';
import type { GetSupabaseClient } from './client';
import { mapPostgrestError } from './errors';
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
  };
}
