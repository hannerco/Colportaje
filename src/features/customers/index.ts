// API pública de Clientes (HU-CLI-*).
export {
  customerQueryKeys,
  useAssignableCopies,
  useAssignCopyToCustomer,
  useCreateCustomer,
  usePossibleDuplicates,
  useRemoveCopyDuringCreation,
  useUpdateCustomer,
} from './hooks';
export {
  assignCopyToCustomer,
  removeCopyDuringCreation,
  type CustomerBooksDeps,
} from './use-cases/customer-books';
export { ASSIGN_ERROR_CODES, type AssignableCopy } from '@/domain/assignable-copies';
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
