// Lista de clientes (HU-CLI-04): lee una vez clientes, ejemplares vendidos (con su título) y abonos; las
// pestañas, el filtro y el orden se calculan en el teléfono con buildCustomerListView (sirve sin conexión).
import type { CustomerListAccountData, CustomerListCustomer } from '@/domain/customer-list';
import type { AppError } from '@/domain/shared/errors';
import { ok, type Result } from '@/domain/shared/result';
import type { CustomerRepository, TitleRepository } from '@/repositories';

export type CustomerListLoaded = {
  readonly customers: readonly CustomerListCustomer[];
  readonly accounts: readonly CustomerListAccountData[];
};

/** Carga todo lo de la lista. Errores: `NETWORK_ERROR`. */
export async function loadCustomerListData(deps: {
  readonly customers: CustomerRepository;
  readonly titles: TitleRepository;
}): Promise<Result<CustomerListLoaded, AppError>> {
  const data = await deps.customers.listForCustomerList();
  if (!data.ok) return data;
  // Títulos de los ejemplares vendidos, también los desactivados.
  const titles = await deps.titles.getMany([...new Set(data.value.soldCopies.map((c) => c.titleId))]);
  if (!titles.ok) return titles;
  const titleName = new Map(titles.value.map((t) => [t.id, t.name]));

  type Mutable = {
    customerId: string;
    soldCopies: CustomerListAccountData['soldCopies'][number][];
    payments: CustomerListAccountData['payments'][number][];
  };
  const byCustomer = new Map<string, Mutable>();
  const entry = (customerId: string) => {
    let found = byCustomer.get(customerId);
    if (!found) {
      found = { customerId, soldCopies: [], payments: [] };
      byCustomer.set(customerId, found);
    }
    return found;
  };
  for (const copy of data.value.soldCopies) {
    entry(copy.customerId).soldCopies.push({
      copyId: copy.copyId,
      agreedPrice: copy.agreedPrice,
      soldAt: copy.soldAt,
      titleName: titleName.get(copy.titleId) ?? '',
    });
  }
  for (const { customerId, ...payment } of data.value.payments) entry(customerId).payments.push(payment);

  return ok({
    customers: data.value.customers,
    accounts: [...byCustomer.values()],
  });
}
