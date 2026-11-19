import { describe, expect, it, vi } from 'vitest';
import type { Payment } from '@/domain/payment';
import { appError } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import { fixedClock, localDate } from '@/domain/time';
import type { CustomerAccountData } from '@/repositories';
import { fakeConnectivity } from '../../../tests/support/fake-connectivity';
import {
  fakeCopyRepository,
  fakeCustomerRepository,
  fakeTitleRepository,
} from '../../../tests/support/fake-repositories';
import {
  assignCopyToCustomer,
  loadAssignableData,
  removeCopyDuringCreation,
  returnCopyFromCustomer,
  updateSoldAt,
} from './use-cases/customer-books';

const CUSTOMER = 'c-natalia';
const clock = fixedClock('2026-11-08T15:00:00Z');

const scheduled = (id: string, amount: number, due: string): Payment => ({
  id,
  customerId: CUSTOMER,
  kind: 'scheduled',
  status: 'scheduled',
  originalDueDate: localDate(due),
  dueDate: localDate(due),
  paidAt: null,
  agreedAmount: amount,
  paidAmount: null,
  method: null,
  canceledAt: null,
  cancelReason: null,
  createdAt: new Date('2026-11-01T15:00:00Z'),
});

const accountData = (debt: number, payments: Payment[] = []): CustomerAccountData => ({
  customer: { createdAt: new Date('2026-11-01T15:00:00Z') },
  soldCopies: debt > 0 ? [{ agreedPrice: debt, soldAt: new Date('2026-11-01T15:00:00Z') }] : [],
  payments,
});

const depsWith = (data: CustomerAccountData, online = true) => ({
  copies: fakeCopyRepository({
    assignToCustomer: vi.fn(async () => ok(undefined)),
    returnFromCustomer: vi.fn(async () => ok({ customerId: CUSTOMER })),
    updateSoldAt: vi.fn(async () => ok({ customerId: CUSTOMER })),
  }),
  customers: fakeCustomerRepository({ getAccountData: vi.fn(async () => ok(data)) }),
  connectivity: fakeConnectivity(online),
  clock,
});

describe('assignCopyToCustomer (HU-CLI-09)', () => {
  it('CA-3: devuelve la cuenta recalculada (deuda 95.000)', async () => {
    const deps = depsWith(accountData(95_000));
    const result = await assignCopyToCustomer(deps, 'copy-22', CUSTOMER);
    expect(deps.copies.assignToCustomer).toHaveBeenCalledWith('copy-22', CUSTOMER, undefined);
    expect(result.ok && result.value.account).toMatchObject({ debt: 95_000, isProspect: false });
  });

  it('sin conexión → OFFLINE sin escribir; los errores de la base pasan tal cual', async () => {
    const offline = depsWith(accountData(0), false);
    expect(await assignCopyToCustomer(offline, 'copy-22', CUSTOMER)).toEqual(err(appError('OFFLINE')));
    expect(offline.copies.assignToCustomer).not.toHaveBeenCalled();

    const busy = depsWith(accountData(0));
    vi.mocked(busy.copies.assignToCustomer).mockResolvedValue(err(appError('COPY_NOT_IN_STOCK')));
    expect(await assignCopyToCustomer(busy, 'copy-22', CUSTOMER)).toEqual(err(appError('COPY_NOT_IN_STOCK')));
    expect(busy.customers.getAccountData).not.toHaveBeenCalled();

    const unreadable = depsWith(accountData(0));
    vi.mocked(unreadable.customers.getAccountData).mockResolvedValue(err(appError('NETWORK_ERROR')));
    expect(await assignCopyToCustomer(unreadable, 'copy-22', CUSTOMER)).toEqual(
      err(appError('NETWORK_ERROR')),
    );
  });
});

describe('removeCopyDuringCreation (HU-CLI-09, AF-114)', () => {
  it('CA-4: devuelve la cuenta sin el libro y sin sobrante', async () => {
    const deps = depsWith(accountData(0));
    const result = await removeCopyDuringCreation(deps, 'copy-22');
    expect(deps.copies.returnFromCustomer).toHaveBeenCalledWith('copy-22', 'wrong_registration');
    expect(result).toEqual(ok({ account: expect.objectContaining({ debt: 0 }), excess: null }));
  });

  it('CA-5: queda 95.000 de deuda y 140.000 programados → franja, más lejano, sobrante 45.000', async () => {
    const deps = depsWith(
      accountData(95_000, [scheduled('p1', 70_000, '2026-11-15'), scheduled('p2', 70_000, '2026-11-30')]),
    );
    const result = await removeCopyDuringCreation(deps, 'copy-85');
    expect(result.ok && result.value.excess).toMatchObject({
      trigger: 'form_edit',
      presentation: 'banner',
      suggestedOrder: 'farthest',
      excess: 45_000,
      suggestedPlan: [{ paymentId: 'p2', action: 'reduce', newAmount: 25_000 }],
    });
  });

  it('errores: COPY_NOT_SOLD de la base y fallos al releer la cuenta pasan tal cual', async () => {
    const notSold = depsWith(accountData(0));
    vi.mocked(notSold.copies.returnFromCustomer).mockResolvedValue(err(appError('COPY_NOT_SOLD')));
    expect(await removeCopyDuringCreation(notSold, 'copy-22')).toEqual(err(appError('COPY_NOT_SOLD')));
    const unreadable = depsWith(accountData(0));
    vi.mocked(unreadable.customers.getAccountData).mockResolvedValue(err(appError('NETWORK_ERROR')));
    expect(await removeCopyDuringCreation(unreadable, 'copy-22')).toEqual(err(appError('NETWORK_ERROR')));
  });
});

describe('returnCopyFromCustomer (HU-CLI-10)', () => {
  const collected = (id: string, amount: number): Payment => ({
    ...scheduled(id, amount, '2026-11-01'),
    kind: 'extra',
    status: 'collected',
    originalDueDate: null,
    dueDate: null,
    paidAt: localDate('2026-11-01'),
    agreedAmount: null,
    paidAmount: amount,
    method: 'cash',
  });

  it('CA-1: sin libros ni abonos → deuda 0 y becameProspect; pasa el motivo elegido', async () => {
    const deps = depsWith(accountData(0));
    const result = await returnCopyFromCustomer(deps, 'copy-1', 'customer_returned');
    expect(deps.copies.returnFromCustomer).toHaveBeenCalledWith('copy-1', 'customer_returned');
    expect(result).toEqual(
      ok({ account: expect.objectContaining({ debt: 0 }), becameProspect: true, excess: null }),
    );
  });

  it('CA-2: con 30.000 cobrados queda saldo a favor de 30.000', async () => {
    const deps = depsWith(accountData(0, [collected('p1', 30_000)]));
    const result = await returnCopyFromCustomer(deps, 'copy-1', 'wrong_registration');
    expect(result.ok && result.value.account).toMatchObject({ balance: -30_000, credit: 30_000 });
  });

  it('CA-5 / R4: saldo 10.000 y 3 programados de 10.000 → modal, más lejano, sobrante 20.000', async () => {
    const deps = depsWith(
      accountData(10_000, [
        scheduled('p1', 10_000, '2026-11-15'),
        scheduled('p2', 10_000, '2026-11-30'),
        scheduled('p3', 10_000, '2026-12-15'),
      ]),
    );
    const result = await returnCopyFromCustomer(deps, 'copy-1', 'customer_returned');
    expect(result.ok && result.value.becameProspect).toBe(false);
    expect(result.ok && result.value.excess).toMatchObject({
      trigger: 'return',
      presentation: 'modal',
      suggestedOrder: 'farthest',
      excess: 20_000,
    });
  });

  it('errores de la base, al releer la cuenta y sin conexión', async () => {
    const minibook = depsWith(accountData(0));
    vi.mocked(minibook.copies.returnFromCustomer).mockResolvedValue(err(appError('COPY_IS_MINIBOOK')));
    expect(await returnCopyFromCustomer(minibook, 'm', 'customer_returned')).toEqual(
      err(appError('COPY_IS_MINIBOOK')),
    );
    const unreadable = depsWith(accountData(0));
    vi.mocked(unreadable.customers.getAccountData).mockResolvedValue(err(appError('NETWORK_ERROR')));
    expect(await returnCopyFromCustomer(unreadable, 'c', 'customer_returned')).toEqual(
      err(appError('NETWORK_ERROR')),
    );
    const offline = depsWith(accountData(0), false);
    expect(await returnCopyFromCustomer(offline, 'c', 'customer_returned')).toEqual(err(appError('OFFLINE')));
    expect(offline.copies.returnFromCustomer).not.toHaveBeenCalled();
  });
});

describe('loadAssignableData', () => {
  it('pide solo los títulos con ejemplares en físico', async () => {
    const copy = {
      id: 'c1',
      titleId: 't1',
      number: 1,
      status: 'in_stock' as const,
      customerId: null,
      agreedPrice: null,
      publicPriceSnapshot: 1,
      receivedAt: localDate('2026-11-01'),
      soldAt: null,
      deletedAt: null,
    };
    const copies = fakeCopyRepository({
      listAll: vi.fn(async () => ok([copy, { ...copy, id: 'c2', titleId: 't2', status: 'sold' as const }])),
    });
    const titles = fakeTitleRepository({ getMany: vi.fn(async () => ok([])) });
    expect(await loadAssignableData({ copies, titles })).toEqual(
      ok({ copies: [copy, expect.anything()], titles: [] }),
    );
    expect(titles.getMany).toHaveBeenCalledWith(['t1']);

    vi.mocked(titles.getMany).mockResolvedValue(err(appError('NETWORK_ERROR')));
    expect((await loadAssignableData({ copies, titles })).ok).toBe(false);
    vi.mocked(copies.listAll).mockResolvedValue(err(appError('NETWORK_ERROR')));
    expect((await loadAssignableData({ copies, titles })).ok).toBe(false);
  });
});

describe('fecha de venta (HU-CLI-13)', () => {
  it('R1: asignar con `soldOn` pasa la fecha al repositorio', async () => {
    const deps = depsWith(accountData(95_000));
    const result = await assignCopyToCustomer(deps, 'copy-22', CUSTOMER, { soldOn: localDate('2026-11-05') });
    expect(result.ok).toBe(true);
    expect(deps.copies.assignToCustomer).toHaveBeenCalledWith('copy-22', CUSTOMER, '2026-11-05');
  });

  it('CA-4: asignar con fecha futura da SOLD_IN_FUTURE sin llamar a la base', async () => {
    const deps = depsWith(accountData(95_000));
    expect(
      await assignCopyToCustomer(deps, 'copy-22', CUSTOMER, { soldOn: localDate('2026-11-09') }),
    ).toEqual(err(appError('SOLD_IN_FUTURE')));
    expect(deps.copies.assignToCustomer).not.toHaveBeenCalled();
  });

  it('CA-2: updateSoldAt cambia la fecha y devuelve la cuenta recalculada', async () => {
    const deps = depsWith(accountData(95_000));
    const result = await updateSoldAt(deps, 'copy-22', localDate('2026-11-03'));
    expect(deps.copies.updateSoldAt).toHaveBeenCalledWith('copy-22', '2026-11-03');
    expect(deps.customers.getAccountData).toHaveBeenCalledWith(CUSTOMER);
    expect(result.ok && result.value.account).toMatchObject({ debt: 95_000 });
  });

  it('updateSoldAt: futura da SOLD_IN_FUTURE y sin conexión OFFLINE, sin intentar', async () => {
    const deps = depsWith(accountData(95_000));
    expect(await updateSoldAt(deps, 'copy-22', localDate('2026-11-09'))).toEqual(
      err(appError('SOLD_IN_FUTURE')),
    );
    const offline = depsWith(accountData(95_000), false);
    expect(await updateSoldAt(offline, 'copy-22', localDate('2026-11-03'))).toEqual(err(appError('OFFLINE')));
    expect(deps.copies.updateSoldAt).not.toHaveBeenCalled();
    expect(offline.copies.updateSoldAt).not.toHaveBeenCalled();
  });

  it('CA-7: los errores de la base pasan tal cual (COPY_NOT_SOLD)', async () => {
    const deps = depsWith(accountData(95_000));
    deps.copies.updateSoldAt = vi.fn(async () => err(appError('COPY_NOT_SOLD')));
    expect(await updateSoldAt(deps, 'copy-22', localDate('2026-11-03'))).toEqual(
      err(appError('COPY_NOT_SOLD')),
    );
  });
});
