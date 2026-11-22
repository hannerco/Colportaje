// API pública del catálogo de títulos (HU-BASE-04) y de su administración (HU-PAN-ADM-01).
export {
  catalogQueryKeys,
  useActiveTitles,
  useAllTitles,
  useCreateTitle,
  useRemoveTitleCover,
  useSetTitleCover,
  useTitlesByIds,
  useUpdateTitle,
} from './hooks';
export { createTitle, removeTitleCover, setTitleCover, updateTitle } from './use-cases/manage-titles';
export {
  AdminCatalogScreen,
  type AdminCatalogScreenProps,
  type SaveOutcome,
} from './screens/AdminCatalogScreen';
