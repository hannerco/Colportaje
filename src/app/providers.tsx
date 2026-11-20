'use client';

import { SerwistProvider } from '@serwist/turbopack/react';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useEffect, useState, type ReactNode } from 'react';
import { CACHE_BUSTER, createIndexedDbPersister } from '@/adapters/browser/query-persister';
import { startConnectionSync } from '@/features/connection';
import { createAppQueryClient, OFFLINE_CACHE_MAX_AGE_MS } from '@/features/shared/query-client';
import { RepositoriesProvider } from '@/features/shared/repositories-provider';
import { businessConfig } from '@/domain/config/business-config';
import { ToastProvider } from '@/ui/molecules/Toast';
import { createAppRepositories } from './repositories';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createAppQueryClient);
  const [persister] = useState(() => createIndexedDbPersister());
  const [repositories] = useState(() => createAppRepositories(persister));

  // HU-BASE-06: lecturas sin conexión y revalidación al volver la red.
  useEffect(() => startConnectionSync(queryClient, repositories.connectivity), [queryClient, repositories]);

  return (
    // `reloadOnOnline` (por defecto, sí) recargaba la página al volver la red y se perdía lo que se estaba escribiendo
    // (la ficha viva, el selector de ubicación). Al volver la red, `startConnectionSync` ya revalida las lecturas.
    <SerwistProvider
      swUrl="/serwist/sw.js"
      disable={process.env.NODE_ENV === 'development'}
      reloadOnOnline={false}
    >
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister, maxAge: OFFLINE_CACHE_MAX_AGE_MS, buster: CACHE_BUSTER }}
      >
        <RepositoriesProvider repositories={repositories}>
          {/* HU-UI-15: el aviso «Deshacer» dura `undo.toastSeconds` (I-34). */}
          <ToastProvider durationMs={businessConfig.undo.toastSeconds * 1000}>{children}</ToastProvider>
        </RepositoriesProvider>
      </PersistQueryClientProvider>
    </SerwistProvider>
  );
}
