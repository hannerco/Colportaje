import type { LocalDate } from '@/domain/time';

/** Una foto tomada antes de guardar: vive en el teléfono hasta «Guardar cliente» (BR-CUS-14). */
export type LocalPhoto = { readonly photoId: string; readonly file: File; readonly thumbUrl: string };

export type LocalInvoice = {
  readonly invoiceId: string;
  readonly number: string | null;
  readonly date: LocalDate | null;
  readonly photos: readonly LocalPhoto[];
};

/** Cambia una foto por otra en su mismo lugar; si no está, la lista queda igual. */
export const replacePhoto = (
  photos: readonly LocalPhoto[],
  photoId: string,
  next: LocalPhoto,
): readonly LocalPhoto[] => photos.map((photo) => (photo.photoId === photoId ? next : photo));

export const removePhoto = (photos: readonly LocalPhoto[], photoId: string): readonly LocalPhoto[] =>
  photos.filter((photo) => photo.photoId !== photoId);

/** Cambia una foto de una factura que aún no se guarda. */
export const replaceInvoicePhoto = (
  invoices: readonly LocalInvoice[],
  invoiceId: string,
  photoId: string,
  next: LocalPhoto,
): readonly LocalInvoice[] =>
  invoices.map((invoice) =>
    invoice.invoiceId === invoiceId
      ? { ...invoice, photos: replacePhoto(invoice.photos, photoId, next) }
      : invoice,
  );

/**
 * Quita una foto de una factura que aún no se guarda. Una factura sin fotos no existe (BR-CUS-17): al quitar la
 * última, la factura se va con su N.º y su fecha, igual que en la ficha de un cliente guardado (#68).
 */
export const removeInvoicePhoto = (
  invoices: readonly LocalInvoice[],
  photoId: string,
): readonly LocalInvoice[] =>
  invoices
    .map((invoice) => ({ ...invoice, photos: removePhoto(invoice.photos, photoId) }))
    .filter((invoice) => invoice.photos.length > 0);
