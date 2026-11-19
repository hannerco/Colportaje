// API pública de Dinero (HU-DIN-*).
export {
  moneyQueryKeys,
  useConfirmDeposit,
  useAddDepositReceipt,
  useDeleteDepositDraft,
  useDeleteDepositReceipt,
  useDeposit,
  useDepositsList,
  useMoneySummary,
  useNewDepositProposal,
  useReopenDeposit,
  usePaymentCustomer,
  usePaymentsList,
  useSaveDepositDraft,
  useUnscheduledCustomers,
  useUpdateDepositNote,
} from './hooks';
export { paymentsListFrom } from './use-cases/payments-list';
export { depositsListFrom } from './use-cases/deposits-list';
export { confirmDeposit, reopenDeposit, updateDepositNote } from './use-cases/confirm-deposit';
export { DEPOSIT_REOPEN_ERROR_CODES, validateReopenReason, type DepositEvent } from '@/domain/deposit-reopen';
export {
  buildDepositsListView,
  DEFAULT_DEPOSITS_LIST_PARAMS,
  type DepositsListParams,
  type DepositsListRow,
  type DepositsListView,
  type DepositsSortKey,
  type MoneyDeposit,
} from '@/domain/deposits-list';
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
// HU-PAN-DIN-01: Dinero, resumen y abonos de clientes.
export { MoneyScreen, type MoneyScreenProps } from './screens/MoneyScreen';
export { PaymentsTable, type PaymentsTableProps } from './components/PaymentsTable';
export { paymentsListParamsFromUrl, paymentsListParamsToUrl } from './payments-list-url';
// HU-PAN-DIN-03: lista de Abibonos.
export { DepositsListScreen, type DepositsListScreenProps } from './screens/DepositsListScreen';
export { DepositsTable, type DepositsTableProps } from './components/DepositsTable';
export { depositsListParamsFromUrl, depositsListParamsToUrl } from './deposits-list-url';
