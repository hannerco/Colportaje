// Repositorios falsos para pruebas de casos de uso: cada método es un `vi.fn()` que se puede sobrescribir.
// Al agregar un método a un puerto basta con sumarlo aquí (las pruebas que no lo usan no cambian).
import { vi } from 'vitest';
import type {
  CopyRepository,
  CustomerRepository,
  InvoiceRepository,
  PaymentRepository,
  PhotoRepository,
  StorageRepository,
  TitleRepository,
} from '@/repositories';

export const fakeCopyRepository = (overrides: Partial<CopyRepository> = {}): CopyRepository => ({
  getHistory: vi.fn(),
  addBatch: vi.fn(),
  listStock: vi.fn(),
  listInStockOfTitle: vi.fn(),
  listFlagged: vi.fn(),
  listAll: vi.fn(),
  getDetail: vi.fn(),
  updateReceivedDate: vi.fn(),
  assignToCustomer: vi.fn(),
  returnFromCustomer: vi.fn(),
  ...overrides,
});

export const fakeCustomerRepository = (overrides: Partial<CustomerRepository> = {}): CustomerRepository => ({
  getAccountData: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  listDuplicateCandidates: vi.fn(),
  listRefs: vi.fn(),
  getRefs: vi.fn(),
  getDiscardSummary: vi.fn(),
  listForCustomerList: vi.fn(),
  setLocation: vi.fn(),
  discardNew: vi.fn(),
  ...overrides,
});

export const fakeTitleRepository = (overrides: Partial<TitleRepository> = {}): TitleRepository => ({
  listActive: vi.fn(),
  getMany: vi.fn(),
  ...overrides,
});

export const fakePaymentRepository = (overrides: Partial<PaymentRepository> = {}): PaymentRepository => ({
  resolveScheduleExcess: vi.fn(),
  setCreationDownPayment: vi.fn(),
  registerCollected: vi.fn(),
  updateCollected: vi.fn(),
  delete: vi.fn(),
  applyPlan: vi.fn(),
  scheduleSingle: vi.fn(),
  updateScheduledAmount: vi.fn(),
  correctScheduledDate: vi.fn(),
  cancelScheduled: vi.fn(),
  reschedule: vi.fn(),
  collect: vi.fn(),
  ...overrides,
});

export const fakePhotoRepository = (overrides: Partial<PhotoRepository> = {}): PhotoRepository => ({
  create: vi.fn(),
  softDelete: vi.fn(),
  listOfCustomer: vi.fn(),
  getPaths: vi.fn(),
  totalBytes: vi.fn(),
  ...overrides,
});

export const fakeStorageRepository = (overrides: Partial<StorageRepository> = {}): StorageRepository => ({
  upload: vi.fn(),
  signedUrl: vi.fn(),
  remove: vi.fn(),
  ...overrides,
});

export const fakeInvoiceRepository = (overrides: Partial<InvoiceRepository> = {}): InvoiceRepository => ({
  listOfCustomer: vi.fn(),
  createWithPhoto: vi.fn(),
  addPhoto: vi.fn(),
  update: vi.fn(),
  deletePhoto: vi.fn(),
  ...overrides,
});
