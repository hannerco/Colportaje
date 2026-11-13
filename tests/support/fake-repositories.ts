// Repositorios falsos para pruebas de casos de uso: cada método es un `vi.fn()` que se puede sobrescribir.
// Al agregar un método a un puerto basta con sumarlo aquí (las pruebas que no lo usan no cambian).
import { vi } from 'vitest';
import type { CopyRepository, CustomerRepository, PaymentRepository, TitleRepository } from '@/repositories';

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
  ...overrides,
});
