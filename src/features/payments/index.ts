// API pública de Abonos (HU-ABO-*).
export { paymentQueryKeys, useResolveScheduleExcess } from './hooks';
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
