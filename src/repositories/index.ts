import type { AuthRepository } from './auth-repository';
import type { Connectivity } from './connectivity';
import type { ProfileRepository } from './profile-repository';

export type { AuthChange, AuthRepository } from './auth-repository';
export type { Connectivity } from './connectivity';
export type { ProfileRepository } from './profile-repository';

/**
 * Contratos de datos que la app recibe inyectados (ARCHITECTURE §2).
 * Cada HU agrega aquí su repositorio; las implementaciones viven en `src/adapters/`
 * y se conectan en `src/app/`.
 */
export interface Repositories {
  readonly auth: AuthRepository;
  readonly profiles: ProfileRepository;
  readonly connectivity: Connectivity;
}
