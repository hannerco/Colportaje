import type { AuthRepository } from './auth-repository';
import type { Connectivity } from './connectivity';
import type { OfflineCache } from './offline-cache';
import type { ImageCodec, PhotoRepository, StorageRepository } from './photo-ports';
import type { ProfileRepository } from './profile-repository';
import type { TitleRepository } from './title-repository';

export type { AuthChange, AuthRepository } from './auth-repository';
export type { Connectivity } from './connectivity';
export type { OfflineCache } from './offline-cache';
export type { DecodedImage, ImageCodec, NewPhoto, PhotoRepository, StorageRepository } from './photo-ports';
export type { ProfileRepository } from './profile-repository';
export type { TitleRepository } from './title-repository';

/**
 * Contratos de datos que la app recibe inyectados (ARCHITECTURE §2).
 * Cada HU agrega aquí su repositorio; las implementaciones viven en `src/adapters/`
 * y se conectan en `src/app/`.
 */
export interface Repositories {
  readonly auth: AuthRepository;
  readonly profiles: ProfileRepository;
  readonly titles: TitleRepository;
  readonly photos: PhotoRepository;
  readonly storage: StorageRepository;
  readonly imageCodec: ImageCodec;
  readonly connectivity: Connectivity;
  readonly offlineCache: OfflineCache;
}
