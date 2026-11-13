// API pública de Inventario (HU-INV-*).
export {
  inventoryQueryKeys,
  prepareAddCopies,
  useAddCatalog,
  useAddCopiesBatch,
  useCopyHistory,
  useFlaggedCopies,
  useInStockCopiesOfTitle,
  useInStockSummary,
  useReceivedDateOptions,
} from './hooks';
export { addCopiesBatch, type AddCopiesBatchDeps } from './use-cases/add-copies-batch';
export type { FlaggedCopy, InStockCopiesOfTitle, InStockSummary, InStockTitle } from '@/domain/inventory';
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
