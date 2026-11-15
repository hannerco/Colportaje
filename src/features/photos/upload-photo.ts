import { photoPaths, type PhotoKind } from '@/domain/photo';
import { appError, COMMON_ERROR_CODES, type AppError } from '@/domain/shared/errors';
import { err, ok, type Result } from '@/domain/shared/result';
import type {
  AuthRepository,
  Connectivity,
  ImageCodec,
  PhotoRepository,
  StorageRepository,
} from '@/repositories';
import { runMutation } from '../shared/run-mutation';
import { compressImage } from './compress-image';

export type PhotoUploadDeps = {
  readonly connectivity: Connectivity;
  readonly auth: AuthRepository;
  readonly imageCodec: ImageCodec;
  readonly storage: StorageRepository;
};

export type UploadedPhotoFiles = {
  readonly path: string;
  readonly thumbPath: string;
  readonly bytes: number;
};

/**
 * Comprime y sube archivo y miniatura (HU-BASE-05). No crea la fila: las HU dueñas la insertan
 * (o lo hace su función SQL) solo si este paso terminó bien (R4).
 * Reintentar con el mismo `photoId` sube a las mismas rutas y no duplica.
 * Errores: `OFFLINE` (antes de comprimir), `SESSION_EXPIRED`, `IMAGE_UNREADABLE`, `IMAGE_ENCODING_FAILED`,
 * `NETWORK_ERROR` (reintentable), `FORBIDDEN`.
 */
export async function uploadPhotoFiles(
  deps: PhotoUploadDeps,
  input: { photoId: string; kind: PhotoKind; file: Blob },
): Promise<Result<UploadedPhotoFiles, AppError>> {
  return runMutation(deps.connectivity, async () => {
    const ownerId = await deps.auth.getCurrentUserId();
    if (!ownerId) return err(appError(COMMON_ERROR_CODES.SESSION_EXPIRED));

    const compressed = await compressImage(deps.imageCodec, input.file);
    if (!compressed.ok) return compressed;

    const { path, thumbPath } = photoPaths(ownerId, input.kind, input.photoId);
    const full = await deps.storage.upload(path, compressed.value.full);
    if (!full.ok) return full;
    const thumb = await deps.storage.upload(thumbPath, compressed.value.thumb);
    if (!thumb.ok) return thumb;

    return ok({ path, thumbPath, bytes: compressed.value.fullBytes + compressed.value.thumbBytes });
  });
}

/** Flujo genérico completo: subir archivos y, solo si ambas subidas terminan, crear la fila `photo` (R4). */
export async function createPhoto(
  deps: PhotoUploadDeps & { readonly photos: PhotoRepository },
  input: { photoId: string; kind: PhotoKind; file: Blob; customerId?: string },
): Promise<Result<UploadedPhotoFiles, AppError>> {
  const files = await uploadPhotoFiles(deps, input);
  if (!files.ok) return files;
  const created = await deps.photos.create({
    id: input.photoId,
    kind: input.kind,
    ...files.value,
    ...(input.customerId ? { customerId: input.customerId } : {}),
  });
  return created.ok ? files : created;
}
