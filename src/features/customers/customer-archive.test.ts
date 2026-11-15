import { describe, expect, it, vi } from 'vitest';
import { appError } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import { localDate } from '@/domain/time';
import { fakeConnectivity } from '../../../tests/support/fake-connectivity';
import { fakeCustomerRepository } from '../../../tests/support/fake-repositories';
import { archiveCustomer, getArchivePreview, restoreCustomer } from './use-cases/customer-archive';

const depsWith = (online = true) => ({
  connectivity: fakeConnectivity(online),
  customers: fakeCustomerRepository({
    archive: vi.fn(async () => ok(undefined)),
    restore: vi.fn(async () => ok(undefined)),
    getAccountData: vi.fn(async () =>
      ok({
        customer: { createdAt: new Date('2026-10-01T15:00:00Z') },
        soldCopies: [],
        payments: [
          {
            id: 'p1',
            customerId: 'c1',
            kind: 'scheduled' as const,
            status: 'scheduled' as const,
            originalDueDate: localDate('2026-12-01'),
            dueDate: localDate('2026-12-01'),
            paidAt: null,
            agreedAmount: 50_000,
            paidAmount: null,
            method: null,
            canceledAt: null,
            cancelReason: null,
            createdAt: new Date('2026-10-01T15:00:00Z'),
          },
        ],
      }),
    ),
  }),
});

describe('archivar y restaurar (HU-CLI-11)', () => {
  it('vista previa con la cuenta del cliente; un fallo de lectura se devuelve', async () => {
    expect(await getArchivePreview(depsWith(), 'c1')).toEqual(
      ok({
        canArchive: true,
        soldCount: 0,
        scheduledToCancel: [{ paymentId: 'p1', dueDate: '2026-12-01', agreedAmount: 50_000 }],
      }),
    );
    const failing = depsWith();
    vi.mocked(failing.customers.getAccountData).mockResolvedValueOnce(err(appError('NOT_FOUND')));
    expect(await getArchivePreview(failing, 'c1')).toEqual(err(appError('NOT_FOUND')));
  });

  it('archivar y restaurar llaman a la base; sus errores pasan tal cual', async () => {
    const deps = depsWith();
    expect(await archiveCustomer(deps, 'c1')).toEqual(ok(undefined));
    expect(await restoreCustomer(deps, 'c1')).toEqual(ok(undefined));
    vi.mocked(deps.customers.archive).mockResolvedValueOnce(err(appError('CUSTOMER_HAS_BOOKS')));
    expect(await archiveCustomer(deps, 'c1')).toEqual(err(appError('CUSTOMER_HAS_BOOKS')));
    vi.mocked(deps.customers.restore).mockResolvedValueOnce(err(appError('CUSTOMER_NOT_ARCHIVED')));
    expect(await restoreCustomer(deps, 'c1')).toEqual(err(appError('CUSTOMER_NOT_ARCHIVED')));
  });

  it('sin conexión → OFFLINE sin escribir', async () => {
    const deps = depsWith(false);
    expect(await archiveCustomer(deps, 'c1')).toEqual(err(appError('OFFLINE')));
    expect(await restoreCustomer(deps, 'c1')).toEqual(err(appError('OFFLINE')));
    expect(deps.customers.archive).not.toHaveBeenCalled();
    expect(deps.customers.restore).not.toHaveBeenCalled();
  });
});
