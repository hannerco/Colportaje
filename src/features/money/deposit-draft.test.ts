import { describe, expect, it, vi } from 'vitest';
import type { LeaderDeposit } from '@/domain/deposit';
import { appError } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import { localDate } from '@/domain/time';
import type { AuthRepository, DepositRecord, ImageCodec } from '@/repositories';
import { fakeConnectivity } from '../../../tests/support/fake-connectivity';
import {
  fakeMoneyRepository,
  fakePhotoRepository,
  fakeStorageRepository,
} from '../../../tests/support/fake-repositories';
import {
  addDepositReceipt,
  deleteDepositDraft,
  deleteDepositReceipt,
  loadDeposit,
  newDepositProposalFrom,
  saveDepositDraft,
} from './use-cases/deposit-draft';
import type { MoneySummaryData } from './use-cases/money-summary';

const OWNER = 'u-1';
const auth = { getCurrentUserId: async () => OWNER } as unknown as AuthRepository;
const codec: ImageCodec = {
  decode: async () => ({ width: 800, height: 600, source: null }),
  encodeImage: async () => new Blob([new Uint8Array(100)], { type: 'image/webp' }),
};
const file = new Blob([new Uint8Array(10)], { type: 'image/jpeg' });

const deposit: LeaderDeposit = {
  id: 'd1',
  title: null,
  depositNumber: null,
  depositDate: localDate('2026-11-05'),
  cashAmount: 231_000,
  transferAmount: 0,
  note: null,
  status: 'draft',
  confirmedAt: null,
};
const record: DepositRecord = {
  deposit,
  payments: [
    {
      paymentId: 'p1',
      customerName: 'Ana',
      paidAt: localDate('2026-11-01'),
      paidAmount: 236_000,
      method: 'cash',
    },
  ],
  receipts: [
    {
      id: 'f1',
      path: 'u-1/deposit_receipt/f1.webp',
      thumbPath: 'u-1/deposit_receipt/f1.thumb.webp',
      createdAt: new Date(),
    },
  ],
  lastNumber: 2,
  history: [{ type: 'confirmed', reason: null, at: new Date('2026-11-05T15:00:00Z') }],
};

const draftInput = {
  depositId: 'd1',
  title: null,
  depositDate: '2026-11-05',
  paymentIds: ['p1'],
  cash: 231_000,
  transfer: 0,
  note: null,
  stagedReceipts: [],
};

describe('newDepositProposalFrom (HU-DIN-04)', () => {
  it('arma la propuesta con los clientes y números de la lectura de Dinero', () => {
    const data = {
      payments: [
        {
          id: 'p1',
          customerId: 'ana',
          kind: 'extra',
          status: 'collected',
          originalDueDate: null,
          dueDate: null,
          paidAt: localDate('2026-11-01'),
          agreedAmount: null,
          paidAmount: 40_000,
          method: 'cash',
          canceledAt: null,
          cancelReason: null,
          createdAt: new Date(),
          depositId: null,
        },
      ],
      deposits: [{ status: 'confirmed', cashAmount: 1, transferAmount: 0, depositNumber: 4 }],
      customers: { customers: [{ id: 'ana', name: 'Ana' }], accounts: [] },
    } as unknown as MoneySummaryData;
    expect(newDepositProposalFrom(data, 'nuevo', localDate('2026-11-05'))).toMatchObject({
      depositId: 'nuevo',
      displayTitle: 'Abibono (5)',
      selectedIds: ['p1'],
      cash: 40_000,
    });
  });
});

describe('loadDeposit (HU-DIN-04)', () => {
  it('CA-4: lo escrito y lo calculado, con la miniatura firmada y el nombre sugerido', async () => {
    const deps = {
      money: fakeMoneyRepository({ getDeposit: vi.fn(async () => ok(record)) }),
      storage: fakeStorageRepository({ signedUrl: vi.fn(async (path: string) => ok(`https://x/${path}`)) }),
    };
    const view = await loadDeposit(deps, 'd1');
    expect(view.ok && view.value).toMatchObject({
      displayTitle: 'Abibono (3)',
      cash: 231_000,
      calculated: { cash: 236_000, transfer: 0 },
      receipts: [{ photoId: 'f1', thumbUrl: 'https://x/u-1/deposit_receipt/f1.thumb.webp' }],
      history: [{ type: 'confirmed', reason: null }],
    });
  });

  it('no existe → NOT_FOUND; fallos de lectura y de firma pasan tal cual', async () => {
    const storage = fakeStorageRepository({ signedUrl: vi.fn(async () => err(appError('NETWORK_ERROR'))) });
    expect(
      await loadDeposit(
        { money: fakeMoneyRepository({ getDeposit: vi.fn(async () => ok(null)) }), storage },
        'x',
      ),
    ).toEqual(err(appError('NOT_FOUND')));
    expect(
      await loadDeposit(
        {
          money: fakeMoneyRepository({ getDeposit: vi.fn(async () => err(appError('NETWORK_ERROR'))) }),
          storage,
        },
        'x',
      ),
    ).toEqual(err(appError('NETWORK_ERROR')));
    expect(
      await loadDeposit(
        { money: fakeMoneyRepository({ getDeposit: vi.fn(async () => ok(record)) }), storage },
        'd1',
      ),
    ).toEqual(err(appError('NETWORK_ERROR')));
  });
});

describe('saveDepositDraft (HU-DIN-04)', () => {
  it('valida y guarda lo normalizado; sin conexión no llama a la base', async () => {
    const money = fakeMoneyRepository({ saveDepositDraft: vi.fn(async () => ok({ depositId: 'd1' })) });
    expect(
      await saveDepositDraft({ money, connectivity: fakeConnectivity(true) }, { ...draftInput, title: '  ' }),
    ).toEqual(ok({ depositId: 'd1' }));
    expect(money.saveDepositDraft).toHaveBeenCalledWith(expect.objectContaining({ title: null }));

    expect(
      await saveDepositDraft({ money, connectivity: fakeConnectivity(true) }, { ...draftInput, cash: -1 }),
    ).toEqual(err(appError('VALIDATION', { field: 'cash' })));
    expect(await saveDepositDraft({ money, connectivity: fakeConnectivity(false) }, draftInput)).toEqual(
      err(appError('OFFLINE')),
    );
    expect(money.saveDepositDraft).toHaveBeenCalledTimes(1);
  });
});

describe('addDepositReceipt (HU-DIN-04)', () => {
  const deps = (existing: DepositRecord | null) => ({
    connectivity: fakeConnectivity(true),
    auth,
    imageCodec: codec,
    storage: fakeStorageRepository({ upload: vi.fn(async () => ok(undefined)) }),
    photos: fakePhotoRepository({ create: vi.fn(async () => ok(undefined)) }),
    money: fakeMoneyRepository({ getDeposit: vi.fn(async () => ok(existing)) }),
  });

  it('R7: en una propuesta sin guardar solo sube el archivo y devuelve el recibo pendiente', async () => {
    const d = deps(null);
    const result = await addDepositReceipt(d, { depositId: 'nuevo', photoId: 'f2', file });
    expect(result).toEqual(
      ok({
        staged: {
          photoId: 'f2',
          path: `${OWNER}/deposit_receipt/f2.webp`,
          thumbPath: `${OWNER}/deposit_receipt/f2.thumb.webp`,
          bytes: 200,
        },
      }),
    );
    expect(d.photos.create).not.toHaveBeenCalled();
  });

  it('con el Abibono guardado crea la fila de inmediato', async () => {
    const d = deps(record);
    expect(await addDepositReceipt(d, { depositId: 'd1', photoId: 'f2', file })).toEqual(
      ok({ staged: null }),
    );
    expect(d.photos.create).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'f2', kind: 'deposit_receipt', leaderDepositId: 'd1' }),
    );
  });

  it('errores de subida, de lectura y de la fila pasan tal cual', async () => {
    const failedUpload = deps(record);
    vi.mocked(failedUpload.storage.upload).mockResolvedValueOnce(err(appError('NETWORK_ERROR')));
    expect(await addDepositReceipt(failedUpload, { depositId: 'd1', photoId: 'f2', file })).toEqual(
      err(appError('NETWORK_ERROR')),
    );
    expect(failedUpload.money.getDeposit).not.toHaveBeenCalled();

    const failedRead = deps(record);
    vi.mocked(failedRead.money.getDeposit).mockResolvedValueOnce(err(appError('NETWORK_ERROR')));
    expect(await addDepositReceipt(failedRead, { depositId: 'd1', photoId: 'f2', file })).toEqual(
      err(appError('NETWORK_ERROR')),
    );

    const gone = deps(record);
    vi.mocked(gone.photos.create).mockResolvedValueOnce(err(appError('NOT_FOUND')));
    expect(await addDepositReceipt(gone, { depositId: 'd1', photoId: 'f2', file })).toEqual(
      err(appError('NOT_FOUND')),
    );
  });
});

describe('deleteDepositReceipt (HU-DIN-04)', () => {
  it('R6: borrado lógico solo de recibos; uno confirmado da RECEIPT_LOCKED', async () => {
    const photos = fakePhotoRepository({ softDelete: vi.fn(async () => err(appError('RECEIPT_LOCKED'))) });
    expect(await deleteDepositReceipt({ photos, connectivity: fakeConnectivity(true) }, 'f1')).toEqual(
      err(appError('RECEIPT_LOCKED')),
    );
    expect(photos.softDelete).toHaveBeenCalledWith('f1', { kind: 'deposit_receipt' });
  });
});

describe('deleteDepositDraft (HU-DIN-04)', () => {
  const deps = (paths: string[]) => ({
    money: fakeMoneyRepository({ deleteDepositDraft: vi.fn(async () => ok({ paths })) }),
    storage: fakeStorageRepository({ remove: vi.fn(async () => ok(undefined)) }),
    connectivity: fakeConnectivity(true),
  });

  it('R5: borra el borrador y luego los archivos de sus recibos', async () => {
    const d = deps(['a.webp', 'a.thumb.webp']);
    expect(await deleteDepositDraft(d, 'd1')).toEqual(ok(undefined));
    expect(d.storage.remove).toHaveBeenCalledWith(['a.webp', 'a.thumb.webp']);
  });

  it('sin recibos no llama al bucket; si borrar archivos falla, el borrador igual quedó borrado', async () => {
    const none = deps([]);
    expect(await deleteDepositDraft(none, 'd1')).toEqual(ok(undefined));
    expect(none.storage.remove).not.toHaveBeenCalled();

    const failing = deps(['a.webp']);
    vi.mocked(failing.storage.remove).mockRejectedValueOnce(new TypeError('fetch failed'));
    expect(await deleteDepositDraft(failing, 'd1')).toEqual(ok(undefined));
  });

  it('DEPOSIT_NOT_DRAFT pasa tal cual y no toca el bucket', async () => {
    const d = deps([]);
    vi.mocked(d.money.deleteDepositDraft).mockResolvedValueOnce(err(appError('DEPOSIT_NOT_DRAFT')));
    expect(await deleteDepositDraft(d, 'd1')).toEqual(err(appError('DEPOSIT_NOT_DRAFT')));
    expect(d.storage.remove).not.toHaveBeenCalled();
  });
});
