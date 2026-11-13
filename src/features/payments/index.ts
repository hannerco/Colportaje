// API pública de Abonos (HU-ABO-*).
export {
  paymentQueryKeys,
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
