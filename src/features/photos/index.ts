// API pública de fotos (HU-BASE-05). Las HU de cliente, factura y Abibono la usan.
export { compressImage, type CompressedPhoto } from './compress-image';
export { photoQueryKeys, useCreatePhoto, usePhotoStorageUsage, useSignedPhotoUrl } from './hooks';
export { createPhoto, uploadPhotoFiles, type UploadedPhotoFiles } from './upload-photo';
