// Nuevo cliente: solo existe al guardarlo (ronda 35, #57, ADR-0051). Mientras se crea, todo vive en el teléfono; al
// guardar se envía de una sola vez.
import type { COP } from './money';
import type { PayMethod } from './payment';
import { validationError, type AppError } from './shared/errors';
import { err, ok, type Result } from './shared/result';
import type { LocalDate } from './time';

export type NewCustomerDraft = {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
  readonly address: string;
  readonly info: string;
  readonly avatarEmoji: string | null;
  readonly location: {
    readonly latitude: number;
    readonly longitude: number;
    readonly accuracyMeters: number | null;
  } | null;
  /** Libros elegidos: siguen En físico hasta guardar (ni historial ni venta antes). */
  readonly books: readonly {
    readonly copyId: string;
    readonly agreedPrice: COP;
    readonly soldOn: LocalDate;
  }[];
  readonly downPayment: {
    readonly paymentId: string;
    readonly amount: COP | null;
    readonly method: PayMethod;
    readonly paidOn: LocalDate;
  } | null;
  /** Plan con sus ids ya generados (reintentar no duplica). */
  readonly plan:
    readonly { readonly paymentId: string; readonly dueDate: LocalDate; readonly amount: COP }[] | null;
};

/** Lo que se guarda es lo escrito sin espacios sobrantes; el nombre es obligatorio (BR-CUS-01). */
export function validateNewCustomer(draft: NewCustomerDraft): Result<NewCustomerDraft, AppError> {
  const name = draft.name.trim();
  if (!name) return err(validationError('name'));
  return ok({ ...draft, name });
}
