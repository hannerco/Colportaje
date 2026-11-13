// API pública de Inventario (HU-INV-*).
export {
  inventoryQueryKeys,
  prepareAddCopies,
  useAddCatalog,
  useAddCopiesBatch,
  useCopiesList,
  useCopyDetail,
  useCopyHistory,
  useFlaggedCopies,
  useInStockCopiesOfTitle,
  useInStockSummary,
  useReceivedDateOptions,
  useUpdateReceivedDate,
} from './hooks';
export { addCopiesBatch, type AddCopiesBatchDeps } from './use-cases/add-copies-batch';
export {
  RECEIVED_DATE_ERROR_CODES,
  type CopyCapabilities,
  type CopyDetail,
  type HistoryItem,
  type HistoryUndo,
} from '@/domain/copy-detail';
export type { FlaggedCopy, InStockCopiesOfTitle, InStockSummary, InStockTitle } from '@/domain/inventory';
export {
  DEFAULT_COPIES_LIST_PARAMS,
  type CopiesListParams,
  type CopiesListRow,
  type CopiesListView,
  type CopiesSortKey,
  type CopiesView,
} from '@/domain/copies-list';
// Lote local (sin red, R1): el front lo guarda en su estado y lo pasa a prepareAddCopies.
export {
  ADD_COPIES_ERROR_CODES,
  createAddBatch,
  receivedDateOptions,
  type AddBatch,
  type AddBatchLine,
  type AddBatchSummary,
  type AddCatalogGroup,
  type AddCopiesInput,
  type ReceivedDateKey,
} from '@/domain/add-batch';
