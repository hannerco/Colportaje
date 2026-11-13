'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { RepositoriesProvider } from '@/features/shared/repositories-provider';
import { createAppRepositories } from './repositories';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [repositories] = useState(createAppRepositories);
  return (
    <QueryClientProvider client={queryClient}>
      <RepositoriesProvider repositories={repositories}>{children}</RepositoriesProvider>
    </QueryClientProvider>
  );
}
