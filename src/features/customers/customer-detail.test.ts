import { describe, expect, it, vi } from 'vitest';
import { appError } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import { fixedClock } from '@/domain/time';
import {
  fakeCustomerRepository,
  fakeInvoiceRepository,
  fakePhotoRepository,
  fakeStorageRepository,
} from '../../../tests/support/fake-repositories';
import { loadCustomerDetail } from './use-cases/customer-detail';

const depsWith = () => ({
  clock: fixedClock('2026-11-05T15:00:00Z'),
  customers: fakeCustomerRepository({
    getDetailData: vi.fn(async () =>
      ok({
        customer: {
          id: 'c1',
          name: 'Natalia',
          avatarEmoji: null,
          phone: null,
          info: null,
          address: null,
          mapsUrl: null,
          latitude: null,
          longitude: null,
          accuracyMeters: null,
          archived: false,
          createdAt: new Date('2026-10-01T15:00:00Z'),
        },
        soldCopies: [],
        payments: [],
      }),
    ),
  }),
  photos: fakePhotoRepository({
    listOfCustomer: vi.fn(async () =>
      ok([{ id: 'f1', path: 'p', thumbPath: 't', createdAt: new Date('2026-10-02T15:00:00Z') }]),
    ),
  }),
  invoices: fakeInvoiceRepository({ listOfCustomer: vi.fn(async () => ok([])) }),
  storage: fakeStorageRepository({ signedUrl: vi.fn(async (path: string) => ok(`url:${path}`)) }),
});

describe('loadCustomerDetail (HU-CLI-12)', () => {
  it('junta la ficha armada con las fotos de información y las facturas', async () => {
    const result = await loadCustomerDetail(depsWith(), 'c1');
    expect(result).toMatchObject({
      ok: true,
      value: {
        id: 'c1',
        contact: null,
        account: { debt: 0 },
        payments: [],
        infoPhotos: [{ photoId: 'f1', thumbUrl: 'url:t' }],
        invoices: [],
      },
    });
  });

  it('NOT_FOUND y los fallos de fotos o facturas se devuelven', async () => {
    const missing = depsWith();
    vi.mocked(missing.customers.getDetailData).mockResolvedValueOnce(err(appError('NOT_FOUND')));
    expect(await loadCustomerDetail(missing, 'x')).toEqual(err(appError('NOT_FOUND')));
    const noPhotos = depsWith();
    vi.mocked(noPhotos.photos.listOfCustomer).mockResolvedValueOnce(err(appError('NETWORK_ERROR')));
    expect(await loadCustomerDetail(noPhotos, 'c1')).toEqual(err(appError('NETWORK_ERROR')));
    const noInvoices = depsWith();
    vi.mocked(noInvoices.invoices.listOfCustomer).mockResolvedValueOnce(err(appError('NETWORK_ERROR')));
    expect(await loadCustomerDetail(noInvoices, 'c1')).toEqual(err(appError('NETWORK_ERROR')));
  });
});
