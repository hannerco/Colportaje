// API pública de Dinero (HU-DIN-*).
export { moneyQueryKeys, useMoneySummary, useUnscheduledCustomers } from './hooks';
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
