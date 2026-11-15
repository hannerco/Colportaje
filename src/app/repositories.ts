import { canvasImageCodec } from '@/adapters/browser/canvas-image-codec';
import { browserConnectivity } from '@/adapters/browser/connectivity';
import { createLastPickerPointStore } from '@/adapters/browser/last-picker-point';
import { offlineCacheFrom } from '@/adapters/browser/query-persister';
import { createSupabaseAuthRepository } from '@/adapters/supabase/auth-repository';
import { createSupabaseBrowserClient, type AppSupabaseClient } from '@/adapters/supabase/client';
import { createSupabaseCopyRepository } from '@/adapters/supabase/copy-repository';
import { createSupabaseCustomerRepository } from '@/adapters/supabase/customer-repository';
import { createSupabaseInvoiceRepository } from '@/adapters/supabase/invoice-repository';
import { createSupabasePaymentRepository } from '@/adapters/supabase/payment-repository';
import { createSupabasePhotoRepository } from '@/adapters/supabase/photo-repository';
import { createSupabaseProfileRepository } from '@/adapters/supabase/profile-repository';
import { createSupabaseStorageRepository } from '@/adapters/supabase/storage-repository';
import { createSupabaseTitleRepository } from '@/adapters/supabase/title-repository';
import { getPublicEnv } from '@/lib/env';
import type { Repositories } from '@/repositories';
import type { Persister } from '@tanstack/react-query-persist-client';

/** Conecta las implementaciones reales (raíz de composición, ARCHITECTURE §2). */
export function createAppRepositories(persister: Persister): Repositories {
  let client: AppSupabaseClient | undefined;
  // El cliente (y la validación de variables) se crea al primer uso, ya en el navegador.
  const getClient = () => (client ??= createSupabaseBrowserClient(getPublicEnv()));
  return {
    auth: createSupabaseAuthRepository(getClient),
    profiles: createSupabaseProfileRepository(getClient),
    titles: createSupabaseTitleRepository(getClient),
    copies: createSupabaseCopyRepository(getClient),
    customers: createSupabaseCustomerRepository(getClient),
    payments: createSupabasePaymentRepository(getClient),
    invoices: createSupabaseInvoiceRepository(getClient),
    photos: createSupabasePhotoRepository(getClient),
    storage: createSupabaseStorageRepository(getClient),
    imageCodec: canvasImageCodec,
    connectivity: browserConnectivity,
    offlineCache: offlineCacheFrom(persister),
    lastPickerPoint: createLastPickerPointStore(),
  };
}
