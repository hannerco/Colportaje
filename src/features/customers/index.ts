// API pública de Clientes (HU-CLI-*).
export { customerQueryKeys, useCreateCustomer, usePossibleDuplicates, useUpdateCustomer } from './hooks';
export {
  createCustomer,
  loadPossibleDuplicates,
  updateCustomer,
  type CustomerDataDeps,
} from './use-cases/customer-data';
export {
  CUSTOMER_ERROR_CODES,
  isValidAvatarEmoji,
  isValidMapsUrl,
  type CustomerPatch,
  type PossibleDuplicate,
} from '@/domain/customer-data';
