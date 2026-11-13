'use client';

import { SerwistProvider } from '@serwist/turbopack/react';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useEffect, useState, type ReactNode } from 'react';
import { CACHE_BUSTER, createIndexedDbPersister } from '@/adapters/browser/query-persister';
import { startConnectionSync } from '@/features/connection';
import { createAppQueryClient, OFFLINE_CACHE_MAX_AGE_MS } from '@/features/shared/query-client';
import { RepositoriesProvider } from '@/features/shared/repositories-provider';
import { createAppRepositories } from './repositories';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createAppQueryClient);
  const [persister] = useState(() => createIndexedDbPersister());
  const [repositories] = useState(() => createAppRepositories(persister));

  // HU-BASE-06: lecturas sin conexión y revalidación al volver la red.
  useEffect(() => startConnectionSync(queryClient, repositories.connectivity), [queryClient, repositories]);

  return (
    <SerwistProvider swUrl="/serwist/sw.js" disable={process.env.NODE_ENV === 'development'}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister, maxAge: OFFLINE_CACHE_MAX_AGE_MS, buster: CACHE_BUSTER }}
      >
        <RepositoriesProvider repositories={repositories}>{children}</RepositoriesProvider>
      </PersistQueryClientProvider>
    </SerwistProvider>
  );
}
