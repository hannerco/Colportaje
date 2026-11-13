// API pública de Abonos (HU-ABO-*).
export {
  paymentQueryKeys,
  useApplyPaymentPlan,
  useCancelScheduledPayments,
  useCorrectScheduledDate,
  useScheduleSinglePayment,
  useUpdateScheduledAmount,
  useDeletePayment,
  useRegisterCollectedPayment,
  useResolveScheduleExcess,
  useSetCreationDownPayment,
  useUpdateCollectedPayment,
} from './hooks';
export {
  deletePayment,
  registerCollectedPayment,
  setCreationDownPayment,
  updateCollectedPayment,
  type CollectedPaymentsDeps,
  type RegisterCollectedInput,
  type SetCreationDownPaymentInput,
  type UpdateCollectedPatch,
} from './use-cases/collected-payments';
export { COLLECTED_PAYMENT_ERROR_CODES, DEFAULT_PAY_METHOD } from '@/domain/collected-payment';
export { applyPaymentPlan, type ApplyPaymentPlanInput } from './use-cases/payment-plan';
export {
  cancelScheduledPayments,
  correctScheduledDate,
  scheduleSinglePayment,
  updateScheduledAmount,
  type ScheduleSingleInput,
} from './use-cases/scheduled-payments';
export { SCHEDULED_PAYMENT_ERROR_CODES } from '@/domain/scheduled-payment';
// Plan de abonos (cálculo puro, sin red): el front arma la vista previa "Así quedan los abonos".
export {
  PAYMENT_PLAN_ERROR_CODES,
  buildPaymentPlan,
  nextDueDate,
  planBase,
  suggestFirstDueDate,
  withPaymentIds,
  type PlanFrequency,
  type PlanItem,
  type PlanMode,
} from '@/domain/payment-plan';
export { resolveScheduleExcess, type ResolveScheduleExcessDeps } from './use-cases/resolve-schedule-excess';
// Evaluación local del sobrante (sin red): el front la llama tras cada disparador (BR-PAY-13).
export {
  EXCESS_TRIGGERS,
  SCHEDULE_EXCESS_ERROR_CODES,
  evaluateScheduleExcess,
  scheduledForExcess,
  type ExcessChoice,
  type ExcessEvaluation,
  type ExcessTrigger,
  type TrimOrder,
} from '@/domain/schedule-excess';
