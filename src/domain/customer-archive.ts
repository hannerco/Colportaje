// Archivar un cliente (HU-CLI-11, BR-CUS-09, BR-PAY-13, AF-71): la vista previa para la confirmación.
import type { COP } from './money';
import type { Payment } from './payment';
import { compareIds } from './text';
import type { LocalDate } from './time';

export type ArchivePreview = {
  /** R1: solo sin ejemplares vendidos (primero se devuelven). */
  readonly canArchive: boolean;
  readonly soldCount: number;
  /** R2: los abonos por cobrar que se cancelarán (motivo `customer_archived`), por fecha acordada. */
  readonly scheduledToCancel: readonly {
    readonly paymentId: string;
    readonly dueDate: LocalDate;
    readonly agreedAmount: COP;
  }[];
};

type PreviewPayment = Pick<Payment, 'id' | 'status' | 'dueDate' | 'agreedAmount'>;

/**
 * Lo que pasará al archivar. `payments` sin borrados; cobrados, entregados y cancelados no cambian (R3), así
 * que no aparecen. Orden: fecha acordada y, a igual fecha, id (determinista).
 */
export const buildArchivePreview = (
  soldCount: number,
  payments: readonly PreviewPayment[],
): ArchivePreview => {
  const scheduledToCancel: { paymentId: string; dueDate: LocalDate; agreedAmount: COP }[] = [];
  for (const p of payments) {
    // Un programado siempre tiene fecha y valor acordados (check de la base, HU-ABO-01 R1).
    if (p.status === 'scheduled' && p.dueDate !== null && p.agreedAmount !== null)
      scheduledToCancel.push({ paymentId: p.id, dueDate: p.dueDate, agreedAmount: p.agreedAmount });
  }
  scheduledToCancel.sort((a, b) =>
    a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : compareIds(a.paymentId, b.paymentId),
  );
  return { canArchive: soldCount === 0, soldCount, scheduledToCancel };
};
