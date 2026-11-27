// API pública de Clientes (HU-CLI-*).
export {
  customerQueryKeys,
  useAddCustomerInfoPhoto,
  useAddInvoicePhoto,
  useArchiveCustomer,
  useArchivePreview,
  useRestoreCustomer,
  useCreateInvoiceWithPhoto,
  useCustomerInvoices,
  useDeleteInvoicePhoto,
  useUpdateInvoice,
  useAssignableCopies,
  useCustomerInfoPhotos,
  useClearCustomerLocation,
  useCustomerDetail,
  useCustomerList,
  useInitialPickerCenter,
  useRememberLastChosenPoint,
  useSetCustomerLocation,
  useDeleteCustomerInfoPhoto,
  useDiscardNewCustomer,
  useDiscardSummary,
  usePhotoUrl,
  usePhotoUrlResolver,
  useAssignCopyToCustomer,
  useCreateCustomer,
  useSaveNewCustomer,
  usePossibleDuplicates,
  useRemoveCopyDuringCreation,
  useReturnCopyFromCustomer,
  useUpdateSoldAt,
  useUpdateCustomer,
} from './hooks';
export {
  PendingPhotosProvider,
  usePendingPhotos,
  useQueueNewCustomerPhotos,
} from './pending-photos-provider';
export {
  assignCopyToCustomer,
  removeCopyDuringCreation,
  returnCopyFromCustomer,
  updateSoldAt,
  type CustomerBooksDeps,
} from './use-cases/customer-books';
export {
  buildSearchIndex,
  cleanSearchText,
  searchCustomers,
  type SearchHit,
  type SearchableCustomer,
} from '@/domain/customer-search';
export {
  clearCustomerLocation,
  loadInitialPickerCenter,
  rememberLastChosenPoint,
  setCustomerLocation,
  type CustomerLocationDeps,
} from './use-cases/customer-location';
export {
  APPROXIMATE_ACCURACY_METERS,
  getInitialPickerCenter,
  isApproximate,
  mapsLinkFor,
  validateLocation,
  type CustomerLocation,
  type MapPoint,
  type PickerCenter,
} from '@/domain/customer-location';
export { archiveCustomer, getArchivePreview, restoreCustomer } from './use-cases/customer-archive';
export { buildArchivePreview, type ArchivePreview } from '@/domain/customer-archive';
export {
  loadCustomerDetail,
  type CustomerDetailDeps,
  type CustomerDetailView,
} from './use-cases/customer-detail';
export {
  buildCustomerDetail,
  contactLinks,
  type CustomerDetail,
  type CustomerDetailInput,
  type PaymentRow,
} from '@/domain/customer-detail';
export { loadCustomerListData, type CustomerListLoaded } from './use-cases/customer-list';
export {
  buildCustomerListView,
  DEFAULT_CUSTOMER_LIST_PARAMS,
  DEFAULT_SORT_DIR,
  isDefaultCustomerListView,
  type CustomerListParams,
  type CustomerListRow,
  type CustomerListTab,
  type CustomerListView,
  type CustomerSortKey,
} from '@/domain/customer-list';
export { discardNewCustomer, getDiscardSummary } from './use-cases/customer-discard';
export type { DiscardSummary } from '@/repositories';
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
export { customerListParamsFromUrl, customerListParamsToUrl } from './customer-list-url';
export { CustomerListScreen, type CustomerListScreenProps } from './screens/CustomerListScreen';
export { CustomerDetailScreen, type CustomerDetailScreenProps } from './screens/CustomerDetailScreen';
export {
  NewCustomerScreen,
  type DownPaymentValue,
  type NewCustomerScreenProps,
} from './screens/NewCustomerScreen';
export { useLiveWrite } from './use-live-write';
export { AddBookSheet, type AddBookSheetProps, type ChosenBook } from './screens/AddBookSheet';
// HU-PAN-CLI-06: dirección y ubicación.
export { LocationPicker, type LocationPickerProps } from './components/LocationPicker';
export { CustomerLocationBlock, type CustomerLocationBlockProps } from './components/CustomerLocationBlock';
export { MapPreview, type MapPreviewProps } from './components/MapPreview';
export { MapCanvas, type MapView } from './components/MapCanvas';
export {
  PICKER_POINT_ZOOM,
  formatCoordinates,
  pickerAccuracy,
  pickerPoint,
  pickerStatus,
  roundCoordinate,
  type GpsState,
  type PickerStatus,
} from './location-picker-state';
export { useGeolocation } from './use-geolocation';
export { mapTiles, type MapTiles } from './map-tiles';
export { chosenBookValues, type ChosenBookValues } from './chosen-book';
