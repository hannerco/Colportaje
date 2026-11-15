import { describe, expect, it, vi } from 'vitest';
import { appError } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import { localDate } from '@/domain/time';
import type { AuthRepository, ImageCodec } from '@/repositories';
import { fakeConnectivity } from '../../../tests/support/fake-connectivity';
import { fakeInvoiceRepository, fakeStorageRepository } from '../../../tests/support/fake-repositories';
import {
  addInvoicePhoto,
  createInvoiceWithPhoto,
  deleteInvoicePhoto,
  listCustomerInvoices,
  updateInvoice,
} from './use-cases/customer-invoices';

const OWNER = 'u-1';
const auth = { getCurrentUserId: async () => OWNER } as unknown as AuthRepository;
const codec: ImageCodec = {
  decode: async () => ({ width: 800, height: 600, source: null }),
  encodeWebp: async () => new Blob([new Uint8Array(100)], { type: 'image/webp' }),
};
const file = new Blob([new Uint8Array(10)], { type: 'image/jpeg' });

const depsWith = (online = true) => ({
  connectivity: fakeConnectivity(online),
  auth,
  imageCodec: codec,
  storage: fakeStorageRepository({
    upload: vi.fn(async () => ok(undefined)),
    signedUrl: vi.fn(async (path: string) => ok(`url:${path}`)),
  }),
  invoices: fakeInvoiceRepository({
    createWithPhoto: vi.fn(async () => ok(undefined)),
    addPhoto: vi.fn(async () => ok(undefined)),
    update: vi.fn(async () => ok(undefined)),
    deletePhoto: vi.fn(async () => ok({ invoiceDeleted: true })),
  }),
});

describe('facturas del cliente (HU-CLI-08)', () => {
  it('CA-1 / R1: sube la foto bajo customer_invoice y crea la factura con ella', async () => {
    const deps = depsWith();
    expect(
      await createInvoiceWithPhoto(deps, { invoiceId: 'i1', photoId: 'f1', customerId: 'c1', file }),
    ).toEqual(ok({ invoiceId: 'i1' }));
    expect(deps.storage.upload).toHaveBeenCalledWith(`${OWNER}/customer_invoice/f1.webp`, expect.any(Blob));
    expect(deps.invoices.createWithPhoto).toHaveBeenCalledWith({
      invoiceId: 'i1',
      customerId: 'c1',
      photo: expect.objectContaining({ photoId: 'f1', path: `${OWNER}/customer_invoice/f1.webp` }),
    });
  });

  it('si la subida de la primera foto falla, no se crea la factura; los errores de la base pasan', async () => {
    const deps = depsWith();
    vi.mocked(deps.storage.upload).mockResolvedValueOnce(err(appError('NETWORK_ERROR')));
    expect(
      await createInvoiceWithPhoto(deps, { invoiceId: 'i1', photoId: 'f1', customerId: 'c1', file }),
    ).toEqual(err(appError('NETWORK_ERROR')));
    expect(deps.invoices.createWithPhoto).not.toHaveBeenCalled();
    vi.mocked(deps.invoices.createWithPhoto).mockResolvedValueOnce(err(appError('CUSTOMER_ARCHIVED')));
    expect(
      await createInvoiceWithPhoto(deps, { invoiceId: 'i1', photoId: 'f1', customerId: 'c1', file }),
    ).toEqual(err(appError('CUSTOMER_ARCHIVED')));
  });

  it('CA-3: agrega una foto; si la subida falla no llama a la base', async () => {
    const deps = depsWith();
    expect(await addInvoicePhoto(deps, { invoiceId: 'i1', photoId: 'f2', file })).toEqual(ok(undefined));
    expect(deps.invoices.addPhoto).toHaveBeenCalledWith('i1', expect.objectContaining({ photoId: 'f2' }));
    const offline = depsWith(false);
    expect(await addInvoicePhoto(offline, { invoiceId: 'i1', photoId: 'f2', file })).toEqual(
      err(appError('OFFLINE')),
    );
    expect(offline.invoices.addPhoto).not.toHaveBeenCalled();
  });

  it('CA-2: guarda el N.º recortado; una fecha inválida → VALIDATION sin ir a la red', async () => {
    const deps = depsWith();
    expect(await updateInvoice(deps, 'i1', { number: ' 0123 ' })).toEqual(ok(undefined));
    expect(deps.invoices.update).toHaveBeenCalledWith('i1', { number: '0123' });
    expect(await updateInvoice(deps, 'i1', { date: '2026-13-01' })).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION', details: { field: 'date' } },
    });
    expect(deps.invoices.update).toHaveBeenCalledTimes(1);
  });

  it('CA-4: borrar la última foto informa invoiceDeleted; sin conexión → OFFLINE', async () => {
    const deps = depsWith();
    expect(await deleteInvoicePhoto(deps, 'f1')).toEqual(ok({ invoiceDeleted: true }));
    expect(await deleteInvoicePhoto(depsWith(false), 'f1')).toEqual(err(appError('OFFLINE')));
  });

  it('la lista sale ordenada y con miniaturas firmadas; un fallo de lectura o de firma se devuelve', async () => {
    const deps = depsWith();
    const photo = (id: string) => ({ id, path: `p-${id}`, thumbPath: `t-${id}`, createdAt: new Date() });
    vi.mocked(deps.invoices.listOfCustomer).mockResolvedValue(
      ok([
        {
          id: 'old',
          number: null,
          date: localDate('2026-10-01'),
          createdAt: new Date(),
          photos: [photo('a')],
        },
        {
          id: 'new',
          number: '0123',
          date: localDate('2026-11-03'),
          createdAt: new Date(),
          photos: [photo('b')],
        },
      ]),
    );
    expect(await listCustomerInvoices(deps, 'c1')).toEqual(
      ok([
        {
          invoiceId: 'new',
          number: '0123',
          date: '2026-11-03',
          photos: [{ photoId: 'b', thumbUrl: 'url:t-b' }],
        },
        {
          invoiceId: 'old',
          number: null,
          date: '2026-10-01',
          photos: [{ photoId: 'a', thumbUrl: 'url:t-a' }],
        },
      ]),
    );
    vi.mocked(deps.storage.signedUrl).mockResolvedValueOnce(err(appError('NETWORK_ERROR')));
    expect(await listCustomerInvoices(deps, 'c1')).toMatchObject({ ok: false });
    vi.mocked(deps.invoices.listOfCustomer).mockResolvedValueOnce(err(appError('NETWORK_ERROR')));
    expect(await listCustomerInvoices(deps, 'c1')).toMatchObject({ ok: false });
  });
});
