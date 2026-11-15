// API pública de Clientes (HU-CLI-*).
export {
  customerQueryKeys,
  useAddCustomerInfoPhoto,
  useAddInvoicePhoto,
  useCreateInvoiceWithPhoto,
  useCustomerInvoices,
  useDeleteInvoicePhoto,
  useUpdateInvoice,
  useAssignableCopies,
  useCustomerInfoPhotos,
  useDeleteCustomerInfoPhoto,
  usePhotoUrl,
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
export {
  addCustomerInfoPhoto,
  deleteCustomerInfoPhoto,
  getPhotoUrl,
  listCustomerInfoPhotos,
  type CustomerInfoPhoto,
} from './use-cases/customer-photos';
export {
  addInvoicePhoto,
  createInvoiceWithPhoto,
  deleteInvoicePhoto,
  listCustomerInvoices,
  updateInvoice,
  type CustomerInvoice,
} from './use-cases/customer-invoices';
export { sortInvoices, validateInvoicePatch, type InvoicePatch } from '@/domain/invoice';
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
