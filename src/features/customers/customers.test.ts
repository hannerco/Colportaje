import { describe, expect, it, vi } from 'vitest';
import { appError } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import type { CustomerRepository } from '@/repositories';
import { fakeConnectivity } from '../../../tests/support/fake-connectivity';
import { createCustomer, loadPossibleDuplicates, updateCustomer } from './use-cases/customer-data';

const ID = '30000000-0000-4000-8000-000000000001';

const fakeCustomers = (overrides: Partial<CustomerRepository> = {}): CustomerRepository => ({
  getAccountData: vi.fn(),
  create: vi.fn(async ({ id }: { id: string }) => ok({ id })),
  update: vi.fn(async () => ok(undefined)),
  listRefs: vi.fn(),
  listDuplicateCandidates: vi.fn(async () =>
    ok([{ id: 'c1', name: 'María Gómez', phone: '3125551234', archived: false }]),
  ),
  ...overrides,
});

describe('createCustomer (HU-CLI-02)', () => {
  it('crea con el nombre recortado', async () => {
    const customers = fakeCustomers();
    const result = await createCustomer(
      { customers, connectivity: fakeConnectivity() },
      { id: ID, name: ' Natalia ' },
    );
    expect(result).toEqual(ok({ id: ID }));
    expect(customers.create).toHaveBeenCalledWith({ id: ID, name: 'Natalia' });
  });

  it('CA-2 / AF-108: sin nombre no se crea nada', async () => {
    const customers = fakeCustomers();
    const result = await createCustomer(
      { customers, connectivity: fakeConnectivity() },
      { id: ID, name: '   ' },
    );
    expect(result).toMatchObject({ ok: false, error: { code: 'VALIDATION', details: { field: 'name' } } });
    expect(customers.create).not.toHaveBeenCalled();
  });

  it('sin conexión → OFFLINE sin escribir (BR-CUS-14)', async () => {
    const customers = fakeCustomers();
    expect(
      await createCustomer({ customers, connectivity: fakeConnectivity(false) }, { id: ID, name: 'Natalia' }),
    ).toEqual(err(appError('OFFLINE')));
    expect(customers.create).not.toHaveBeenCalled();
  });
});

describe('updateCustomer (HU-CLI-02)', () => {
  it('guarda solo el parche validado', async () => {
    const customers = fakeCustomers();
    expect(
      await updateCustomer({ customers, connectivity: fakeConnectivity() }, ID, {
        phone: '312 448 0917',
        info: ' ',
      }),
    ).toEqual(ok(undefined));
    expect(customers.update).toHaveBeenCalledWith(ID, { phone: '312 448 0917', info: null });
  });

  it('un dato inválido no llega a la base; un parche vacío no escribe', async () => {
    const customers = fakeCustomers();
    const deps = { customers, connectivity: fakeConnectivity() };
    expect(await updateCustomer(deps, ID, { avatarEmoji: 'ab' })).toMatchObject({
      ok: false,
      error: { details: { field: 'avatarEmoji' } },
    });
    expect(await updateCustomer(deps, ID, {})).toEqual(ok(undefined));
    expect(customers.update).not.toHaveBeenCalled();
  });

  it('los errores de la base pasan tal cual (CUSTOMER_ARCHIVED)', async () => {
    const customers = fakeCustomers({ update: vi.fn(async () => err(appError('CUSTOMER_ARCHIVED'))) });
    expect(
      await updateCustomer({ customers, connectivity: fakeConnectivity() }, ID, { name: 'Otra' }),
    ).toEqual(err(appError('CUSTOMER_ARCHIVED')));
  });
});

describe('loadPossibleDuplicates (BR-CUS-11)', () => {
  it('CA-6: compara con los clientes del usuario', async () => {
    const result = await loadPossibleDuplicates(
      { customers: fakeCustomers() },
      { phone: '+57 312 555 1234' },
    );
    expect(result).toEqual(
      ok([{ id: 'c1', name: 'María Gómez', phone: '3125551234', archived: false, reason: 'phone' }]),
    );
  });

  it('un fallo al leer pasa tal cual', async () => {
    const customers = fakeCustomers({
      listDuplicateCandidates: vi.fn(async () => err(appError('NETWORK_ERROR'))),
    });
    expect(await loadPossibleDuplicates({ customers }, { name: 'x' })).toEqual(
      err(appError('NETWORK_ERROR')),
    );
  });
});
