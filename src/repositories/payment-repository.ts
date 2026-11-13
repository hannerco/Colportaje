import type { AppError } from '@/domain/shared/errors';
import type { Result } from '@/domain/shared/result';
import type { ExcessChoice, ExcessTrigger } from '@/domain/schedule-excess';

/** Abonos (HU-ABO-*). Cada HU de Abonos agrega aquí sus acciones. */
export interface PaymentRepository {
  /**
   * Aplica la opción elegida ante abonos que no cuadran (HU-ABO-07, función `resolve_schedule_excess`).
   * El servidor recalcula el sobrante sobre lo vigente. Errores: `NO_EXCESS`, `LEAVE_NOT_ALLOWED`,
   * `CONFLICT` (los programados cambiaron), `NOT_FOUND`, `VALIDATION`, `FORBIDDEN`, `NETWORK_ERROR`.
   */
  resolveScheduleExcess(
    customerId: string,
    choice: ExcessChoice,
    trigger: ExcessTrigger,
  ): Promise<Result<void, AppError>>;
}
