// API pública de Abonos (HU-ABO-*).
export {
  paymentQueryKeys,
  useApplyPaymentPlan,
  useCollectPayment,
  useCancelScheduledPayments,
  useCorrectScheduledDate,
  useScheduleSinglePayment,
  useUpdateScheduledAmount,
  useDeletePayment,
  useRegisterCollectedPayment,
  useReschedulePayment,
  useUndoCollectPayment,
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
export {
  COLLECTED_PAYMENT_ERROR_CODES,
  DEFAULT_PAY_METHOD,
  collectShortfall,
} from '@/domain/collected-payment';
export { applyPaymentPlan, type ApplyPaymentPlanInput } from './use-cases/payment-plan';
export {
  cancelScheduledPayments,
  correctScheduledDate,
  scheduleSinglePayment,
  updateScheduledAmount,
  type ScheduleSingleInput,
} from './use-cases/scheduled-payments';
export { SCHEDULED_PAYMENT_ERROR_CODES } from '@/domain/scheduled-payment';
export { reschedulePayment, type RescheduleInput } from './use-cases/reschedule';
export {
  collectPayment,
  undoCollectPayment,
  type CollectPaymentInput,
  type CollectPaymentResult,
} from './use-cases/collect-payment';
export { RESCHEDULE_ERROR_CODES, rescheduleConfirmLimit } from '@/domain/reschedule';
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
// Piezas del módulo (HU-PAN-CLI-05).
export { ChangeDueDateDialog, type ChangeDueDateDialogProps } from './components/ChangeDueDateDialog';
export { DatePickerCalendar, type DatePickerCalendarProps } from './components/DatePickerCalendar';
// HU-PAN-DIN-02: detalle de un abono, cobrar y dar más plazo.
export {
  PaymentDetailScreen,
  installmentOf,
  paymentBanner,
  type PaymentDetailForm,
  type PaymentDetailScreenProps,
} from './screens/PaymentDetailScreen';
export {
  CollectPaymentDialog,
  type CollectPaymentDialogProps,
  type CollectPaymentValues,
} from './components/CollectPaymentDialog';
