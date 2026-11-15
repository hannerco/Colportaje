// Fotos de información del cliente: "Imágenes" en Crear y Ficha (HU-CLI-07, BR-CUS-01, BR-PHO-01/03).
import { businessConfig } from '@/domain/config/business-config';
import type { AppError } from '@/domain/shared/errors';
import { ok, type Result } from '@/domain/shared/result';
import type { Instant } from '@/domain/time';
import type { Connectivity, PhotoRepository, StorageRepository } from '@/repositories';
import { createPhoto, type PhotoUploadDeps } from '../../photos/upload-photo';
import { runMutation } from '../../shared/run-mutation';

const KIND = 'customer_info' as const;
const signedUrlSeconds = businessConfig.photos.signedUrlSeconds;

export type CustomerInfoPhoto = {
  readonly photoId: string;
  readonly thumbUrl: string;
  readonly createdAt: Instant;
};

/**
 * Comprime, sube y solo entonces crea la fila (R1). Reintentar con el mismo `photoId` no duplica (CA-3).
 * Errores: `OFFLINE`, `IMAGE_UNREADABLE`, `IMAGE_ENCODING_FAILED`, `NETWORK_ERROR` (reintentable),
 * `CUSTOMER_ARCHIVED`, `NOT_FOUND`, `SESSION_EXPIRED`, `FORBIDDEN`.
 */
export async function addCustomerInfoPhoto(
  deps: PhotoUploadDeps & { readonly photos: PhotoRepository },
  input: { photoId: string; customerId: string; file: Blob },
): Promise<Result<{ photoId: string }, AppError>> {
  const created = await createPhoto(deps, {
    photoId: input.photoId,
    kind: KIND,
    file: input.file,
    customerId: input.customerId,
  });
  return created.ok ? ok({ photoId: input.photoId }) : created;
}

/** Borrado lógico, permitido siempre (R2); el archivo se conserva. Errores: `OFFLINE`, `NOT_FOUND`, `NETWORK_ERROR`. */
export async function deleteCustomerInfoPhoto(
  deps: { readonly photos: PhotoRepository; readonly connectivity: Connectivity },
  photoId: string,
): Promise<Result<void, AppError>> {
  return runMutation(deps.connectivity, () => deps.photos.softDelete(photoId, { kind: KIND }));
}

/** Fotos de información del cliente con la URL firmada de su miniatura, la más reciente primero. */
export async function listCustomerInfoPhotos(
  deps: { readonly photos: PhotoRepository; readonly storage: StorageRepository },
  customerId: string,
): Promise<Result<CustomerInfoPhoto[], AppError>> {
  const photos = await deps.photos.listOfCustomer(customerId, KIND);
  if (!photos.ok) return photos;
  const urls = await Promise.all(
    photos.value.map((p) => deps.storage.signedUrl(p.thumbPath, signedUrlSeconds)),
  );
  const result: CustomerInfoPhoto[] = [];
  for (const [i, url] of urls.entries()) {
    if (!url.ok) return url;
    result.push({ photoId: photos.value[i]!.id, thumbUrl: url.value, createdAt: photos.value[i]!.createdAt });
  }
  return ok(result);
}

/** URL firmada de la imagen completa (R3 de HU-BASE-05). Errores: `NOT_FOUND`, `NETWORK_ERROR`. */
export async function getPhotoUrl(
  deps: { readonly photos: PhotoRepository; readonly storage: StorageRepository },
  photoId: string,
): Promise<Result<string, AppError>> {
  const paths = await deps.photos.getPaths(photoId);
  if (!paths.ok) return paths;
  return deps.storage.signedUrl(paths.value.path, signedUrlSeconds);
}
