import { describe, expect, it, vi } from 'vitest';
import { appError } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import { fixedClock, localDate } from '@/domain/time';
import type { Title } from '@/domain/title';
import type { CopyRepository, CustomerRepository, TitleRepository } from '@/repositories';
import { fakeConnectivity } from '../../../tests/support/fake-connectivity';
import { fakeCopyRepository, fakeCustomerRepository } from '../../../tests/support/fake-repositories';
import { addCopiesBatch } from './use-cases/add-copies-batch';
import { loadCopiesListData } from './use-cases/copies-list';
import { loadFlaggedCopies, loadInStockCopiesOfTitle, loadInStockSummary } from './use-cases/stock';

const TITLE = '00000000-0000-4000-8000-000000000101';
const COPY = '20000000-0000-4000-8000-000000000001';
// 04/11/2026 a las 22:00 en Bogotá (ya es 05/11 en UTC).
const clock = fixedClock('2026-11-05T03:00:00Z');

const input = (receivedAt = '2026-11-04') => ({
  batchId: '10000000-0000-4000-8000-000000000001',
  receivedAt: localDate(receivedAt),
  lines: [{ titleId: TITLE, copyIds: [COPY] }],
});

const copiesWith = (addBatch: CopyRepository['addBatch']): CopyRepository =>
  fakeCopyRepository({ addBatch: vi.fn(addBatch) });

describe('addCopiesBatch (HU-INV-02)', () => {
  it('confirma el lote y devuelve los ejemplares creados', async () => {
    const created = [{ copyId: COPY, titleId: TITLE, number: 1 }];
    const copies = copiesWith(async () => ok({ created }));
    const result = await addCopiesBatch({ copies, connectivity: fakeConnectivity(), clock }, input());
    expect(result).toEqual(ok({ created }));
    expect(copies.addBatch).toHaveBeenCalledWith(input());
  });

  it('sin conexión → OFFLINE sin llamar a la base (BR-GEN-08)', async () => {
    const copies = copiesWith(async () => ok({ created: [] }));
    const result = await addCopiesBatch({ copies, connectivity: fakeConnectivity(false), clock }, input());
    expect(result).toEqual(err(appError('OFFLINE')));
    expect(copies.addBatch).not.toHaveBeenCalled();
  });

  it('CA-5: fecha 05/11/2026 con hoy 04/11/2026 en Bogotá → DATE_IN_FUTURE sin llamar a la base', async () => {
    const copies = copiesWith(async () => ok({ created: [] }));
    const result = await addCopiesBatch(
      { copies, connectivity: fakeConnectivity(), clock },
      input('2026-11-05'),
    );
    expect(result).toEqual(err(appError('DATE_IN_FUTURE')));
    expect(copies.addBatch).not.toHaveBeenCalled();
  });

  it('un fallo de red a mitad → NETWORK_ERROR reintentable', async () => {
    const copies = copiesWith(async () => {
      throw new TypeError('Failed to fetch');
    });
    const result = await addCopiesBatch({ copies, connectivity: fakeConnectivity(), clock }, input());
    expect(result).toEqual(err(appError('NETWORK_ERROR')));
    expect(!result.ok && result.error.retryable).toBe(true);
  });

  it('los errores de la base pasan tal cual (TITLE_INACTIVE con sus títulos)', async () => {
    const failure = err(appError('TITLE_INACTIVE', { titleIds: [TITLE] }));
    const copies = copiesWith(async () => failure);
    expect(await addCopiesBatch({ copies, connectivity: fakeConnectivity(), clock }, input())).toEqual(
      failure,
    );
  });
});

const aTitle: Title = {
  id: TITLE,
  name: 'Salud y bienestar',
  author: null,
  description: null,
  imageUrl: null,
  publicPrice: 75_000,
  colportorPrice: 37_500,
  category: 'cultural',
  isActive: false,
};

const stockDeps = (overrides: Partial<CopyRepository> = {}, titles: Title[] = [aTitle]) => {
  const titleRepo: TitleRepository = {
    listActive: vi.fn(),
    getMany: vi.fn(async (ids: readonly string[]) => ok(titles.filter((t) => ids.includes(t.id)))),
  };
  return {
    copies: { ...copiesWith(async () => ok({ created: [] })), ...overrides },
    titles: titleRepo,
  };
};

const stockCopy = {
  id: COPY,
  titleId: TITLE,
  number: 1,
  status: 'in_stock' as const,
  receivedAt: localDate('2026-11-01'),
};
const offline = err(appError('NETWORK_ERROR'));

describe('lecturas de Libros en físico (HU-INV-03)', () => {
  it('loadInStockSummary pide los títulos de sus ejemplares (también desactivados) y arma el resumen', async () => {
    const deps = stockDeps({ listStock: vi.fn(async () => ok([stockCopy, { ...stockCopy, id: 'x' }])) });
    const result = await loadInStockSummary(deps);
    expect(deps.titles.getMany).toHaveBeenCalledWith([TITLE]);
    expect(result.ok && result.value).toMatchObject({
      booksTotal: 2,
      titles: [{ titleId: TITLE, inStockCount: 2 }],
    });
  });

  it('loadInStockCopiesOfTitle: el título y sus ejemplares; NOT_FOUND si el título no existe', async () => {
    const deps = stockDeps({ listInStockOfTitle: vi.fn(async () => ok([stockCopy])) });
    expect(await loadInStockCopiesOfTitle(deps, TITLE)).toEqual(
      ok({
        title: { name: 'Salud y bienestar', inStockCount: 1, referencePrice: 75_000 },
        copies: [{ copyId: COPY, number: 1, receivedAt: '2026-11-01' }],
      }),
    );
    expect(await loadInStockCopiesOfTitle(stockDeps({}, []), TITLE)).toEqual(err(appError('NOT_FOUND')));
  });

  it('loadFlaggedCopies: con el nombre del título', async () => {
    const flaggedAt = new Date('2026-11-02T15:00:00Z');
    const deps = stockDeps({
      listFlagged: vi.fn(async () =>
        ok([{ copyId: COPY, titleId: TITLE, number: 3, note: 'Faltó', flaggedAt }]),
      ),
    });
    expect(await loadFlaggedCopies(deps)).toEqual(
      ok([{ copyId: COPY, titleName: 'Salud y bienestar', number: 3, note: 'Faltó', flaggedAt }]),
    );
  });

  it('los errores de los repositorios pasan tal cual', async () => {
    const failing = stockDeps({
      listStock: vi.fn(async () => offline),
      listInStockOfTitle: vi.fn(async () => offline),
      listFlagged: vi.fn(async () => offline),
    });
    expect(await loadInStockSummary(failing)).toEqual(offline);
    expect(await loadInStockCopiesOfTitle(failing, TITLE)).toEqual(offline);
    expect(await loadFlaggedCopies(failing)).toEqual(offline);

    const noTitles = stockDeps({
      listStock: vi.fn(async () => ok([stockCopy])),
      listFlagged: vi.fn(async () => ok([])),
    });
    vi.mocked(noTitles.titles.getMany).mockResolvedValue(offline);
    expect(await loadInStockSummary(noTitles)).toEqual(offline);
    expect(await loadInStockCopiesOfTitle(noTitles, TITLE)).toEqual(offline);
    expect(await loadFlaggedCopies(noTitles)).toEqual(offline);
  });
});

describe('loadCopiesListData (HU-INV-04)', () => {
  const listCopy = {
    id: COPY,
    titleId: TITLE,
    number: 1,
    status: 'in_stock' as const,
    customerId: null,
    agreedPrice: null,
    publicPriceSnapshot: 75_000,
    receivedAt: localDate('2026-11-01'),
    soldAt: null,
    deletedAt: null,
  };
  const customersWith = (listRefs: CustomerRepository['listRefs']): CustomerRepository =>
    fakeCustomerRepository({ listRefs: vi.fn(listRefs) });
  const ref = { id: 'c1', name: 'Gloria', avatarEmoji: null };

  it('trae ejemplares, sus títulos (también desactivados) y los clientes', async () => {
    const deps = {
      ...stockDeps({ listAll: vi.fn(async () => ok([listCopy])) }),
      customers: customersWith(async () => ok([ref])),
    };
    expect(await loadCopiesListData(deps)).toEqual(
      ok({ copies: [listCopy], titles: [aTitle], customers: [ref] }),
    );
    expect(deps.titles.getMany).toHaveBeenCalledWith([TITLE]);
  });

  it('cualquier lectura que falle devuelve su error', async () => {
    const failingCopies = {
      ...stockDeps({ listAll: vi.fn(async () => offline) }),
      customers: customersWith(async () => ok([])),
    };
    expect(await loadCopiesListData(failingCopies)).toEqual(offline);
    const failingCustomers = {
      ...stockDeps({ listAll: vi.fn(async () => ok([])) }),
      customers: customersWith(async () => offline),
    };
    expect(await loadCopiesListData(failingCustomers)).toEqual(offline);
    const failingTitles = {
      ...stockDeps({ listAll: vi.fn(async () => ok([listCopy])) }),
      customers: customersWith(async () => ok([])),
    };
    vi.mocked(failingTitles.titles.getMany).mockResolvedValue(offline);
    expect(await loadCopiesListData(failingTitles)).toEqual(offline);
  });
});
