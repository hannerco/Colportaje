// Bandeja de fotos (ADR-0054): las fotos de un cliente nuevo se guardan en el teléfono y se suben solas, aunque se
// cierre la app o no haya señal. Ninguna foto se pierde sin que la persona lo decida.
import { COMMON_ERROR_CODES, type AppError } from '@/domain/shared/errors';
import { ok, type Result } from '@/domain/shared/result';
import type { LocalDate } from '@/domain/time';
import type { PendingPhoto, PhotoOutbox, PhotoRepository } from '@/repositories';
import { addCustomerInfoPhoto } from './customer-photos';
import {
  addInvoicePhoto,
  createInvoiceWithPhoto,
  updateInvoice,
  type InvoiceDeps,
} from './customer-invoices';

export type PendingPhotosDeps = InvoiceDeps & {
  readonly photos: PhotoRepository;
  readonly photoOutbox: PhotoOutbox;
};

/** Lo que se tomó en Nuevo cliente, listo para la bandeja. */
export type NewCustomerPhotos = {
  readonly infoPhotos: readonly { photoId: string; file: Blob }[];
  readonly invoices: readonly {
    invoiceId: string;
    number: string | null;
    date: LocalDate | null;
    photos: readonly { photoId: string; file: Blob }[];
  }[];
};

/**
 * Qué hacer cuando una foto no sube:
 * - `wait`: se arregla sola (sin señal, red caída, sesión vencida); se reintenta después y se detiene la ronda;
 * - `drop`: ya no tiene a dónde ir (el cliente o la factura no existen); se quita sin avisar;
 * - `fail`: no se arregla esperando (imagen ilegible, cliente archivado); queda guardada y la ficha ofrece
 *   «Reintentar» o «Descartar».
 */
export function fateOf(error: AppError): 'wait' | 'drop' | 'fail' {
  if (
    error.retryable ||
    error.code === COMMON_ERROR_CODES.OFFLINE ||
    error.code === COMMON_ERROR_CODES.SESSION_EXPIRED
  )
    return 'wait';
  if (error.code === COMMON_ERROR_CODES.NOT_FOUND) return 'drop';
  return 'fail';
}

/** Las fotos en el orden en que se suben: por llegada (la que crea una factura va antes que las demás de ella). */
export const uploadOrder = (photos: readonly PendingPhoto[]): PendingPhoto[] =>
  [...photos].sort((a, b) => a.queuedAt - b.queuedAt || a.photoId.localeCompare(b.photoId));

/** Pone en la bandeja las fotos de un cliente recién guardado, en el orden en que se tomaron. */
export async function queueNewCustomerPhotos(
  deps: { readonly photoOutbox: PhotoOutbox },
  input: { ownerId: string; customerId: string; photos: NewCustomerPhotos; now: number },
): Promise<number> {
  const queued: PendingPhoto[] = [];
  const add = (photoId: string, file: Blob, target: PendingPhoto['target']) =>
    queued.push({
      photoId,
      file,
      target,
      ownerId: input.ownerId,
      customerId: input.customerId,
      queuedAt: input.now + queued.length,
      failure: null,
    });
  for (const photo of input.photos.infoPhotos) add(photo.photoId, photo.file, { type: 'customer_info' });
  for (const invoice of input.photos.invoices)
    invoice.photos.forEach((photo, i) =>
      add(photo.photoId, photo.file, {
        type: 'customer_invoice',
        invoiceId: invoice.invoiceId,
        createsInvoice: i === 0,
        number: invoice.number,
        date: invoice.date,
      }),
    );
  if (queued.length > 0) await deps.photoOutbox.put(queued);
  return queued.length;
}

/** Crea la factura con esta foto y le pone el N.º y la fecha escritos al crear el cliente. */
async function createInvoice(
  deps: PendingPhotosDeps,
  photo: PendingPhoto,
  target: Extract<PendingPhoto['target'], { type: 'customer_invoice' }>,
): Promise<Result<void, AppError>> {
  const created = await createInvoiceWithPhoto(deps, {
    invoiceId: target.invoiceId,
    photoId: photo.photoId,
    customerId: photo.customerId,
    file: photo.file,
  });
  if (!created.ok) return created;
  // La base pone de fecha el día en que sube; se deja la que quedó escrita al crear el cliente.
  const updated = await updateInvoice(deps, target.invoiceId, { number: target.number, date: target.date });
  // La foto ya está a salvo: si el N.º o la fecha no se pueden poner, se corrigen en la ficha.
  return !updated.ok && fateOf(updated.error) === 'wait' ? updated : ok(undefined);
}

/**
 * Sube una foto con los mismos pasos que usa la ficha. Cada paso es idempotente: repetirlo no duplica nada.
 * Una factura nace con su primera foto (BR-CUS-17). Si esa foto no pudo subirse, la siguiente la crea; y si la
 * factura ya existe cuando sube la que debía crearla (porque la creó otra), se le agrega.
 */
async function uploadOne(deps: PendingPhotosDeps, photo: PendingPhoto): Promise<Result<void, AppError>> {
  const { target } = photo;
  if (target.type === 'customer_info') {
    const added = await addCustomerInfoPhoto(deps, {
      photoId: photo.photoId,
      customerId: photo.customerId,
      file: photo.file,
    });
    return added.ok ? ok(undefined) : added;
  }
  const add = () =>
    addInvoicePhoto(deps, { invoiceId: target.invoiceId, photoId: photo.photoId, file: photo.file });
  if (target.createsInvoice) {
    const created = await createInvoice(deps, photo, target);
    return !created.ok && created.error.code === COMMON_ERROR_CODES.CONFLICT ? add() : created;
  }
  const added = await add();
  return !added.ok && added.error.code === COMMON_ERROR_CODES.NOT_FOUND
    ? createInvoice(deps, photo, target)
    : added;
}

export type DrainProgress = {
  /** Empieza a subir esta foto. */
  readonly onStart?: (photo: PendingPhoto) => void;
  /** La foto quedó en la base: la ficha de su cliente debe refrescarse. */
  readonly onUploaded?: (photo: PendingPhoto) => void;
};

/** `waiting` = quedan fotos que se subirán más tarde (sin señal, sin sesión); se reintenta solo. */
export type DrainOutcome = { readonly waiting: boolean };

/**
 * Sube las fotos pendientes del usuario, una por una y en orden. Una foto que no puede subirse todavía detiene la
 * ronda (lo demás tampoco subiría); una que falló sin remedio queda guardada para que la persona decida.
 */
export async function drainPendingPhotos(
  deps: PendingPhotosDeps,
  progress: DrainProgress = {},
): Promise<DrainOutcome> {
  const ownerId = await deps.auth.getCurrentUserId();
  if (!ownerId) return { waiting: true };
  const queue = uploadOrder(
    (await deps.photoOutbox.list()).filter((p) => p.ownerId === ownerId && p.failure === null),
  );
  for (const photo of queue) {
    progress.onStart?.(photo);
    const result = await uploadOne(deps, photo);
    if (result.ok) {
      await deps.photoOutbox.remove(photo.photoId);
      progress.onUploaded?.(photo);
      continue;
    }
    const fate = fateOf(result.error);
    if (fate === 'wait') return { waiting: true };
    if (fate === 'drop') await deps.photoOutbox.remove(photo.photoId);
    else await deps.photoOutbox.put([{ ...photo, failure: result.error.code }]);
  }
  return { waiting: false };
}

/** «Reintentar» una foto que falló: vuelve a la cola, al final. */
export async function retryPendingPhoto(
  deps: { readonly photoOutbox: PhotoOutbox },
  photoId: string,
  now: number,
): Promise<void> {
  const photo = (await deps.photoOutbox.list()).find((p) => p.photoId === photoId);
  if (photo) await deps.photoOutbox.put([{ ...photo, failure: null, queuedAt: now }]);
}

/** «Descartar» una foto que falló: se borra del teléfono y no se recupera. */
export async function discardPendingPhoto(
  deps: { readonly photoOutbox: PhotoOutbox },
  photoId: string,
): Promise<void> {
  await deps.photoOutbox.remove(photoId);
}
