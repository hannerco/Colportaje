// Admin · Catálogo (HU-PAN-ADM-01): crear y editar títulos y su portada. BR-TIT-01..04, BR-TIT-07, DT-10.
import type { AppError } from '@/domain/shared/errors';
import { ok, type Result } from '@/domain/shared/result';
import { titleCoverPath, validateTitleFields, type TitleFieldsDraft } from '@/domain/title';
import type { Connectivity, ImageCodec, TitleRepository } from '@/repositories';
import { compressImage } from '../../photos/compress-image';
import { runMutation } from '../../shared/run-mutation';

export type ManageTitlesDeps = {
  readonly titles: TitleRepository;
  readonly connectivity: Connectivity;
};

/**
 * Crea un título nuevo. El `id` lo genera el cliente (BR-GEN-04): reintentar con el mismo no duplica.
 * Errores: `VALIDATION` (`details.field`), `OFFLINE`, `NETWORK_ERROR`, `FORBIDDEN`.
 */
export async function createTitle(
  deps: ManageTitlesDeps,
  input: { id: string; fields: TitleFieldsDraft },
): Promise<Result<void, AppError>> {
  const fields = validateTitleFields(input.fields);
  if (!fields.ok) return fields;
  return runMutation(deps.connectivity, () => deps.titles.create(input.id, fields.value));
}

/**
 * Cambia los datos de un título. Cambiar precios no toca los ejemplares ya recibidos (BR-TIT-07: cada ejemplar guardó
 * su precio). Desactivar es la forma de «borrar» (BR-TIT-03). Errores: los de `createTitle` y `NOT_FOUND`.
 */
export async function updateTitle(
  deps: ManageTitlesDeps,
  input: { id: string; fields: TitleFieldsDraft },
): Promise<Result<void, AppError>> {
  const fields = validateTitleFields(input.fields);
  if (!fields.ok) return fields;
  return runMutation(deps.connectivity, () => deps.titles.update(input.id, fields.value));
}

/**
 * Pone o cambia la portada (DT-10): la comprime en el teléfono (WebP, BR-PHO-01), la sube con un nombre nuevo
 * (`coverId`) y solo entonces la asigna al título. Reintentar con el mismo `coverId` sube a la misma ruta.
 * Errores: `OFFLINE`, `IMAGE_UNREADABLE`, `IMAGE_ENCODING_FAILED`, `NETWORK_ERROR`, `FORBIDDEN`, `NOT_FOUND`.
 */
export async function setTitleCover(
  deps: ManageTitlesDeps & { readonly imageCodec: ImageCodec },
  input: { titleId: string; coverId: string; file: Blob },
): Promise<Result<void, AppError>> {
  return runMutation(deps.connectivity, async () => {
    const compressed = await compressImage(deps.imageCodec, input.file);
    if (!compressed.ok) return compressed;
    const path = titleCoverPath(input.titleId, input.coverId);
    const uploaded = await deps.titles.uploadCover(path, compressed.value.full);
    if (!uploaded.ok) return uploaded;
    const saved = await deps.titles.update(input.titleId, { imagePath: path });
    return saved.ok ? ok(undefined) : saved;
  });
}

/** Quita la portada (el archivo se conserva). Errores: `OFFLINE`, `NETWORK_ERROR`, `NOT_FOUND`. */
export async function removeTitleCover(
  deps: ManageTitlesDeps,
  titleId: string,
): Promise<Result<void, AppError>> {
  return runMutation(deps.connectivity, () => deps.titles.update(titleId, { imagePath: null }));
}
