import type { AuthRepository } from './auth-repository';
import type { Connectivity } from './connectivity';
import type { CopyRepository } from './copy-repository';
import type { CustomerRepository } from './customer-repository';
import type { LastPickerPointStore } from './last-picker-point';
import type { InvoiceRepository } from './invoice-repository';
import type { MoneyRepository } from './money-repository';
import type { OfflineCache } from './offline-cache';
import type { PaymentRepository } from './payment-repository';
import type { PhotoOutbox } from './photo-outbox';
import type { ImageCodec, PhotoRepository, StorageRepository } from './photo-ports';
import type { ProfileRepository } from './profile-repository';
import type { TitleRepository } from './title-repository';
import type { UserAdminRepository } from './user-admin-repository';

export type { AuthChange, AuthRepository } from './auth-repository';
export type { Connectivity } from './connectivity';
export type { CopyRepository, CreatedCopy } from './copy-repository';
export type {
  CustomerAccountData,
  CustomerListData,
  CustomerRepository,
  DiscardSummary,
} from './customer-repository';
export type { InvoiceRepository, UploadedInvoicePhoto } from './invoice-repository';
export type { OfflineCache } from './offline-cache';
export type { PaymentRepository } from './payment-repository';
export type { PendingPhoto, PendingPhotoTarget, PhotoOutbox } from './photo-outbox';
export type {
  DecodedImage,
  ImageCodec,
  NewPhoto,
  PhotoRepository,
  StorageRepository,
  StoredPhoto,
} from './photo-ports';
export type { LastPickerPointStore } from './last-picker-point';
export type { DepositRecord, MoneyRepository } from './money-repository';
export type { ProfileRepository } from './profile-repository';
export type { TitleRepository, TitleWrite } from './title-repository';
export type { UserAdminRepository } from './user-admin-repository';

/**
 * Contratos de datos que la app recibe inyectados (ARCHITECTURE §2).
 * Cada HU agrega aquí su repositorio; las implementaciones viven en `src/adapters/`
 * y se conectan en `src/app/`.
 */
export interface Repositories {
  readonly auth: AuthRepository;
  readonly profiles: ProfileRepository;
  readonly titles: TitleRepository;
  readonly copies: CopyRepository;
  readonly customers: CustomerRepository;
  readonly payments: PaymentRepository;
  readonly money: MoneyRepository;
  readonly invoices: InvoiceRepository;
  readonly photos: PhotoRepository;
  readonly storage: StorageRepository;
  /** Fotos que esperan subirse, guardadas en el dispositivo (ADR-0054). */
  readonly photoOutbox: PhotoOutbox;
  readonly imageCodec: ImageCodec;
  readonly connectivity: Connectivity;
  readonly offlineCache: OfflineCache;
  readonly lastPickerPoint: LastPickerPointStore;
  /** Admin · Usuarios (ronda 34, #43). */
  readonly users: UserAdminRepository;
}
