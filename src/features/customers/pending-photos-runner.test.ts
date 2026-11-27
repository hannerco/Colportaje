import { afterEach, describe, expect, it, vi } from 'vitest';
import { appError } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import type { AuthRepository, ImageCodec } from '@/repositories';
import { fakeConnectivity } from '../../../tests/support/fake-connectivity';
import {
  fakeInvoiceRepository,
  fakePhotoRepository,
  fakeStorageRepository,
  memoryPhotoOutbox,
} from '../../../tests/support/fake-repositories';
import { createPendingPhotosRunner, pendingPhotosOf } from './pending-photos-runner';

const file = new Blob([new Uint8Array(10)], { type: 'image/jpeg' });
const codec: ImageCodec = {
  decode: async () => ({ width: 800, height: 600, source: null }),
  encodeImage: async () => new Blob([new Uint8Array(100)], { type: 'image/webp' }),
};

const setup = () => ({
  auth: { getCurrentUserId: async () => 'u-1' } as unknown as AuthRepository,
  connectivity: fakeConnectivity(true),
  imageCodec: codec,
  storage: fakeStorageRepository({ upload: vi.fn(async () => ok(undefined)) }),
  photos: fakePhotoRepository({ create: vi.fn(async () => ok(undefined)) }),
  invoices: fakeInvoiceRepository({
    createWithPhoto: vi.fn(async () => ok(undefined)),
    addPhoto: vi.fn(async () => ok(undefined)),
    update: vi.fn(async () => ok(undefined)),
  }),
  photoOutbox: memoryPhotoOutbox(),
});

const photos = {
  infoPhotos: [
    { photoId: 'img1', file },
    { photoId: 'img2', file },
  ],
  invoices: [],
};

afterEach(() => vi.useRealTimers());

describe('motor de la bandeja de fotos (ADR-0054)', () => {
  it('al poner fotos en la bandeja las sube y avisa cada una para refrescar la ficha', async () => {
    const deps = setup();
    const onUploaded = vi.fn();
    const runner = createPendingPhotosRunner(deps, { onUploaded });

    await runner.queue({ customerId: 'c1', photos });
    await runner.run();

    expect(onUploaded).toHaveBeenCalledTimes(2);
    expect(runner.getState()).toEqual({ photos: [], uploadingId: null });
  });

  it('cuenta lo pendiente de cada cliente y cuál se está subiendo', () => {
    const base = { ownerId: 'u-1', file, target: { type: 'customer_info' as const }, queuedAt: 1 };
    const state = {
      photos: [
        { ...base, photoId: 'a', customerId: 'c1', failure: null },
        { ...base, photoId: 'b', customerId: 'c1', failure: null },
        { ...base, photoId: 'c', customerId: 'c1', failure: 'CUSTOMER_ARCHIVED' },
        { ...base, photoId: 'd', customerId: 'c2', failure: null },
      ],
      uploadingId: 'b',
    };
    expect(pendingPhotosOf(state, 'c1')).toEqual({ pending: 2, uploading: true, failedIds: ['c'] });
    expect(pendingPhotosOf(state, 'c2')).toEqual({ pending: 1, uploading: false, failedIds: [] });
    expect(pendingPhotosOf(state, 'c3')).toEqual({ pending: 0, uploading: false, failedIds: [] });
  });

  it('pedir otra ronda mientras sube no sube dos veces a la vez', async () => {
    const deps = setup();
    const runner = createPendingPhotosRunner(deps);
    await deps.photoOutbox.put([
      {
        photoId: 'img1',
        ownerId: 'u-1',
        customerId: 'c1',
        target: { type: 'customer_info' },
        file,
        queuedAt: 1,
        failure: null,
      },
    ]);

    await Promise.all([runner.run(), runner.run(), runner.run()]);

    expect(deps.photos.create).toHaveBeenCalledTimes(1);
  });

  it('con señal pero red inestable, vuelve a intentar sola un rato después', async () => {
    vi.useFakeTimers();
    const deps = setup();
    vi.mocked(deps.photos.create).mockResolvedValueOnce(err(appError('NETWORK_ERROR')));
    const runner = createPendingPhotosRunner(deps, { retryMs: 1000 });

    await runner.queue({
      customerId: 'c1',
      photos: { infoPhotos: [{ photoId: 'img1', file }], invoices: [] },
    });
    // La ronda que arrancó al ponerla en la bandeja termina sin subirla.
    await vi.advanceTimersByTimeAsync(0);
    expect(runner.getState().photos).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(runner.getState().photos).toHaveLength(0);
    runner.stop();
  });

  it('«Reintentar» vuelve a subir una foto fallida y «Descartar» la borra', async () => {
    const deps = setup();
    vi.mocked(deps.photos.create).mockResolvedValueOnce(err(appError('CUSTOMER_ARCHIVED')));
    const runner = createPendingPhotosRunner(deps);
    await runner.queue({ customerId: 'c1', photos });
    await runner.run();
    expect(pendingPhotosOf(runner.getState(), 'c1').failedIds).toEqual(['img1']);

    await runner.retry('img1');
    await runner.run();
    expect(runner.getState().photos).toEqual([]);

    vi.mocked(deps.photos.create).mockResolvedValueOnce(err(appError('CUSTOMER_ARCHIVED')));
    await runner.queue({
      customerId: 'c1',
      photos: { infoPhotos: [{ photoId: 'img3', file }], invoices: [] },
    });
    await runner.run();
    await runner.discard('img3');
    expect(runner.getState().photos).toEqual([]);
  });
});
