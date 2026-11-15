// API pública de Dinero (HU-DIN-*).
export { moneyQueryKeys, useMoneySummary, usePaymentsList, useUnscheduledCustomers } from './hooks';
export { paymentsListFrom } from './use-cases/payments-list';
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
  type SummaryPayment,
  type UnscheduledCustomer,
} from '@/domain/money-summary';
