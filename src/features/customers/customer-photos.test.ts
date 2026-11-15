import { describe, expect, it, vi } from 'vitest';
import { appError } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import type { AuthRepository, ImageCodec } from '@/repositories';
import { fakeConnectivity } from '../../../tests/support/fake-connectivity';
import { fakePhotoRepository, fakeStorageRepository } from '../../../tests/support/fake-repositories';
import {
  addCustomerInfoPhoto,
  deleteCustomerInfoPhoto,
  getPhotoUrl,
  listCustomerInfoPhotos,
} from './use-cases/customer-photos';

const OWNER = 'u-1';
const auth = { getCurrentUserId: async () => OWNER } as unknown as AuthRepository;
const codec: ImageCodec = {
  decode: async () => ({ width: 800, height: 600, source: null }),
  encodeWebp: async () => new Blob([new Uint8Array(100)], { type: 'image/webp' }),
};
const file = new Blob([new Uint8Array(10)], { type: 'image/jpeg' });

const uploadDeps = (online = true) => ({
  connectivity: fakeConnectivity(online),
  auth,
  imageCodec: codec,
  storage: fakeStorageRepository({ upload: vi.fn(async () => ok(undefined)) }),
  photos: fakePhotoRepository({ create: vi.fn(async () => ok(undefined)) }),
});

describe('fotos de información del cliente (HU-CLI-07)', () => {
  it('R1 / CA-1: sube archivo y miniatura bajo customer_info y crea la fila con el cliente', async () => {
    const deps = uploadDeps();
    expect(await addCustomerInfoPhoto(deps, { photoId: 'f1', customerId: 'c1', file })).toEqual(
      ok({ photoId: 'f1' }),
    );
    expect(deps.storage.upload).toHaveBeenCalledWith(`${OWNER}/customer_info/f1.webp`, expect.any(Blob));
    expect(deps.photos.create).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'f1', kind: 'customer_info', customerId: 'c1' }),
    );
  });

  it('CA-3: si la subida falla, no crea la fila y el error es reintentable; archivado pasa tal cual', async () => {
    const deps = uploadDeps();
    vi.mocked(deps.storage.upload).mockResolvedValueOnce(err(appError('NETWORK_ERROR')));
    expect(await addCustomerInfoPhoto(deps, { photoId: 'f1', customerId: 'c1', file })).toEqual(
      err({ code: 'NETWORK_ERROR', retryable: true }),
    );
    expect(deps.photos.create).not.toHaveBeenCalled();
    vi.mocked(deps.photos.create).mockResolvedValueOnce(err(appError('CUSTOMER_ARCHIVED')));
    expect(await addCustomerInfoPhoto(deps, { photoId: 'f1', customerId: 'c1', file })).toEqual(
      err(appError('CUSTOMER_ARCHIVED')),
    );
    expect(await addCustomerInfoPhoto(uploadDeps(false), { photoId: 'f1', customerId: 'c1', file })).toEqual(
      err(appError('OFFLINE')),
    );
  });

  it('R2 / CA-2: borrar es lógico y solo para fotos de información; sin conexión → OFFLINE', async () => {
    const photos = fakePhotoRepository({ softDelete: vi.fn(async () => ok(undefined)) });
    expect(await deleteCustomerInfoPhoto({ photos, connectivity: fakeConnectivity() }, 'f1')).toEqual(
      ok(undefined),
    );
    expect(photos.softDelete).toHaveBeenCalledWith('f1', { kind: 'customer_info' });
    expect(await deleteCustomerInfoPhoto({ photos, connectivity: fakeConnectivity(false) }, 'f1')).toEqual(
      err(appError('OFFLINE')),
    );
  });

  it('la lista firma cada miniatura y conserva el orden; un fallo de firma o de lectura se devuelve', async () => {
    const createdAt = new Date('2026-11-14T15:00:00Z');
    const photos = fakePhotoRepository({
      listOfCustomer: vi.fn(async () =>
        ok([
          { id: 'f2', path: 'p2', thumbPath: 't2', createdAt },
          { id: 'f1', path: 'p1', thumbPath: 't1', createdAt },
        ]),
      ),
    });
    const storage = fakeStorageRepository({ signedUrl: vi.fn(async (path: string) => ok(`url:${path}`)) });
    expect(await listCustomerInfoPhotos({ photos, storage }, 'c1')).toEqual(
      ok([
        { photoId: 'f2', thumbUrl: 'url:t2', createdAt },
        { photoId: 'f1', thumbUrl: 'url:t1', createdAt },
      ]),
    );
    expect(photos.listOfCustomer).toHaveBeenCalledWith('c1', 'customer_info');
    vi.mocked(storage.signedUrl).mockResolvedValueOnce(err(appError('NETWORK_ERROR')));
    expect(await listCustomerInfoPhotos({ photos, storage }, 'c1')).toMatchObject({ ok: false });
    vi.mocked(photos.listOfCustomer).mockResolvedValueOnce(err(appError('NETWORK_ERROR')));
    expect(await listCustomerInfoPhotos({ photos, storage }, 'c1')).toMatchObject({ ok: false });
  });

  it('getPhotoUrl firma la imagen completa; una foto borrada o ajena → NOT_FOUND', async () => {
    const photos = fakePhotoRepository({ getPaths: vi.fn(async () => ok({ path: 'p1', thumbPath: 't1' })) });
    const storage = fakeStorageRepository({ signedUrl: vi.fn(async (path: string) => ok(`url:${path}`)) });
    expect(await getPhotoUrl({ photos, storage }, 'f1')).toEqual(ok('url:p1'));
    vi.mocked(photos.getPaths).mockResolvedValueOnce(err(appError('NOT_FOUND')));
    expect(await getPhotoUrl({ photos, storage }, 'f1')).toEqual(err(appError('NOT_FOUND')));
  });
});
