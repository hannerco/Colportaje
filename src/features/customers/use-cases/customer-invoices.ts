// Facturas del cliente: sección "Factura" de Crear y de la ficha (HU-CLI-08, BR-CUS-17, ADR-0042).
import { businessConfig } from '@/domain/config/business-config';
import { sortInvoices, validateInvoicePatch, type InvoicePatch } from '@/domain/invoice';
import type { AppError } from '@/domain/shared/errors';
import { ok, type Result } from '@/domain/shared/result';
import type { LocalDate } from '@/domain/time';
import type { Connectivity, InvoiceRepository, StorageRepository } from '@/repositories';
import { uploadPhotoFiles, type PhotoUploadDeps } from '../../photos/upload-photo';
import { runMutation } from '../../shared/run-mutation';

const KIND = 'customer_invoice' as const;
const signedUrlSeconds = businessConfig.photos.signedUrlSeconds;

export type InvoiceDeps = PhotoUploadDeps & { readonly invoices: InvoiceRepository };

export type CustomerInvoice = {
  readonly invoiceId: string;
  readonly number: string | null;
  readonly date: LocalDate | null;
  readonly photos: readonly { photoId: string; thumbUrl: string }[];
};

/**
 * Sube la primera foto y solo entonces crea la factura (fecha = hoy en Bogotá) con ella, en una
 * transacción (R1). Si la subida falla no hay factura; reintentar con los mismos ids no duplica.
 * Errores: `OFFLINE`, `IMAGE_UNREADABLE`, `IMAGE_ENCODING_FAILED`, `NETWORK_ERROR`, `CUSTOMER_ARCHIVED`,
 * `NOT_FOUND`, `CONFLICT`, `SESSION_EXPIRED`, `FORBIDDEN`.
 */
export async function createInvoiceWithPhoto(
  deps: InvoiceDeps,
  input: { invoiceId: string; photoId: string; customerId: string; file: Blob },
): Promise<Result<{ invoiceId: string }, AppError>> {
  const files = await uploadPhotoFiles(deps, { photoId: input.photoId, kind: KIND, file: input.file });
  if (!files.ok) return files;
  const created = await deps.invoices.createWithPhoto({
    invoiceId: input.invoiceId,
    customerId: input.customerId,
    photo: { photoId: input.photoId, ...files.value },
  });
  return created.ok ? ok({ invoiceId: input.invoiceId }) : created;
}

/** Agrega otra foto (frente y reverso, p. ej.). Mismos errores que crear. */
export async function addInvoicePhoto(
  deps: InvoiceDeps,
  input: { invoiceId: string; photoId: string; file: Blob },
): Promise<Result<void, AppError>> {
  const files = await uploadPhotoFiles(deps, { photoId: input.photoId, kind: KIND, file: input.file });
  if (!files.ok) return files;
  return deps.invoices.addPhoto(input.invoiceId, { photoId: input.photoId, ...files.value });
}

/** N.º y fecha (R2, R3). Errores: `OFFLINE`, `VALIDATION` (`date`), `CUSTOMER_ARCHIVED`, `NOT_FOUND`. */
export async function updateInvoice(
  deps: { readonly invoices: InvoiceRepository; readonly connectivity: Connectivity },
  invoiceId: string,
  patch: InvoicePatch,
): Promise<Result<void, AppError>> {
  return runMutation(deps.connectivity, async () => {
    const valid = validateInvoicePatch(patch);
    if (!valid.ok) return valid;
    return deps.invoices.update(invoiceId, valid.value);
  });
}

/** Borra una foto (siempre se puede); si era la última, la factura también (R4). Errores: `OFFLINE`, `NOT_FOUND`. */
export async function deleteInvoicePhoto(
  deps: { readonly invoices: InvoiceRepository; readonly connectivity: Connectivity },
  photoId: string,
): Promise<Result<{ invoiceDeleted: boolean }, AppError>> {
  return runMutation(deps.connectivity, () => deps.invoices.deletePhoto(photoId));
}

/** Facturas del cliente ordenadas (fecha descendente, sin fecha al final) con la miniatura firmada de cada foto. */
export async function listCustomerInvoices(
  deps: { readonly invoices: InvoiceRepository; readonly storage: StorageRepository },
  customerId: string,
): Promise<Result<CustomerInvoice[], AppError>> {
  const invoices = await deps.invoices.listOfCustomer(customerId);
  if (!invoices.ok) return invoices;
  const result: CustomerInvoice[] = [];
  for (const invoice of sortInvoices(invoices.value)) {
    const urls = await Promise.all(
      invoice.photos.map((p) => deps.storage.signedUrl(p.thumbPath, signedUrlSeconds)),
    );
    const photos: { photoId: string; thumbUrl: string }[] = [];
    for (const [i, url] of urls.entries()) {
      if (!url.ok) return url;
      photos.push({ photoId: invoice.photos[i]!.id, thumbUrl: url.value });
    }
    result.push({ invoiceId: invoice.id, number: invoice.number, date: invoice.date, photos });
  }
  return ok(result);
}
