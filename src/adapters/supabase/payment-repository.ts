import { z } from 'zod';
import { COLLECTED_PAYMENT_ERROR_CODES } from '@/domain/collected-payment';
import { CUSTOMER_ERROR_CODES } from '@/domain/customer-data';
import { PAYMENT_ERROR_CODES } from '@/domain/payment';
import { PAYMENT_PLAN_ERROR_CODES } from '@/domain/payment-plan';
import { RESCHEDULE_ERROR_CODES } from '@/domain/reschedule';
import { SCHEDULED_PAYMENT_ERROR_CODES } from '@/domain/scheduled-payment';
import type { LocalDate } from '@/domain/time';
import { SCHEDULE_EXCESS_ERROR_CODES } from '@/domain/schedule-excess';
import { COMMON_ERROR_CODES } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import type { PaymentRepository } from '@/repositories';
import type { GetSupabaseClient } from './client';
import { mapRpcError } from './errors';

const RESOLVE_EXCESS_ERRORS = [
  ...Object.values(SCHEDULE_EXCESS_ERROR_CODES),
  COMMON_ERROR_CODES.CONFLICT,
  COMMON_ERROR_CODES.NOT_FOUND,
  COMMON_ERROR_CODES.VALIDATION,
  COMMON_ERROR_CODES.FORBIDDEN,
];

export function createSupabasePaymentRepository(getClient: GetSupabaseClient): PaymentRepository {
  return {
    async resolveScheduleExcess(customerId, choice, trigger) {
      const { error } = await getClient().rpc('resolve_schedule_excess', {
        p_customer_id: customerId,
        p_choice:
          choice.action === 'cancel_selected'
            ? { ...choice, paymentIds: [...choice.paymentIds] }
            : { ...choice },
        p_trigger: trigger,
      });
      if (error) {
        return err(
          mapRpcError(error, RESOLVE_EXCESS_ERRORS, (code) =>
            code === COMMON_ERROR_CODES.VALIDATION ? { field: 'choice' } : undefined,
          ),
        );
      }
      return ok(undefined);
    },

    async setCreationDownPayment({ paymentId, customerId, amount, method, paidOn }) {
      const { error } = await getClient().rpc('set_creation_down_payment', {
        p_payment_id: paymentId,
        p_customer_id: customerId,
        p_amount: amount,
        p_method: method,
        ...(paidOn ? { p_paid_on: paidOn } : {}),
      });
      return error ? err(mapCollectedError(error)) : ok(undefined);
    },

    async registerCollected(input) {
      const { error } = await getClient().rpc('register_collected_payment', {
        p_payment_id: input.paymentId,
        p_customer_id: input.customerId,
        p_kind: input.kind,
        p_paid_amount: input.paidAmount,
        p_paid_at: input.paidAt,
        p_method: input.method,
      });
      return error ? err(mapCollectedError(error)) : ok(undefined);
    },

    async updateCollected(paymentId, patch) {
      const { data, error } = await getClient().rpc('update_collected_payment', {
        p_payment_id: paymentId,
        ...(patch.paidAmount !== undefined && { p_paid_amount: patch.paidAmount }),
        ...(patch.paidAt !== undefined && { p_paid_at: patch.paidAt }),
        ...(patch.method !== undefined && { p_method: patch.method }),
      });
      if (error) return err(mapCollectedError(error));
      return ok({ customerId: z.uuid().parse(data) });
    },

    async applyPlan(customerId, mode, items) {
      const { error } = await getClient().rpc('apply_payment_plan', {
        p_customer_id: customerId,
        p_mode: mode,
        p_items: items.map((i) => ({ paymentId: i.paymentId, dueDate: i.dueDate, amount: i.amount })),
      });
      return error ? err(mapCollectedError(error)) : ok(undefined);
    },

    async scheduleSingle(input) {
      const { error } = await getClient().rpc('schedule_single_payment', {
        p_payment_id: input.paymentId,
        p_customer_id: input.customerId,
        p_agreed_amount: input.agreedAmount,
        p_due_date: input.dueDate,
      });
      return error ? err(mapCollectedError(error)) : ok(undefined);
    },

    async updateScheduledAmount(paymentId, agreedAmount) {
      const { data, error } = await getClient().rpc('update_scheduled_amount', {
        p_payment_id: paymentId,
        p_agreed_amount: agreedAmount,
      });
      if (error) return err(mapCollectedError(error));
      return ok({ customerId: z.uuid().parse(data) });
    },

    async correctScheduledDate(paymentId, dueDate) {
      const { data, error } = await getClient().rpc('correct_scheduled_date', {
        p_payment_id: paymentId,
        p_due_date: dueDate,
      });
      if (error) return err(mapCollectedError(error));
      return ok({ customerId: z.uuid().parse(data) });
    },

    async cancelScheduled(paymentIds) {
      const { data, error } = await getClient().rpc('cancel_scheduled_payments', {
        p_payment_ids: [...paymentIds],
      });
      if (error) return err(mapCollectedError(error));
      return ok({ customerId: z.uuid().parse(data) });
    },

    async reschedule(paymentId, input) {
      const { data, error } = await getClient().rpc('reschedule_payment', {
        p_payment_id: paymentId,
        p_new_due_date: input.newDueDate,
        ...(input.note ? { p_note: input.note } : {}),
        p_confirmed: input.confirmed ?? false,
      });
      if (error) return err(mapCollectedError(error));
      return ok({
        moved: movedRowsSchema.parse(data).map((row) => ({
          paymentId: row.payment_id,
          previousDueDate: row.previous_due_date,
          newDueDate: row.new_due_date,
        })),
      });
    },

    async collect(paymentId, input) {
      const { data, error } = await getClient().rpc('collect_payment', {
        p_payment_id: paymentId,
        ...(input.paidAmount === null ? {} : { p_paid_amount: input.paidAmount }),
        p_paid_at: input.paidAt,
        p_method: input.method,
      });
      if (error) return err(mapCollectedError(error));
      const [row] = collectedRowsSchema.parse(data);
      return ok({
        customerId: row!.customer_id,
        agreedAmount: row!.agreed_amount,
        paidAmount: row!.paid_amount,
      });
    },

    async uncollect(paymentId) {
      const { data, error } = await getClient().rpc('undo_collect_payment', { p_payment_id: paymentId });
      if (error) return err(mapCollectedError(error));
      return ok({ customerId: z.uuid().parse(data) });
    },

    async delete(paymentId) {
      const { data, error } = await getClient().rpc('delete_payment', { p_payment_id: paymentId });
      if (error) return err(mapCollectedError(error));
      const [row] = deletedRowsSchema.parse(data);
      return ok({ customerId: row!.customer_id, previousStatus: row!.previous_status });
    },
  };
}

const deletedRowsSchema = z
  .array(
    z.object({
      customer_id: z.uuid(),
      previous_status: z.enum(['scheduled', 'collected', 'delivered', 'canceled']),
    }),
  )
  .length(1);

const collectedRowsSchema = z
  .array(z.object({ customer_id: z.uuid(), agreed_amount: z.number().int(), paid_amount: z.number().int() }))
  .length(1);

const COLLECTED_ERRORS = [
  ...Object.values(COLLECTED_PAYMENT_ERROR_CODES),
  ...Object.values(PAYMENT_PLAN_ERROR_CODES),
  ...Object.values(SCHEDULED_PAYMENT_ERROR_CODES),
  ...Object.values(RESCHEDULE_ERROR_CODES),
  CUSTOMER_ERROR_CODES.CUSTOMER_ARCHIVED,
  PAYMENT_ERROR_CODES.INVALID_TRANSITION,
  COMMON_ERROR_CODES.VALIDATION,
  COMMON_ERROR_CODES.CONFLICT,
  COMMON_ERROR_CODES.NOT_FOUND,
  COMMON_ERROR_CODES.FORBIDDEN,
];

const mapCollectedError = (error: Parameters<typeof mapRpcError>[0]) =>
  mapRpcError(error, COLLECTED_ERRORS, (code, detail) => {
    if (code === COMMON_ERROR_CODES.VALIDATION && detail) return { field: detail };
    if (code === RESCHEDULE_ERROR_CODES.RESCHEDULE_NEEDS_CONFIRMATION && detail) {
      return { dates: z.array(localDateSchema).parse(JSON.parse(detail)) };
    }
    return undefined;
  });

const localDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .transform((value) => value as LocalDate);

const movedRowsSchema = z.array(
  z.object({ payment_id: z.uuid(), previous_due_date: localDateSchema, new_due_date: localDateSchema }),
);
