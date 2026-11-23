// Ficha del cliente: una sola lectura lista para pintar (HU-CLI-12, BR-CUS-04/06/10/12/13/15/17,
// BR-PAY-05/06/08/10/13/14). Fotos y facturas (con URL firmadas) las agrega el caso de uso.
import { priceDelta } from './copy';
import { computeCustomerAccount, type CustomerAccount } from './customer';
import { isApproximate, mapsLinkFor } from './customer-location';
import type { COP } from './money';
import { isOverdue, overdueDays, type Payment, type PaymentStatus } from './payment';
import { compareIds } from './text';
import type { Instant, LocalDate } from './time';
import type { TitleCategory } from './title';

export type CustomerDetailInput = {
  readonly customer: {
    readonly id: string;
    readonly name: string;
    readonly avatarEmoji: string | null;
    readonly phone: string | null;
    readonly info: string | null;
    readonly address: string | null;
    readonly mapsUrl: string | null;
    readonly latitude: number | null;
    readonly longitude: number | null;
    readonly accuracyMeters: number | null;
    readonly archived: boolean;
    readonly createdAt: Instant;
  };
  /** Ejemplares vendidos (no borrados) con su título. */
  readonly soldCopies: readonly {
    readonly copyId: string;
    readonly titleName: string;
    /** Portada del título (#53); `null` sin portada. */
    readonly titleImageUrl?: string | null;
    readonly category: TitleCategory;
    readonly number: number;
    readonly agreedPrice: COP;
    readonly publicPriceSnapshot: COP | null;
    readonly soldAt: Instant;
  }[];
  /** Abonos no borrados, también cancelados, con su Abibono y cuántas prórrogas tuvieron. */
  readonly payments: readonly (Payment & {
    readonly deposit: { readonly id: string; readonly status: 'draft' | 'confirmed' } | null;
    readonly rescheduleCount: number;
  })[];
};

export type PaymentRow = {
  readonly paymentId: string;
  readonly kind: Payment['kind'];
  readonly status: PaymentStatus;
  readonly agreedAmount: COP | null;
  readonly dueDate: LocalDate | null;
  /** R4: solo si una prórroga cambió la fecha (el front la muestra tachada). */
  readonly originalDueDate: LocalDate | null;
  readonly paidAmount: COP | null;
  readonly paidAt: LocalDate | null;
  readonly method: Payment['method'];
  readonly cancelReason: Payment['cancelReason'];
  readonly isOverdue: boolean;
  readonly overdueDays: number;
  readonly rescheduleCount: number;
  readonly deposit: { readonly id: string; readonly status: 'draft' | 'confirmed' } | null;
  readonly can: {
    readonly collect: boolean;
    readonly edit: boolean;
    readonly delete: boolean;
    readonly reschedule: boolean;
    readonly correctDate: boolean;
    readonly cancel: boolean;
  };
};

export type CustomerDetail = {
  readonly id: string;
  readonly name: string;
  readonly avatarEmoji: string | null;
  readonly archived: boolean;
  readonly createdAt: Instant;
  readonly contact: {
    readonly phone: string;
    readonly telLink: string;
    readonly whatsappLink: string;
  } | null;
  readonly account: CustomerAccount;
  readonly customerSince: LocalDate;
  readonly firstSaleAt: Instant | null;
  readonly lastSaleAt: Instant | null;
  readonly books: readonly {
    readonly copyId: string;
    readonly titleName: string;
    /** Portada del título (#53); sin valor, el cuadro de libro. */
    readonly titleImageUrl?: string | null;
    readonly number: number;
    readonly agreedPrice: COP;
    readonly publicPriceSnapshot: COP | null;
    readonly priceDelta: COP | null;
    readonly soldAt: Instant;
  }[];
  readonly payments: readonly PaymentRow[];
  readonly canceledPayments: readonly PaymentRow[];
  readonly notices: { readonly noBook: boolean; readonly excess: { readonly amount: COP } | null };
  readonly address: string | null;
  readonly info: string | null;
  readonly mapsUrl: string | null;
  readonly location: {
    readonly latitude: number;
    readonly longitude: number;
    readonly accuracyMeters: number | null;
    readonly isApproximate: boolean;
  } | null;
  readonly mapsLink: string | null;
};

/**
 * R1 (BR-CUS-12, AF-73): `tel:<dígitos>` y WhatsApp con indicativo de Colombia (57) si el número trae 10
 * dígitos, o tal cual si ya trae el indicativo. Sin teléfono (o sin dígitos), `null`: no hay botones.
 */
export const contactLinks = (phone: string | null): CustomerDetail['contact'] => {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (!digits) return null;
  return {
    phone: phone!.trim(),
    telLink: `tel:${digits}`,
    whatsappLink: `https://wa.me/${digits.length === 10 ? `57${digits}` : digits}`,
  };
};

/** R2, R3: qué se puede hacer con cada abono. */
const paymentActions = (status: PaymentStatus, archived: boolean): PaymentRow['can'] => {
  // Por cobrar: todo, salvo que el cliente esté archivado (sus funciones lo rechazan con CUSTOMER_ARCHIVED).
  if (status === 'scheduled') {
    const open = !archived;
    return { collect: open, edit: open, delete: open, reschedule: open, correctDate: open, cancel: open };
  }
  // Cobrado (aún no entregado): se corrige o borra, también de un cliente archivado (AF-47).
  const correctable = status === 'collected';
  return {
    collect: false,
    edit: correctable,
    delete: correctable,
    reschedule: false,
    correctDate: false,
    cancel: false,
  };
};

/** Fecha de orden: la real si ya se cobró; si no, la acordada (BR-CUS-10). Sin fecha (no debería pasar) va primero. */
const sortDate = (p: Payment): string =>
  (p.status === 'collected' || p.status === 'delivered' ? p.paidAt : p.dueDate) ?? '';

const byDate = (a: Payment, b: Payment): number => {
  const x = sortDate(a);
  const y = sortDate(b);
  return (
    (x < y ? -1 : x > y ? 1 : 0) || a.createdAt.getTime() - b.createdAt.getTime() || compareIds(a.id, b.id)
  );
};

/** Arma la ficha: cuenta derivada (HU-CLI-01), libros, abonos con indicadores, avisos y ubicación. */
export const buildCustomerDetail = (input: CustomerDetailInput, today: LocalDate): CustomerDetail => {
  const { customer } = input;
  const account = computeCustomerAccount(
    { customer: { createdAt: customer.createdAt }, soldCopies: input.soldCopies, payments: input.payments },
    today,
  );

  const row = (p: CustomerDetailInput['payments'][number]): PaymentRow => ({
    paymentId: p.id,
    kind: p.kind,
    status: p.status,
    agreedAmount: p.agreedAmount,
    dueDate: p.dueDate,
    originalDueDate: p.originalDueDate !== null && p.originalDueDate !== p.dueDate ? p.originalDueDate : null,
    paidAmount: p.paidAmount,
    paidAt: p.paidAt,
    method: p.method,
    cancelReason: p.cancelReason,
    isOverdue: isOverdue(p, today),
    overdueDays: overdueDays(p, today),
    rescheduleCount: p.rescheduleCount,
    deposit: p.deposit,
    can: paymentActions(p.status, customer.archived),
  });
  const sorted = [...input.payments].sort(byDate);

  const books = [...input.soldCopies]
    .sort((a, b) => a.soldAt.getTime() - b.soldAt.getTime() || compareIds(a.copyId, b.copyId))
    .map((c) => ({
      copyId: c.copyId,
      titleName: c.titleName,
      titleImageUrl: c.titleImageUrl ?? null,
      number: c.number,
      agreedPrice: c.agreedPrice,
      publicPriceSnapshot: c.publicPriceSnapshot,
      priceDelta: priceDelta({ status: 'sold', ...c }),
      soldAt: c.soldAt,
    }));

  const hasLocation = customer.latitude !== null && customer.longitude !== null;
  return {
    id: customer.id,
    name: customer.name,
    avatarEmoji: customer.avatarEmoji,
    archived: customer.archived,
    createdAt: customer.createdAt,
    contact: contactLinks(customer.phone),
    account,
    customerSince: account.customerSince,
    firstSaleAt: account.firstSaleAt,
    lastSaleAt: account.lastSaleAt,
    books,
    payments: sorted.filter((p) => p.status !== 'canceled').map(row),
    canceledPayments: sorted.filter((p) => p.status === 'canceled').map(row),
    // R5: derivados de la cuenta; "Dejar como está" no guarda nada, así que la franja sigue mientras haya sobrante.
    notices: {
      noBook: account.notices.noBook,
      excess: account.excess > 0 ? { amount: account.excess } : null,
    },
    address: customer.address,
    info: customer.info,
    mapsUrl: customer.mapsUrl,
    location: hasLocation
      ? {
          latitude: customer.latitude!,
          longitude: customer.longitude!,
          accuracyMeters: customer.accuracyMeters,
          isApproximate: isApproximate(customer.accuracyMeters),
        }
      : null,
    mapsLink: mapsLinkFor(customer),
  };
};
