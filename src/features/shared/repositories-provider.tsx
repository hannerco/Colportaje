'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { Repositories } from '@/repositories';

const RepositoriesContext = createContext<Repositories | null>(null);

/**
 * Inyecta las implementaciones de los repositorios. La app conecta las de Supabase;
 * las pruebas (y la fase 2, sin conexión) pueden pasar otras sin tocar los casos de uso.
 */
export function RepositoriesProvider({
  repositories,
  children,
}: {
  repositories: Repositories;
  children: ReactNode;
}) {
  return <RepositoriesContext.Provider value={repositories}>{children}</RepositoriesContext.Provider>;
}

export function useRepositories(): Repositories {
  const repositories = useContext(RepositoriesContext);
  if (repositories === null) {
    throw new Error('useRepositories debe usarse dentro de <RepositoriesProvider>.');
  }
  return repositories;
}
