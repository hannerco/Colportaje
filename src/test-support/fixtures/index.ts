// Fábricas de datos de ejemplo para las stories de pantallas (HU-PAN-BASE-01, 00-REGLAS-COMUNES-FRONT §9).
// Tipadas con los modelos de vista del back: si el back cambia un campo, las stories dejan de compilar.
// Cada fábrica da un caso del diseño y acepta cambios parciales: `aCustomerListRow({ standing: 'overdue' })`.
// Solo datos ficticios (nunca de clientes reales). Cada HU de pantalla agrega las de sus detalles.
import type { Profile } from '@/domain/auth';
import type { CopiesListRow, CopiesListView } from '@/domain/copies-list';
import type { CustomerAccount } from '@/domain/customer';
import type { PaymentRow } from '@/domain/customer-detail';
import type { CustomerListRow, CustomerListView } from '@/domain/customer-list';
import type { DepositsListRow, DepositsListView } from '@/domain/deposits-list';
import type { InStockSummary, InStockTitle } from '@/domain/inventory';
import type { MoneySummary } from '@/domain/money-summary';
import type { PaymentsListRow, PaymentsListView } from '@/domain/payments-list';
import { localDate } from '@/domain/time';
import type { CustomerDetailView } from '@/features/customers/use-cases/customer-detail';

// ─── Cuenta ───

export const aProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: 'user-1',
  fullName: 'Juan Pablo Ríos',
  timeFormat: '12h',
  isAdmin: false,
  isActive: true,
  ...overrides,
});

// ─── Clientes (HU-CLI-04) ───

export const aCustomerListRow = (overrides: Partial<CustomerListRow> = {}): CustomerListRow => ({
  id: 'customer-1',
  name: 'María Camila Henao',
  avatarEmoji: '🌷',
  phone: '312 555 1234',
  books: { title: 'Las bellas historias de la Biblia', extraCount: 2 },
  isProspect: false,
  balance: 120000,
  credit: 0,
  lastPaymentAt: localDate('2026-11-02'),
  standing: 'overdue',
  archived: false,
  ...overrides,
});

/** Un prospecto: sin libros, sin saldo y sin estado (BR-CUS-13). */
export const aProspectRow = (overrides: Partial<CustomerListRow> = {}): CustomerListRow =>
  aCustomerListRow({
    id: 'customer-prospect',
    name: 'Andrés Felipe Gómez',
    avatarEmoji: null,
    books: null,
    isProspect: true,
    balance: 0,
    lastPaymentAt: null,
    standing: null,
    ...overrides,
  });

export const aCustomerListView = (overrides: Partial<CustomerListView> = {}): CustomerListView => {
  const rows = overrides.rows ?? [
    aCustomerListRow(),
    aCustomerListRow({
      id: 'customer-2',
      name: 'Jorge Iván Ospina',
      avatarEmoji: null,
      books: { title: 'El Deseado de todas las gentes', extraCount: 0 },
      balance: 60000,
      lastPaymentAt: localDate('2026-11-10'),
      standing: 'current',
    }),
    aCustomerListRow({
      id: 'customer-3',
      name: 'Beatriz Elena Salazar',
      avatarEmoji: '📚',
      books: { title: 'Salud y bienestar', extraCount: 0 },
      balance: 0,
      lastPaymentAt: localDate('2026-10-28'),
      standing: 'settled',
    }),
    aProspectRow(),
  ];
  return {
    counts: { all: rows.length, debtors: 2, settled: 1, archived: 0 },
    statusCounts: { current: 1, overdue: 1, settled: 1 },
    isDefaultView: true,
    emptySearch: null,
    ...overrides,
    rows,
  };
};

// ─── Inventario (HU-INV-02, HU-INV-06) ───

export const anInStockTitle = (overrides: Partial<InStockTitle> = {}): InStockTitle => ({
  titleId: 'title-1',
  name: 'Las bellas historias de la Biblia',
  imageUrl: null,
  category: 'religious',
  referencePrice: 180000,
  inStockCount: 4,
  ...overrides,
});

export const anInStockSummary = (overrides: Partial<InStockSummary> = {}): InStockSummary => ({
  booksTotal: 7,
  titles: [
    anInStockTitle(),
    anInStockTitle({
      titleId: 'title-2',
      name: 'Salud y bienestar',
      category: 'cultural',
      referencePrice: 98000,
      inStockCount: 3,
    }),
  ],
  minibooks: [
    anInStockTitle({
      titleId: 'title-3',
      name: 'Esperanza para la familia',
      category: 'minibook',
      referencePrice: 5000,
      inStockCount: 20,
    }),
  ],
  flaggedCount: 1,
  ...overrides,
});

export const aCopiesListRow = (overrides: Partial<CopiesListRow> = {}): CopiesListRow => ({
  copyId: 'copy-1',
  titleName: 'Las bellas historias de la Biblia',
  number: 6,
  status: 'sold',
  customer: { id: 'customer-1', name: 'María Camila Henao', avatarEmoji: '🌷' },
  rowDate: localDate('2026-10-15'),
  receivedAt: localDate('2026-09-01'),
  soldAt: new Date('2026-10-15T17:00:00.000Z'),
  price: 180000,
  priceDelta: null,
  priceDiffers: false,
  ...overrides,
});

export const aCopiesListView = (overrides: Partial<CopiesListView> = {}): CopiesListView => {
  const rows = overrides.rows ?? [
    aCopiesListRow(),
    aCopiesListRow({
      copyId: 'copy-2',
      number: 7,
      status: 'in_stock',
      customer: null,
      rowDate: localDate('2026-09-01'),
      soldAt: null,
    }),
  ];
  return { counts: { all: rows.length, inStock: 1, sold: 1, priceChanged: 0 }, ...overrides, rows };
};

// ─── Dinero (HU-DIN-02, HU-DIN-03, HU-DIN-01) ───

export const aPaymentsListRow = (overrides: Partial<PaymentsListRow> = {}): PaymentsListRow => ({
  paymentId: 'payment-1',
  customer: { id: 'customer-2', name: 'Jorge Iván Ospina', avatarEmoji: null, archived: false },
  kind: 'scheduled',
  status: 'scheduled',
  agreedAmount: 30000,
  agreedDate: localDate('2026-11-20'),
  paidAt: null,
  paidAmount: null,
  method: null,
  isOverdue: false,
  overdueDays: 0,
  inDraftDeposit: false,
  canCollect: true,
  ...overrides,
});

export const aPaymentsListView = (overrides: Partial<PaymentsListView> = {}): PaymentsListView => {
  const rows = overrides.rows ?? [
    aPaymentsListRow(),
    aPaymentsListRow({
      paymentId: 'payment-2',
      customer: { id: 'customer-1', name: 'María Camila Henao', avatarEmoji: '🌷', archived: false },
      agreedDate: localDate('2026-11-02'),
      isOverdue: true,
      overdueDays: 16,
    }),
    aPaymentsListRow({
      paymentId: 'payment-3',
      status: 'collected',
      paidAt: localDate('2026-11-15'),
      paidAmount: 30000,
      method: 'transfer',
      canCollect: false,
    }),
  ];
  return {
    counts: { all: rows.length, toCollect: 2, toDeliver: 1, delivered: 0, canceled: 0 },
    ...overrides,
    rows,
  };
};

/** Datos del diseño: $385.000 por entregar ($280.000 en efectivo + $105.000 por transferencia), 52/14/34. */
export const aMoneySummary = (overrides: Partial<MoneySummary> = {}): MoneySummary => ({
  toDeliver: { total: 385000, cash: 280000, transfer: 105000 },
  delivered: { amount: 1420000, pct: 52 },
  collected: { amount: 385000, pct: 14 },
  toCollect: { amount: 935000, pct: 34 },
  moneyTotal: 2740000,
  deliveredPct: 52,
  scheduledTotal: 935000,
  unscheduledTotal: 0,
  unscheduledCustomers: 0,
  totalDeliveredToLeader: 1420000,
  ...overrides,
});

export const aDepositsListRow = (overrides: Partial<DepositsListRow> = {}): DepositsListRow => ({
  depositId: 'deposit-1',
  title: 'Abibono (3)',
  depositDate: localDate('2026-11-14'),
  total: 420000,
  cash: 300000,
  transfer: 120000,
  status: 'confirmed',
  hasReceipt: true,
  ...overrides,
});

export const aDepositsListView = (overrides: Partial<DepositsListView> = {}): DepositsListView => {
  const rows = overrides.rows ?? [
    aDepositsListRow({
      depositId: 'deposit-4',
      title: 'Abibono (4)',
      depositDate: localDate('2026-11-18'),
      status: 'draft',
      hasReceipt: false,
    }),
    aDepositsListRow(),
  ];
  return { count: rows.length, totalDeliveredToLeader: 420000, ...overrides, rows };
};

// ─── Ficha de cliente (HU-CLI-12) ───

const noActions = {
  collect: false,
  edit: false,
  delete: false,
  reschedule: false,
  correctDate: false,
  cancel: false,
} as const;

export const aPaymentRow = (overrides: Partial<PaymentRow> = {}): PaymentRow => ({
  paymentId: 'payment-1',
  kind: 'scheduled',
  status: 'scheduled',
  agreedAmount: 60000,
  dueDate: localDate('2026-11-14'),
  originalDueDate: null,
  paidAmount: null,
  paidAt: null,
  method: null,
  cancelReason: null,
  isOverdue: false,
  overdueDays: 0,
  rescheduleCount: 0,
  deposit: null,
  can: {
    ...noActions,
    collect: true,
    edit: true,
    delete: true,
    reschedule: true,
    correctDate: true,
    cancel: true,
  },
  ...overrides,
});

export const aCustomerAccount = (overrides: Partial<CustomerAccount> = {}): CustomerAccount => ({
  debt: 460000,
  paidTotal: 140000,
  creditApplied: 0,
  balance: 320000,
  credit: 0,
  remaining: 320000,
  scheduledTotal: 120000,
  unscheduled: 200000,
  excess: 0,
  isProspect: false,
  standing: 'overdue',
  paidPct: 30,
  firstSaleAt: new Date('2026-10-03T17:00:00.000Z'),
  lastSaleAt: new Date('2026-10-03T17:00:00.000Z'),
  customerSince: localDate('2026-10-03'),
  lastPaymentAt: localDate('2026-10-17'),
  nextDueDate: localDate('2026-10-31'),
  hasOverdue: true,
  notices: { noBook: false, excess: false },
  ...overrides,
});

/** María Camila Henao del diseño: 3 libros, cuota inicial entregada, un cobrado, uno vencido y uno por cobrar. */
export const aCustomerDetailView = (overrides: Partial<CustomerDetailView> = {}): CustomerDetailView => ({
  id: 'customer-1',
  name: 'María Camila Henao',
  avatarEmoji: '📚',
  archived: false,
  createdAt: new Date('2026-10-03T15:00:00.000Z'),
  contact: { phone: '301 557 9032', telLink: 'tel:3015579032', whatsappLink: 'https://wa.me/573015579032' },
  account: aCustomerAccount(),
  customerSince: localDate('2026-10-03'),
  firstSaleAt: new Date('2026-10-03T17:00:00.000Z'),
  lastSaleAt: new Date('2026-10-03T17:00:00.000Z'),
  books: [
    {
      copyId: 'copy-14',
      titleName: 'Las bellas historias de la Biblia',
      number: 14,
      agreedPrice: 280000,
      publicPriceSnapshot: 280000,
      priceDelta: null,
      soldAt: new Date('2026-10-03T17:00:00.000Z'),
    },
    {
      copyId: 'copy-22',
      titleName: 'Un corazón tranquilo',
      number: 22,
      agreedPrice: 95000,
      publicPriceSnapshot: 95000,
      priceDelta: null,
      soldAt: new Date('2026-10-03T17:00:00.000Z'),
    },
    {
      copyId: 'copy-9',
      titleName: 'Bebidas saludables',
      number: 9,
      agreedPrice: 85000,
      publicPriceSnapshot: 85000,
      priceDelta: null,
      soldAt: new Date('2026-10-03T17:00:00.000Z'),
    },
  ],
  payments: [
    aPaymentRow({
      paymentId: 'p-down',
      kind: 'down_payment',
      status: 'delivered',
      agreedAmount: null,
      dueDate: localDate('2026-10-03'),
      paidAmount: 80000,
      paidAt: localDate('2026-10-03'),
      method: 'transfer',
      deposit: { id: 'deposit-1', status: 'confirmed' },
      can: noActions,
    }),
    aPaymentRow({
      paymentId: 'p-1',
      status: 'collected',
      dueDate: localDate('2026-10-17'),
      paidAmount: 60000,
      paidAt: localDate('2026-10-17'),
      method: 'cash',
      can: { ...noActions, edit: true, delete: true },
    }),
    aPaymentRow({ paymentId: 'p-2', dueDate: localDate('2026-10-31'), isOverdue: true, overdueDays: 5 }),
    aPaymentRow({ paymentId: 'p-3', dueDate: localDate('2026-11-14') }),
  ],
  canceledPayments: [
    aPaymentRow({
      paymentId: 'p-x',
      status: 'canceled',
      dueDate: localDate('2026-11-28'),
      cancelReason: 'manual',
      can: noActions,
    }),
  ],
  notices: { noBook: false, excess: null },
  address: 'Cra. 43 #52-18, Boston, Medellín',
  info: 'Trabaja en la tarde; mejor pasar después de las 5 p. m. Prefiere pagar por transferencia.',
  mapsUrl: null,
  location: null,
  mapsLink:
    'https://www.google.com/maps/search/?api=1&query=Cra.%2043%20%2352-18%2C%20Boston%2C%20Medell%C3%ADn',
  infoPhotos: [],
  invoices: [{ invoiceId: 'invoice-1', number: '0142', date: localDate('2026-10-03'), photos: [] }],
  ...overrides,
});
