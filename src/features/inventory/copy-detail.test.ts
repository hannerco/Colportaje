import { describe, expect, it, vi } from 'vitest';
import type { CopyEvent } from '@/domain/copy';
import type { DetailCopy } from '@/domain/copy-detail';
import { appError } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import { fixedClock, localDate } from '@/domain/time';
import type { Title } from '@/domain/title';
import { fakeConnectivity } from '../../../tests/support/fake-connectivity';
import {
  fakeCopyRepository,
  fakeCustomerRepository,
  fakeTitleRepository,
} from '../../../tests/support/fake-repositories';
import { loadCopyDetail, updateReceivedDate } from './use-cases/copy-detail';

const MARIA = { id: 'c-maria', name: 'María Camila Henao', avatarEmoji: null };
const OTRA = { id: 'c-otra', name: 'Gloria', avatarEmoji: null };
const title: Title = {
  id: 't1',
  name: 'Psiconutrición',
  author: null,
  description: null,
  imageUrl: null,
  publicPrice: 98_000,
  colportorPrice: 49_000,
  category: 'cultural',
  isActive: true,
};
const copy: DetailCopy = {
  id: 'copy-1',
  titleId: 't1',
  number: 6,
  status: 'sold',
  customerId: MARIA.id,
  agreedPrice: 93_000,
  publicPriceSnapshot: 98_000,
  receivedAt: localDate('2026-10-20'),
  soldAt: new Date('2026-11-02T15:00:00Z'),
  deletedAt: null,
};
const events: CopyEvent[] = [
  {
    id: 'e2',
    type: 'sold',
    at: new Date('2026-11-02T15:00:00Z'),
    note: null,
    data: { customerId: MARIA.id },
  },
  {
    id: 'e1',
    type: 'returned',
    at: new Date('2026-11-01T15:00:00Z'),
    note: null,
    data: { customerId: OTRA.id },
  },
];

const deps = () => ({
  copies: fakeCopyRepository({
    getDetail: vi.fn(async () => ok({ copy, openIssue: null })),
    getHistory: vi.fn(async () => ok(events)),
  }),
  titles: fakeTitleRepository({ getMany: vi.fn(async () => ok([title])) }),
  customers: fakeCustomerRepository({ getRefs: vi.fn(async () => ok([MARIA, OTRA])) }),
});

describe('loadCopyDetail (HU-INV-05)', () => {
  it('arma el detalle con el cliente actual y los nombres de los clientes del historial', async () => {
    const d = deps();
    const result = await loadCopyDetail(d, 'copy-1');
    expect(d.customers.getRefs).toHaveBeenCalledWith([MARIA.id, MARIA.id, OTRA.id]);
    expect(result.ok && result.value.customer).toEqual(MARIA);
    expect(result.ok && result.value.history.map((h) => h.data.customerName)).toEqual([
      MARIA.name,
      OTRA.name,
    ]);
  });

  it('cada lectura que falle devuelve su error; un título que no llega es NOT_FOUND', async () => {
    const failure = err(appError('NETWORK_ERROR'));
    for (const broken of [
      {
        copies: fakeCopyRepository({
          ...deps().copies,
          getDetail: vi.fn(async () => err(appError('NOT_FOUND'))),
        }),
      },
      { copies: fakeCopyRepository({ ...deps().copies, getHistory: vi.fn(async () => failure) }) },
      { titles: fakeTitleRepository({ getMany: vi.fn(async () => failure) }) },
      { customers: fakeCustomerRepository({ getRefs: vi.fn(async () => failure) }) },
    ]) {
      expect((await loadCopyDetail({ ...deps(), ...broken }, 'copy-1')).ok).toBe(false);
    }
    const noTitle = { ...deps(), titles: fakeTitleRepository({ getMany: vi.fn(async () => ok([])) }) };
    expect(await loadCopyDetail(noTitle, 'copy-1')).toEqual(err(appError('NOT_FOUND')));
  });
});

describe('updateReceivedDate (HU-INV-05)', () => {
  const clock = fixedClock('2026-11-08T15:00:00Z');

  it('guarda una fecha pasada', async () => {
    const copies = fakeCopyRepository({ updateReceivedDate: vi.fn(async () => ok(undefined)) });
    expect(
      await updateReceivedDate(
        { copies, connectivity: fakeConnectivity(), clock },
        'copy-1',
        localDate('2026-10-28'),
      ),
    ).toEqual(ok(undefined));
    expect(copies.updateReceivedDate).toHaveBeenCalledWith('copy-1', '2026-10-28');
  });

  it('una fecha futura → DATE_IN_FUTURE sin llamar a la base; sin conexión → OFFLINE', async () => {
    const copies = fakeCopyRepository();
    expect(
      await updateReceivedDate(
        { copies, connectivity: fakeConnectivity(), clock },
        'copy-1',
        localDate('2026-11-09'),
      ),
    ).toEqual(err(appError('DATE_IN_FUTURE')));
    expect(
      await updateReceivedDate(
        { copies, connectivity: fakeConnectivity(false), clock },
        'copy-1',
        localDate('2026-10-01'),
      ),
    ).toEqual(err(appError('OFFLINE')));
    expect(copies.updateReceivedDate).not.toHaveBeenCalled();
  });
});
