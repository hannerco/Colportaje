// API pública de Inventario (HU-INV-*).
export {
  inventoryQueryKeys,
  prepareAddCopies,
  useAddCatalog,
  useAddCopiesBatch,
  useAgreedPrice,
  useCopiesList,
  useCopyDetail,
  useCopyIssueActions,
  useDeleteCopy,
  useReturnToLeader,
  useReturnToLeaderCandidates,
  useCopyHistory,
  useFlaggedCopies,
  useInStockCopiesOfTitle,
  useInStockSummary,
  useReceivedDateOptions,
  useUpdateReceivedDate,
} from './hooks';
export { addCopiesBatch, type AddCopiesBatchDeps } from './use-cases/add-copies-batch';
export {
  restorePublicPrice,
  updateAgreedPrice,
  type AgreedPriceDeps,
  type AgreedPriceResult,
} from './use-cases/agreed-price';
export { evaluatePriceChange, validateAgreedPrice } from '@/domain/agreed-price';
export {
  loadReturnCandidatesData,
  returnCandidatesFrom,
  returnCopiesToLeader,
  undoReturnToLeader,
  type ReturnToLeaderDeps,
} from './use-cases/return-to-leader';
export {
  RETURN_TO_LEADER_ERROR_CODES,
  buildReturnCandidates,
  returnSelectionSummary,
  type ReturnCandidates,
  type ReturnSelection,
  type ReturnSummary,
} from '@/domain/return-to-leader';
export { deleteCopy, undoDeleteCopy, type CopyDeleteDeps } from './use-cases/copy-delete';
export { COPY_DELETE_ERROR_CODES, deleteNote, isDeletable } from '@/domain/copy-delete';
export { flagCopy, resolveCopyIssue, undoResolveCopyIssue, type CopyIssueDeps } from './use-cases/copy-issue';
export {
  COPY_ISSUE_ERROR_CODES,
  undoableResolution,
  validateIssueNote,
  type IssueResolution,
} from '@/domain/copy-issue';
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
