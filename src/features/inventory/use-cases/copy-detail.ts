// Detalle de un ejemplar y cambio de su fecha de recibido (HU-INV-05).
import { buildCopyDetail, validateReceivedDate, type CopyDetail } from '@/domain/copy-detail';
import { appError, COMMON_ERROR_CODES, type AppError } from '@/domain/shared/errors';
import { err, ok, type Result } from '@/domain/shared/result';
import { todayBogota, type Clock, type LocalDate } from '@/domain/time';
import type { Connectivity, CopyRepository, CustomerRepository, TitleRepository } from '@/repositories';
import { runMutation } from '../../shared/run-mutation';

export type CopyDetailDeps = {
  readonly copies: CopyRepository;
  readonly titles: TitleRepository;
  readonly customers: CustomerRepository;
};

/** Errores: `NOT_FOUND` (no existe, no es del usuario o está eliminado), `NETWORK_ERROR`. */
export async function loadCopyDetail(
  deps: CopyDetailDeps,
  copyId: string,
): Promise<Result<CopyDetail, AppError>> {
  const [detail, history] = await Promise.all([
    deps.copies.getDetail(copyId),
    deps.copies.getHistory(copyId),
  ]);
  if (!detail.ok) return detail;
  if (!history.ok) return history;
  const { copy, openIssue } = detail.value;

  const titles = await deps.titles.getMany([copy.titleId]);
  if (!titles.ok) return titles;
  const [title] = titles.value;
  if (!title) return err(appError(COMMON_ERROR_CODES.NOT_FOUND));

  // El cliente actual y los que aparecen en el historial (vendido, devuelto…), con su nombre.
  const customerIds = [
    ...(copy.customerId ? [copy.customerId] : []),
    ...history.value.flatMap((e) => (e.data.customerId ? [e.data.customerId] : [])),
  ];
  const customers = await deps.customers.getRefs(customerIds);
  if (!customers.ok) return customers;

  return ok(buildCopyDetail({ copy, title, customers: customers.value, openIssue, events: history.value }));
}

export type UpdateReceivedDateDeps = {
  readonly copies: CopyRepository;
  readonly connectivity: Connectivity;
  readonly clock: Clock;
};

/**
 * Cambia la fecha de recibido (BR-COPY-04). La base vuelve a validar, también contra la fecha de venta.
 * Errores: `OFFLINE` (sin intentar), `DATE_IN_FUTURE`, `DATE_AFTER_SALE`, `NOT_FOUND`, `NETWORK_ERROR`.
 */
export async function updateReceivedDate(
  deps: UpdateReceivedDateDeps,
  copyId: string,
  date: LocalDate,
): Promise<Result<void, AppError>> {
  return runMutation(deps.connectivity, async () => {
    const valid = validateReceivedDate(date, todayBogota(deps.clock), null);
    if (!valid.ok) return valid;
    return deps.copies.updateReceivedDate(copyId, valid.value);
  });
}
