'use client';

import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { photoQueryKeys } from '../photos/hooks';
import { useRepositories } from '../shared/repositories-provider';
import { customerQueryKeys } from './hooks';
import {
  createPendingPhotosRunner,
  pendingPhotosOf,
  type CustomerPendingPhotos,
  type PendingPhotosRunner,
} from './pending-photos-runner';
import type { NewCustomerPhotos } from './use-cases/pending-photos';

const PendingPhotosContext = createContext<PendingPhotosRunner | null>(null);

const LOCK_NAME = 'colportor-pending-photos';

/** Dos pestañas abiertas no suben la misma foto a la vez: esperan su turno (Web Locks; sin la API, sin candado). */
const webLock = <T,>(run: () => Promise<T>): Promise<T> =>
  typeof navigator !== 'undefined' && navigator.locks
    ? (navigator.locks.request(LOCK_NAME, run) as Promise<T>)
    : run();

/**
 * Bandeja de fotos (ADR-0054): sube lo pendiente al abrir la app, al volver la señal, al volver a la app y al entrar.
 * Va dentro de `RepositoriesProvider` y del cliente de consultas.
 */
export function PendingPhotosProvider({ children }: { children: ReactNode }) {
  const repositories = useRepositories();
  const queryClient = useQueryClient();
  const [runner] = useState(() =>
    createPendingPhotosRunner(repositories, {
      lock: webLock,
      onUploaded: () => {
        void queryClient.invalidateQueries({ queryKey: customerQueryKeys.all });
        void queryClient.invalidateQueries({ queryKey: photoQueryKeys.usage });
      },
    }),
  );

  useEffect(() => {
    void runner.run();
    const offOnline = repositories.connectivity.subscribe((online) => {
      if (online) void runner.run();
    });
    const offAuth = repositories.auth.onAuthChange(() => void runner.run());
    const onVisible = () => {
      if (document.visibilityState === 'visible') void runner.run();
    };
    document.addEventListener('visibilitychange', onVisible);
    // Sin `runner.stop()`: en modo estricto el efecto se monta dos veces y el motor debe seguir vivo.
    return () => {
      offOnline();
      offAuth();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [runner, repositories]);

  return <PendingPhotosContext.Provider value={runner}>{children}</PendingPhotosContext.Provider>;
}

function useRunner(): PendingPhotosRunner {
  const runner = useContext(PendingPhotosContext);
  if (!runner) throw new Error('usePendingPhotos necesita <PendingPhotosProvider>');
  return runner;
}

/** Lo que falta por subir de un cliente, con «Reintentar» y «Descartar» para las que fallaron. */
export function usePendingPhotos(customerId: string): CustomerPendingPhotos & {
  retry: (photoId: string) => Promise<void>;
  discard: (photoId: string) => Promise<void>;
} {
  const runner = useRunner();
  const state = useSyncExternalStore(runner.subscribe, runner.getState, runner.getState);
  return { ...pendingPhotosOf(state, customerId), retry: runner.retry, discard: runner.discard };
}

/** Pone en la bandeja las fotos de un cliente recién guardado y empieza a subirlas. */
export function useQueueNewCustomerPhotos(): (input: {
  customerId: string;
  photos: NewCustomerPhotos;
}) => Promise<void> {
  return useRunner().queue;
}
