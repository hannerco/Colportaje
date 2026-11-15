// Agregar, quitar y devolver libros en la ficha (HU-CLI-09, HU-CLI-10, BR-COPY-06/09, AF-01..AF-12, AF-114).
import { computeCustomerAccount, type CustomerAccount } from '@/domain/customer';
import { evaluateScheduleExcess, scheduledForExcess, type ExcessEvaluation } from '@/domain/schedule-excess';
import type { AppError } from '@/domain/shared/errors';
import { ok, type Result } from '@/domain/shared/result';
import { todayBogota, type Clock } from '@/domain/time';
import type { Title } from '@/domain/title';
import type { CopiesListCopy } from '@/domain/copies-list';
import type { Connectivity, CopyRepository, CustomerRepository, TitleRepository } from '@/repositories';
import { runMutation } from '../../shared/run-mutation';

export type CustomerBooksDeps = {
  readonly copies: CopyRepository;
  readonly customers: CustomerRepository;
  readonly connectivity: Connectivity;
  readonly clock: Clock;
};

/** Datos del buscador de asignables: ejemplares no eliminados y sus títulos. */
export async function loadAssignableData(deps: {
  readonly copies: CopyRepository;
  readonly titles: TitleRepository;
}): Promise<Result<{ copies: CopiesListCopy[]; titles: Title[] }, AppError>> {
  const copies = await deps.copies.listAll();
  if (!copies.ok) return copies;
  const inStockTitles = [
    ...new Set(copies.value.filter((c) => c.status === 'in_stock').map((c) => c.titleId)),
  ];
  const titles = await deps.titles.getMany(inStockTitles);
  if (!titles.ok) return titles;
  return ok({ copies: copies.value, titles: titles.value });
}

const accountOf = async (
  deps: CustomerBooksDeps,
  customerId: string,
): Promise<
  Result<{ account: CustomerAccount; data: Parameters<typeof scheduledForExcess>[0] }, AppError>
> => {
  const data = await deps.customers.getAccountData(customerId);
  if (!data.ok) return data;
  return ok({
    account: computeCustomerAccount(data.value, todayBogota(deps.clock)),
    data: data.value.payments,
  });
};

/**
 * Agrega (vende) un ejemplar en físico al cliente por su precio público copiado (R1, R2). Agregar nunca
 * genera sobrante: la deuda sube. Errores: `OFFLINE`, `COPY_NOT_IN_STOCK`, `COPY_IS_MINIBOOK`,
 * `CUSTOMER_ARCHIVED`, `NOT_FOUND`, `NETWORK_ERROR`.
 */
export async function assignCopyToCustomer(
  deps: CustomerBooksDeps,
  copyId: string,
  customerId: string,
): Promise<Result<{ account: CustomerAccount }, AppError>> {
  return runMutation(deps.connectivity, async () => {
    const assigned = await deps.copies.assignToCustomer(copyId, customerId);
    if (!assigned.ok) return assigned;
    const account = await accountOf(deps, customerId);
    if (!account.ok) return account;
    return ok({ account: account.value.account });
  });
}

/**
 * Quita un libro mientras se crea el cliente: error de captura, sin motivo ni modal (R4, AF-114). Trae la
 * evaluación de abonos que no cuadran con disparador `form_edit` (franja, nunca modal; R5).
 * Errores: `OFFLINE`, `COPY_NOT_SOLD`, `NOT_FOUND`, `NETWORK_ERROR`.
 */
export async function removeCopyDuringCreation(
  deps: CustomerBooksDeps,
  copyId: string,
): Promise<Result<{ account: CustomerAccount; excess: ExcessEvaluation | null }, AppError>> {
  return runMutation(deps.connectivity, async () => {
    const removed = await deps.copies.returnFromCustomer(copyId, 'wrong_registration');
    if (!removed.ok) return removed;
    const account = await accountOf(deps, removed.value.customerId);
    if (!account.ok) return account;
    return ok({
      account: account.value.account,
      excess: evaluateScheduleExcess(
        account.value.account,
        scheduledForExcess(account.value.data),
        'form_edit',
      ),
    });
  });
}

/**
 * Devuelve un libro de un cliente ya guardado (HU-CLI-10, BR-COPY-09): `customer_returned` (por defecto en
 * la app) o `wrong_registration` (me equivoqué; no cuenta como devolución). Los abonos cobrados o entregados
 * y los Abibonos no cambian; lo pagado de más queda como saldo a favor (ADR-0025). Trae la evaluación con
 * disparador `return` (modal, del más lejano, `book_returned`; R4) y si el cliente quedó como prospecto.
 * Errores: `OFFLINE`, `COPY_NOT_SOLD`, `COPY_IS_MINIBOOK`, `NOT_FOUND`, `NETWORK_ERROR`.
 */
export async function returnCopyFromCustomer(
  deps: CustomerBooksDeps,
  copyId: string,
  reason: 'customer_returned' | 'wrong_registration',
): Promise<
  Result<{ account: CustomerAccount; becameProspect: boolean; excess: ExcessEvaluation | null }, AppError>
> {
  return runMutation(deps.connectivity, async () => {
    const returned = await deps.copies.returnFromCustomer(copyId, reason);
    if (!returned.ok) return returned;
    const account = await accountOf(deps, returned.value.customerId);
    if (!account.ok) return account;
    return ok({
      account: account.value.account,
      // Antes tenía al menos este libro: si ya no le queda ninguno, acaba de volverse prospecto (AF-01, AF-09).
      becameProspect: account.value.account.isProspect,
      excess: evaluateScheduleExcess(account.value.account, scheduledForExcess(account.value.data), 'return'),
    });
  });
}
