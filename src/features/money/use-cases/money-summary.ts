// Resumen de Dinero (HU-DIN-02): abonos, Abibonos y lo sin programar de cada cliente, calculados en el teléfono.
import { computeCustomerAccount } from '@/domain/customer';
import {
  computeMoneySummary,
  unscheduledCustomersList,
  type MoneySummary,
  type UnscheduledCustomer,
} from '@/domain/money-summary';
import type { MoneyDeposit } from '@/domain/deposit-draft';
import type { ListPayment } from '@/domain/payments-list';
import type { AppError } from '@/domain/shared/errors';
import { ok, type Result } from '@/domain/shared/result';
import type { LocalDate } from '@/domain/time';
import type { CustomerRepository, MoneyRepository, TitleRepository } from '@/repositories';
import { loadCustomerListData, type CustomerListLoaded } from '../../customers/use-cases/customer-list';

export type MoneySummaryData = {
  /** Abonos de clientes no borrados (incluidos archivados), también cancelados. */
  readonly payments: readonly ListPayment[];
  readonly deposits: readonly MoneyDeposit[];
  readonly customers: CustomerListLoaded;
};

/**
 * Lee una vez abonos, Abibonos y la cuenta de cada cliente. Los abonos de clientes descartados no cuentan
 * (R6): solo entran los de clientes no borrados (incluidos archivados). Errores: `NETWORK_ERROR`.
 */
export async function loadMoneySummaryData(deps: {
  readonly money: MoneyRepository;
  readonly customers: CustomerRepository;
  readonly titles: TitleRepository;
}): Promise<Result<MoneySummaryData, AppError>> {
  const [payments, deposits, customers] = await Promise.all([
    deps.money.listPayments(),
    deps.money.listSummaryDeposits(),
    loadCustomerListData(deps),
  ]);
  if (!payments.ok) return payments;
  if (!deposits.ok) return deposits;
  if (!customers.ok) return customers;
  const alive = new Set(customers.value.customers.map((c) => c.id));
  return ok({
    payments: payments.value.filter((p) => alive.has(p.customerId)),
    deposits: deposits.value,
    customers: customers.value,
  });
}

/** Lo sin programar de cada cliente, con su nombre (de su cuenta, HU-CLI-01). */
const unscheduledByCustomer = (data: MoneySummaryData, today: LocalDate): UnscheduledCustomer[] => {
  const accountOf = new Map(data.customers.accounts.map((a) => [a.customerId, a]));
  return data.customers.customers.map((c) => {
    const account = accountOf.get(c.id);
    return {
      customerId: c.id,
      name: c.name,
      avatarEmoji: c.avatarEmoji,
      unscheduled: computeCustomerAccount(
        {
          customer: { createdAt: c.createdAt },
          soldCopies: account?.soldCopies ?? [],
          payments: account?.payments ?? [],
        },
        today,
      ).unscheduled,
    };
  });
};

/** El resumen de la tarjeta de Dinero. */
export const moneySummaryFrom = (data: MoneySummaryData, today: LocalDate): MoneySummary =>
  computeMoneySummary(
    data.payments,
    unscheduledByCustomer(data, today).map((c) => c.unscheduled),
    data.deposits,
  );

/** "Sin programar · N clientes", por monto descendente. */
export const unscheduledCustomersFrom = (data: MoneySummaryData, today: LocalDate): UnscheduledCustomer[] =>
  unscheduledCustomersList(unscheduledByCustomer(data, today));
