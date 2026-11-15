// Ficha del cliente (HU-CLI-12): una sola lectura con todo lo de la épica, lista para pintar.
import { buildCustomerDetail, type CustomerDetail } from '@/domain/customer-detail';
import type { AppError } from '@/domain/shared/errors';
import { ok, type Result } from '@/domain/shared/result';
import { todayBogota, type Clock } from '@/domain/time';
import type {
  CustomerRepository,
  InvoiceRepository,
  PhotoRepository,
  StorageRepository,
} from '@/repositories';
import { listCustomerInvoices, type CustomerInvoice } from './customer-invoices';
import { listCustomerInfoPhotos, type CustomerInfoPhoto } from './customer-photos';

export type CustomerDetailDeps = {
  readonly customers: CustomerRepository;
  readonly photos: PhotoRepository;
  readonly invoices: InvoiceRepository;
  readonly storage: StorageRepository;
  readonly clock: Clock;
};

export type CustomerDetailView = CustomerDetail & {
  readonly infoPhotos: readonly CustomerInfoPhoto[];
  readonly invoices: readonly CustomerInvoice[];
};

/**
 * La ficha completa: datos, cuenta, libros, abonos con sus acciones, avisos, ubicación, fotos de información y
 * facturas (con miniaturas firmadas). Errores: `NOT_FOUND` (inexistente, ajeno o descartado), `NETWORK_ERROR`.
 */
export async function loadCustomerDetail(
  deps: CustomerDetailDeps,
  customerId: string,
): Promise<Result<CustomerDetailView, AppError>> {
  const data = await deps.customers.getDetailData(customerId);
  if (!data.ok) return data;
  const [infoPhotos, invoices] = await Promise.all([
    listCustomerInfoPhotos(deps, customerId),
    listCustomerInvoices(deps, customerId),
  ]);
  if (!infoPhotos.ok) return infoPhotos;
  if (!invoices.ok) return invoices;
  return ok({
    ...buildCustomerDetail(data.value, todayBogota(deps.clock)),
    infoPhotos: infoPhotos.value,
    invoices: invoices.value,
  });
}
