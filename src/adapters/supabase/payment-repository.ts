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
  };
}
