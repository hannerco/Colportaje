// API pública de Dinero (HU-DIN-*).
export {
  moneyQueryKeys,
  useAddDepositReceipt,
  useDeleteDepositDraft,
  useDeleteDepositReceipt,
  useDeposit,
  useMoneySummary,
  useNewDepositProposal,
  usePaymentsList,
  useSaveDepositDraft,
  useUnscheduledCustomers,
} from './hooks';
export { paymentsListFrom } from './use-cases/payments-list';
export {
  addDepositReceipt,
  deleteDepositDraft,
  deleteDepositReceipt,
  loadDeposit,
  newDepositProposalFrom,
  saveDepositDraft,
} from './use-cases/deposit-draft';
export {
  buildPaymentsListView,
  DEFAULT_PAYMENTS_LIST_PARAMS,
  defaultPaymentsSort,
  type ListPayment,
  type PaymentsListCustomer,
  type PaymentsListParams,
  type PaymentsListRow,
  type PaymentsListView,
  type PaymentsSortKey,
  type PaymentsView,
} from '@/domain/payments-list';
export {
  DEPOSIT_DRAFT_ERROR_CODES,
  recalcProposal,
  type DepositDraftInput,
  type DepositPayment,
  type DepositView,
  type NewDepositProposal,
  type StagedReceipt,
} from '@/domain/deposit-draft';
export {
  loadMoneySummaryData,
  moneySummaryFrom,
  unscheduledCustomersFrom,
  type MoneySummaryData,
} from './use-cases/money-summary';
export {
  computeMoneySummary,
  percentagesSummingTo100,
  unscheduledCustomersList,
  type MoneySummary,
  type SummaryDeposit,
  type UnscheduledCustomer,
} from '@/domain/money-summary';
