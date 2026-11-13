import { describe, expect, it, vi } from 'vitest';
import { appError } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import type { AuthRepository, ImageCodec, PhotoRepository, StorageRepository } from '@/repositories';
import { napiImageCodec, photoLikeJpeg } from '../../../tests/support/napi-image-codec';
import { compressImage } from './compress-image';
import { createPhoto, uploadPhotoFiles } from './upload-photo';

const dimensionsOf = async (blob: Blob) => {
  const image = await napiImageCodec.decode(blob);
  return image && { width: image.width, height: image.height };
};

describe('compressImage con un códec real (BR-PHO-01)', () => {
  it('CA-1: una foto de 4.000 × 3.000 px y ~4 MB queda en WebP de 1.280 px y ≤ ~200 KB, miniatura ≤ ~25 KB', async () => {
    const original = photoLikeJpeg(4000, 3000);
    expect(original.size).toBeGreaterThan(3_000_000);

    const result = await compressImage(napiImageCodec, original);
    if (!result.ok) throw new Error(result.error.code);
    const { full, thumb, fullBytes, thumbBytes } = result.value;

    expect(full.type).toBe('image/webp');
    expect(thumb.type).toBe('image/webp');
    expect(await dimensionsOf(full)).toEqual({ width: 1280, height: 960 });
    expect(await dimensionsOf(thumb)).toEqual({ width: 320, height: 240 });
    expect(fullBytes).toBe(full.size);
    expect(fullBytes).toBeLessThanOrEqual(200_000);
    expect(thumbBytes).toBeLessThanOrEqual(25_000);
  }, 60_000);

  it('un archivo que no es imagen devuelve IMAGE_UNREADABLE', async () => {
    const result = await compressImage(
      napiImageCodec,
      new Blob(['no soy una imagen'], { type: 'text/plain' }),
    );
    expect(result).toEqual(err(appError('IMAGE_UNREADABLE')));
  });
});

/** Códec falso: el peso baja con la calidad, para probar la búsqueda de calidad sin imágenes. */
function fakeCodec(
  bytesAtQuality: (q: number, width: number) => number,
): ImageCodec & { qualities: number[] } {
  const qualities: number[] = [];
  return {
    qualities,
    decode: async () => ({ width: 4000, height: 3000, source: null }),
    encodeWebp: async (_image, size, quality) => {
      qualities.push(Number(quality.toFixed(2)));
      return new Blob([new Uint8Array(bytesAtQuality(quality, size.width))], { type: 'image/webp' });
    },
  };
}

describe('compressImage: búsqueda de calidad', () => {
  it('baja la calidad hasta quedar bajo el objetivo', async () => {
    const codec = fakeCodec((q, width) => (width > 400 ? Math.round(q * 300_000) : 10_000));
    const result = await compressImage(codec, new Blob());
    expect(result.ok && result.value.fullBytes).toBe(Math.round(0.42 * 300_000));
    expect(codec.qualities).toEqual([0.82, 0.72, 0.62, 0.52, 0.42, 0.82]);
  });

  it('si ni con la calidad mínima llega al objetivo, se queda con la mínima (no sube el original)', async () => {
    const codec = fakeCodec(() => 500_000);
    const result = await compressImage(codec, new Blob());
    expect(result.ok && result.value.fullBytes).toBe(500_000);
    expect(codec.qualities.filter((q) => q === 0.42)).toHaveLength(2);
  });

  it('si el dispositivo no codifica WebP devuelve IMAGE_ENCODING_FAILED', async () => {
    const codec: ImageCodec = {
      decode: async () => ({ width: 10, height: 10, source: null }),
      encodeWebp: async () => {
        throw new Error('Este navegador no codifica WebP');
      },
    };
    expect(await compressImage(codec, new Blob())).toEqual(err(appError('IMAGE_ENCODING_FAILED')));
  });
});

describe('subida de fotos (HU-BASE-05)', () => {
  const okCodec = fakeCodec(() => 1000);
  const auth = { getCurrentUserId: async () => 'owner-1' } as AuthRepository;
  const online = { isOnline: () => true };
  const input = { photoId: 'photo-1', kind: 'customer_info' as const, file: new Blob() };

  const storageWith = (failOn?: string): StorageRepository & { uploaded: string[] } => {
    const uploaded: string[] = [];
    return {
      uploaded,
      upload: vi.fn(async (path: string) => {
        if (failOn && path.endsWith(failOn)) return err(appError('NETWORK_ERROR'));
        uploaded.push(path);
        return ok(undefined);
      }),
      signedUrl: async () => ok('url'),
      remove: async () => ok(undefined),
    };
  };

  const photosRepo = (): PhotoRepository & { create: ReturnType<typeof vi.fn> } => ({
    create: vi.fn(async () => ok(undefined)),
    softDelete: async () => ok(undefined),
    totalBytes: async () => ok(0),
  });

  it('sube archivo y miniatura a {owner}/{kind}/ y luego crea la fila con la suma de bytes', async () => {
    const storage = storageWith();
    const photos = photosRepo();
    const result = await createPhoto(
      { connectivity: online, auth, imageCodec: okCodec, storage, photos },
      input,
    );
    expect(storage.uploaded).toEqual([
      'owner-1/customer_info/photo-1.webp',
      'owner-1/customer_info/photo-1.thumb.webp',
    ]);
    expect(photos.create).toHaveBeenCalledWith({
      id: 'photo-1',
      kind: 'customer_info',
      path: 'owner-1/customer_info/photo-1.webp',
      thumbPath: 'owner-1/customer_info/photo-1.thumb.webp',
      bytes: 2000,
    });
    expect(result.ok).toBe(true);
  });

  it.each(['photo-1.webp', 'photo-1.thumb.webp'])(
    'CA-3 / R4: si falla la subida de %s, no se crea la fila y el error es NETWORK_ERROR reintentable',
    async (failOn) => {
      const photos = photosRepo();
      const result = await createPhoto(
        { connectivity: online, auth, imageCodec: okCodec, storage: storageWith(failOn), photos },
        input,
      );
      expect(result).toEqual({ ok: false, error: { code: 'NETWORK_ERROR', retryable: true } });
      expect(photos.create).not.toHaveBeenCalled();
    },
  );

  it('sin conexión devuelve OFFLINE antes de comprimir', async () => {
    const codec = fakeCodec(() => 1000);
    const storage = storageWith();
    const result = await uploadPhotoFiles(
      { connectivity: { isOnline: () => false }, auth, imageCodec: codec, storage },
      input,
    );
    expect(result).toEqual(err(appError('OFFLINE')));
    expect(codec.qualities).toEqual([]);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('un archivo que no es imagen no sube nada', async () => {
    const storage = storageWith();
    const codec: ImageCodec = { decode: async () => null, encodeWebp: vi.fn() };
    const result = await uploadPhotoFiles({ connectivity: online, auth, imageCodec: codec, storage }, input);
    expect(result).toEqual(err(appError('IMAGE_UNREADABLE')));
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('sin sesión devuelve SESSION_EXPIRED', async () => {
    const result = await uploadPhotoFiles(
      {
        connectivity: online,
        auth: { getCurrentUserId: async () => null } as AuthRepository,
        imageCodec: okCodec,
        storage: storageWith(),
      },
      input,
    );
    expect(result).toEqual(err(appError('SESSION_EXPIRED')));
  });

  it('si falla la fila, devuelve ese error (los archivos quedan y un reintento con el mismo id los reemplaza)', async () => {
    const photos = photosRepo();
    photos.create.mockResolvedValueOnce(err(appError('NETWORK_ERROR')));
    const result = await createPhoto(
      { connectivity: online, auth, imageCodec: okCodec, storage: storageWith(), photos },
      input,
    );
    expect(result).toEqual(err(appError('NETWORK_ERROR')));
  });
});
