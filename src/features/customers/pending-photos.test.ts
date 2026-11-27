import { describe, expect, it, vi } from 'vitest';
import { appError } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import { localDate } from '@/domain/time';
import type { AuthRepository, ImageCodec, PendingPhoto } from '@/repositories';
import { fakeConnectivity } from '../../../tests/support/fake-connectivity';
import {
  fakeInvoiceRepository,
  fakePhotoRepository,
  fakeStorageRepository,
  memoryPhotoOutbox,
} from '../../../tests/support/fake-repositories';
import {
  discardPendingPhoto,
  drainPendingPhotos,
  fateOf,
  queueNewCustomerPhotos,
  retryPendingPhoto,
} from './use-cases/pending-photos';

const OWNER = 'u-1';
const file = new Blob([new Uint8Array(10)], { type: 'image/jpeg' });
const codec: ImageCodec = {
  decode: async () => ({ width: 800, height: 600, source: null }),
  encodeImage: async () => new Blob([new Uint8Array(100)], { type: 'image/webp' }),
};

function setup({ online = true, owner = OWNER as string | null, queued = [] as PendingPhoto[] } = {}) {
  return {
    auth: { getCurrentUserId: async () => owner } as unknown as AuthRepository,
    connectivity: fakeConnectivity(online),
    imageCodec: codec,
    storage: fakeStorageRepository({ upload: vi.fn(async () => ok(undefined)) }),
    photos: fakePhotoRepository({ create: vi.fn(async () => ok(undefined)) }),
    invoices: fakeInvoiceRepository({
      createWithPhoto: vi.fn(async () => ok(undefined)),
      addPhoto: vi.fn(async () => ok(undefined)),
      update: vi.fn(async () => ok(undefined)),
    }),
    photoOutbox: memoryPhotoOutbox(queued),
  };
}

const newCustomerPhotos = {
  infoPhotos: [{ photoId: 'img1', file }],
  invoices: [
    {
      invoiceId: 'inv1',
      number: '0042',
      date: localDate('2026-11-20'),
      photos: [
        { photoId: 'fac1', file },
        { photoId: 'fac2', file },
      ],
    },
  ],
};

async function queueAll(deps: ReturnType<typeof setup>) {
  await queueNewCustomerPhotos(deps, {
    ownerId: OWNER,
    customerId: 'c1',
    photos: newCustomerPhotos,
    now: 1000,
  });
}

describe('bandeja de fotos de un cliente nuevo (ADR-0054)', () => {
  it('guarda en el teléfono cada foto con a qué va y en el orden en que se tomó', async () => {
    const deps = setup();
    await queueAll(deps);
    const saved = [...deps.photoOutbox.saved.values()];
    expect(saved.map((p) => [p.photoId, p.queuedAt, p.target])).toEqual([
      ['img1', 1000, { type: 'customer_info' }],
      [
        'fac1',
        1001,
        {
          type: 'customer_invoice',
          invoiceId: 'inv1',
          createsInvoice: true,
          number: '0042',
          date: '2026-11-20',
        },
      ],
      [
        'fac2',
        1002,
        {
          type: 'customer_invoice',
          invoiceId: 'inv1',
          createsInvoice: false,
          number: '0042',
          date: '2026-11-20',
        },
      ],
    ]);
    expect(saved.every((p) => p.ownerId === OWNER && p.customerId === 'c1' && p.failure === null)).toBe(true);
  });

  it('sube todo en orden: la imagen, la factura con su primera foto (con N.º y fecha) y luego la otra foto', async () => {
    const deps = setup();
    await queueAll(deps);
    const uploaded: string[] = [];

    expect(await drainPendingPhotos(deps, { onUploaded: (p) => uploaded.push(p.photoId) })).toEqual({
      waiting: false,
    });

    expect(uploaded).toEqual(['img1', 'fac1', 'fac2']);
    expect(deps.photos.create).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'img1', customerId: 'c1' }),
    );
    expect(deps.invoices.createWithPhoto).toHaveBeenCalledWith(
      expect.objectContaining({
        invoiceId: 'inv1',
        customerId: 'c1',
        photo: expect.objectContaining({ photoId: 'fac1' }),
      }),
    );
    // La base pone la fecha del día en que sube; se deja la escrita al crear el cliente.
    expect(deps.invoices.update).toHaveBeenCalledWith('inv1', { number: '0042', date: '2026-11-20' });
    expect(deps.invoices.addPhoto).toHaveBeenCalledWith('inv1', expect.objectContaining({ photoId: 'fac2' }));
    expect(deps.photoOutbox.saved.size).toBe(0);
  });

  it('sin señal no sube nada ni pierde nada: todo sigue en el teléfono para después', async () => {
    const deps = setup({ online: false });
    await queueAll(deps);
    expect(await drainPendingPhotos(deps)).toEqual({ waiting: true });
    expect(deps.photoOutbox.saved.size).toBe(3);
    expect(deps.storage.upload).not.toHaveBeenCalled();
  });

  it('si la red se cae a mitad, lo subido sale de la bandeja y lo demás espera (nada queda marcado como fallido)', async () => {
    const deps = setup();
    await queueAll(deps);
    vi.mocked(deps.invoices.createWithPhoto).mockResolvedValueOnce(err(appError('NETWORK_ERROR')));

    expect(await drainPendingPhotos(deps)).toEqual({ waiting: true });

    expect([...deps.photoOutbox.saved.keys()]).toEqual(['fac1', 'fac2']);
    expect([...deps.photoOutbox.saved.values()].every((p) => p.failure === null)).toBe(true);
    expect(deps.invoices.addPhoto).not.toHaveBeenCalled();

    // Al volver la señal se reintenta con los mismos ids: no se duplica.
    expect(await drainPendingPhotos(deps)).toEqual({ waiting: false });
    expect(deps.photoOutbox.saved.size).toBe(0);
  });

  it('sin sesión espera; solo sube las fotos del usuario que las tomó', async () => {
    const noSession = setup({ owner: null });
    await queueAll(noSession);
    expect(await drainPendingPhotos(noSession)).toEqual({ waiting: true });
    expect(noSession.photoOutbox.saved.size).toBe(3);

    const other = setup({ owner: 'u-2' });
    await queueAll(other);
    expect(await drainPendingPhotos(other)).toEqual({ waiting: false });
    expect(other.photoOutbox.saved.size).toBe(3);
    expect(other.storage.upload).not.toHaveBeenCalled();
  });

  it('si el cliente ya no existe, sus fotos se quitan sin avisar', async () => {
    const deps = setup();
    await queueAll(deps);
    vi.mocked(deps.photos.create).mockResolvedValue(err(appError('NOT_FOUND')));
    vi.mocked(deps.invoices.createWithPhoto).mockResolvedValue(err(appError('NOT_FOUND')));
    vi.mocked(deps.invoices.addPhoto).mockResolvedValue(err(appError('NOT_FOUND')));

    expect(await drainPendingPhotos(deps)).toEqual({ waiting: false });
    expect(deps.photoOutbox.saved.size).toBe(0);
  });

  it('un error que no se arregla esperando deja la foto guardada y marcada; las demás siguen', async () => {
    const deps = setup();
    await queueAll(deps);
    vi.mocked(deps.photos.create).mockResolvedValueOnce(err(appError('CUSTOMER_ARCHIVED')));

    expect(await drainPendingPhotos(deps)).toEqual({ waiting: false });

    expect([...deps.photoOutbox.saved.values()]).toEqual([
      expect.objectContaining({ photoId: 'img1', failure: 'CUSTOMER_ARCHIVED' }),
    ]);
    // Una marcada no se vuelve a intentar sola.
    await drainPendingPhotos(deps);
    expect(deps.photos.create).toHaveBeenCalledTimes(1);
  });

  it('si la foto que creaba la factura no sube, la siguiente la crea; al reintentarla se le agrega', async () => {
    const deps = setup();
    await queueAll(deps);
    // fac1 es ilegible: falla sin remedio. fac2 no encuentra la factura y la crea ella.
    vi.mocked(deps.invoices.createWithPhoto).mockResolvedValueOnce(err(appError('IMAGE_UNREADABLE')));
    vi.mocked(deps.invoices.addPhoto).mockResolvedValueOnce(err(appError('NOT_FOUND')));

    await drainPendingPhotos(deps);

    expect(deps.invoices.createWithPhoto).toHaveBeenLastCalledWith(
      expect.objectContaining({ invoiceId: 'inv1', photo: expect.objectContaining({ photoId: 'fac2' }) }),
    );
    expect(deps.invoices.update).toHaveBeenCalledWith('inv1', { number: '0042', date: '2026-11-20' });
    expect([...deps.photoOutbox.saved.keys()]).toEqual(['fac1']);

    // «Reintentar» fac1: la factura ya existe (CONFLICT al crearla), así que se le agrega.
    vi.mocked(deps.invoices.createWithPhoto).mockResolvedValueOnce(err(appError('CONFLICT')));
    await retryPendingPhoto(deps, 'fac1', 5000);
    expect(deps.photoOutbox.saved.get('fac1')).toEqual(
      expect.objectContaining({ failure: null, queuedAt: 5000 }),
    );
    await drainPendingPhotos(deps);
    expect(deps.invoices.addPhoto).toHaveBeenLastCalledWith(
      'inv1',
      expect.objectContaining({ photoId: 'fac1' }),
    );
    expect(deps.photoOutbox.saved.size).toBe(0);
  });

  it('si el N.º o la fecha no se pueden poner, la foto igual cuenta como subida', async () => {
    const deps = setup();
    await queueAll(deps);
    vi.mocked(deps.invoices.update).mockResolvedValueOnce(err(appError('VALIDATION')));
    await drainPendingPhotos(deps);
    expect(deps.photoOutbox.saved.size).toBe(0);
  });

  it('«Descartar» borra la foto del teléfono', async () => {
    const deps = setup();
    await queueAll(deps);
    await discardPendingPhoto(deps, 'img1');
    expect(deps.photoOutbox.saved.has('img1')).toBe(false);
  });

  it('qué hacer con cada error', () => {
    expect(fateOf(appError('OFFLINE'))).toBe('wait');
    expect(fateOf(appError('NETWORK_ERROR'))).toBe('wait');
    expect(fateOf(appError('TIMEOUT'))).toBe('wait');
    expect(fateOf(appError('SESSION_EXPIRED'))).toBe('wait');
    expect(fateOf(appError('NOT_FOUND'))).toBe('drop');
    expect(fateOf(appError('CUSTOMER_ARCHIVED'))).toBe('fail');
    expect(fateOf(appError('IMAGE_UNREADABLE'))).toBe('fail');
    expect(fateOf(appError('FORBIDDEN'))).toBe('fail');
  });
});
