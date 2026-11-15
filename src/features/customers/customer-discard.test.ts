import { describe, expect, it, vi } from 'vitest';
import { appError } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import { fakeConnectivity } from '../../../tests/support/fake-connectivity';
import { fakeCustomerRepository } from '../../../tests/support/fake-repositories';
import { discardNewCustomer, getDiscardSummary } from './use-cases/customer-discard';

const summary = { books: 2, payments: 1, invoices: 0, photos: 1, blockedByDeposit: false };

const depsWith = (online = true) => ({
  connectivity: fakeConnectivity(online),
  customers: fakeCustomerRepository({
    getDiscardSummary: vi.fn(async () => ok(summary)),
    discardNew: vi.fn(async () => ok(undefined)),
  }),
});

describe('descartar un cliente recién creado (HU-CLI-03)', () => {
  it('CA-1: el resumen trae las cantidades de lo que se perderá', async () => {
    const deps = depsWith();
    expect(await getDiscardSummary(deps, 'c1')).toEqual(ok(summary));
    expect(deps.customers.getDiscardSummary).toHaveBeenCalledWith('c1');
  });

  it('CA-2: descartar llama a la base una vez', async () => {
    const deps = depsWith();
    expect(await discardNewCustomer(deps, 'c1')).toEqual(ok(undefined));
    expect(deps.customers.discardNew).toHaveBeenCalledWith('c1');
  });

  it('CA-3 / R1: CUSTOMER_DISCARD_BLOCKED y NOT_FOUND (descartar dos veces) pasan tal cual', async () => {
    const deps = depsWith();
    vi.mocked(deps.customers.discardNew).mockResolvedValueOnce(err(appError('CUSTOMER_DISCARD_BLOCKED')));
    expect(await discardNewCustomer(deps, 'c1')).toEqual(err(appError('CUSTOMER_DISCARD_BLOCKED')));
    vi.mocked(deps.customers.discardNew).mockResolvedValueOnce(err(appError('NOT_FOUND')));
    expect(await discardNewCustomer(deps, 'c1')).toEqual(err(appError('NOT_FOUND')));
  });

  it('sin conexión → OFFLINE sin escribir', async () => {
    const deps = depsWith(false);
    expect(await discardNewCustomer(deps, 'c1')).toEqual(err(appError('OFFLINE')));
    expect(deps.customers.discardNew).not.toHaveBeenCalled();
  });
});
