// Factura del cliente (HU-CLI-08, BR-CUS-17, ADR-0042): una o varias fotos + N.º y fecha opcionales.
// Ninguno de sus campos afecta saldos ni abonos, y no se validan entre facturas (R3).
import { validationError, type AppError } from './shared/errors';
import { err, ok, type Result } from './shared/result';
import { compareIds } from './text';
import { parseLocalDate, type Instant, type LocalDate } from './time';

export type InvoicePhoto = {
  readonly id: string;
  readonly path: string;
  readonly thumbPath: string;
  readonly createdAt: Instant;
};

export type Invoice = {
  readonly id: string;
  readonly number: string | null;
  readonly date: LocalDate | null;
  readonly createdAt: Instant;
  readonly photos: readonly InvoicePhoto[];
};

/** Cambios de "Factura": clave ausente = no cambia; `null` (o N.º vacío) = vaciar. */
export type InvoicePatch = { readonly number?: string | null; readonly date?: string | null };

const byCreation = (a: { createdAt: Instant; id: string }, b: { createdAt: Instant; id: string }) =>
  a.createdAt.getTime() - b.createdAt.getTime() || compareIds(a.id, b.id);

/**
 * Orden de la lista: fecha descendente, las sin fecha al final; a igual fecha, la creada más
 * recientemente primero. Las fotos de cada factura van en el orden en que se subieron (frente, reverso…).
 */
export const sortInvoices = (invoices: readonly Invoice[]): Invoice[] =>
  [...invoices]
    .sort((a, b) => {
      if (a.date !== b.date) {
        if (a.date === null) return 1;
        if (b.date === null) return -1;
        return compareIds(b.date, a.date);
      }
      return byCreation(b, a);
    })
    .map((invoice) => ({ ...invoice, photos: [...invoice.photos].sort(byCreation) }));

/**
 * Normaliza y valida los cambios (R2, R3): el N.º se recorta y vacío es `null`; la fecha es un día real
 * `AAAA-MM-DD` o `null`. Errores: `VALIDATION` (`date`).
 */
export const validateInvoicePatch = (
  patch: InvoicePatch,
): Result<{ number?: string | null; date?: LocalDate | null }, AppError> => {
  const result: { number?: string | null; date?: LocalDate | null } = {};
  if (patch.number !== undefined) result.number = patch.number?.trim() || null;
  if (patch.date !== undefined) {
    if (patch.date === null) result.date = null;
    else {
      const parsed = parseLocalDate(patch.date);
      if (!parsed.ok) return err(validationError('date'));
      result.date = parsed.value;
    }
  }
  return ok(result);
};
