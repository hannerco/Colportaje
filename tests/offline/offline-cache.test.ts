// HU-BASE-06: lectura sin conexión con la caché persistida en IndexedDB (fake-indexeddb en Node).
import 'fake-indexeddb/auto';
import { onlineManager, QueryObserver } from '@tanstack/react-query';
import {
  persistQueryClientRestore,
  persistQueryClientSave,
  persistQueryClientSubscribe,
} from '@tanstack/react-query-persist-client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CACHE_BUSTER, createIndexedDbPersister, offlineCacheFrom } from '@/adapters/browser/query-persister';
import { formatTime } from '@/domain/time';
import { cacheBelongsToAnotherUser } from '@/features/auth/hooks';
import { lastSyncedAtOf, startConnectionSync } from '@/features/connection';
import { createAppQueryClient, OFFLINE_CACHE_MAX_AGE_MS } from '@/features/shared/query-client';
import { fakeConnectivity } from '../support/fake-connectivity';

const customers = [{ id: 'c1', name: 'Clienta de prueba', phone: '3000000000' }];
let keyCounter = 0;
const freshPersister = () => createIndexedDbPersister(`cache-prueba-${++keyCounter}`);
const persistOptions = (persister: ReturnType<typeof freshPersister>) => ({
  persister,
  maxAge: OFFLINE_CACHE_MAX_AGE_MS,
  buster: CACHE_BUSTER,
});

afterEach(() => {
  onlineManager.setOnline(true);
});

describe('lectura sin conexión (HU-BASE-06)', () => {
  it('CA-1 / R2: lo cargado se guarda, y al "recargar" sin red la lista sigue disponible con online = false', async () => {
    const persister = freshPersister();
    const before = createAppQueryClient();
    before.setQueryData(['customers'], customers);
    await persistQueryClientSave({ queryClient: before, ...persistOptions(persister) });

    // Se recarga la app sin red: cliente nuevo, se restaura lo guardado.
    const connectivity = fakeConnectivity(false);
    const after = createAppQueryClient();
    const stop = startConnectionSync(after, connectivity);
    await persistQueryClientRestore({ queryClient: after, ...persistOptions(persister) });

    expect(connectivity.isOnline()).toBe(false);
    expect(after.getQueryData(['customers'])).toEqual(customers);

    // Una lectura activa no falla sin red: muestra lo guardado y espera la conexión.
    const queryFn = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    const observer = new QueryObserver(after, { queryKey: ['customers'], queryFn, staleTime: 0 });
    const unsubscribe = observer.subscribe(() => {});
    const result = observer.getCurrentResult();
    expect(result.data).toEqual(customers);
    expect(result.status).toBe('success');
    expect(result.fetchStatus).toBe('paused');
    expect(queryFn).not.toHaveBeenCalled();
    unsubscribe();
    stop();
  });

  it('CA-3: lastSyncedAt es la hora de la última lectura exitosa (21:40 en Bogotá) y persiste', async () => {
    const at2140 = Date.parse('2026-11-08T02:40:00Z'); // 21:40 del 07/11 en Bogotá
    const persister = freshPersister();
    const before = createAppQueryClient();
    before.setQueryData(['customers'], customers, { updatedAt: at2140 - 60_000 });
    before.setQueryData(['titles'], [], { updatedAt: at2140 });
    expect(lastSyncedAtOf(before.getQueryCache())).toBe(at2140);
    await persistQueryClientSave({ queryClient: before, ...persistOptions(persister) });

    const after = createAppQueryClient();
    expect(lastSyncedAtOf(after.getQueryCache())).toBeNull();
    await persistQueryClientRestore({ queryClient: after, ...persistOptions(persister) });
    const restored = lastSyncedAtOf(after.getQueryCache());
    expect(restored).toBe(at2140);
    expect(formatTime(new Date(restored!))).toBe('9:40 p. m.');
  });

  it('CA-4 / R3: al volver la conexión se revalidan las lecturas y lastSyncedAt se actualiza', async () => {
    const connectivity = fakeConnectivity(true);
    const client = createAppQueryClient();
    const stop = startConnectionSync(client, connectivity);
    let version = 0;
    const queryFn = vi.fn(async () => [{ id: 'c1', version: ++version }]);
    const observer = new QueryObserver(client, { queryKey: ['customers'], queryFn, staleTime: Infinity });
    const unsubscribe = observer.subscribe(() => {});
    await vi.waitFor(() => expect(observer.getCurrentResult().data).toEqual([{ id: 'c1', version: 1 }]));
    const firstSync = lastSyncedAtOf(client.getQueryCache())!;

    connectivity.setOnline(false);
    expect(onlineManager.isOnline()).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 5));
    connectivity.setOnline(true);

    await vi.waitFor(() => expect(observer.getCurrentResult().data).toEqual([{ id: 'c1', version: 2 }]));
    expect(lastSyncedAtOf(client.getQueryCache())!).toBeGreaterThan(firstSync);
    unsubscribe();
    stop();
  });

  it('una lectura con error no cuenta como sincronización', () => {
    const client = createAppQueryClient();
    expect(lastSyncedAtOf(client.getQueryCache())).toBeNull();
    client
      .getQueryCache()
      .build(client, { queryKey: ['x'] })
      .setState({ status: 'error', dataUpdatedAt: 0 });
    expect(lastSyncedAtOf(client.getQueryCache())).toBeNull();
  });

  it('al cerrar sesión lo guardado se borra de inmediato (OfflineCache.clear)', async () => {
    const persister = freshPersister();
    const client = createAppQueryClient();
    client.setQueryData(['customers'], customers);
    await persistQueryClientSave({ queryClient: client, ...persistOptions(persister) });

    client.clear(); // lo que hace useSignOut…
    await offlineCacheFrom(persister).clear(); // …y sin esperar al guardado periódico

    const after = createAppQueryClient();
    await persistQueryClientRestore({ queryClient: after, ...persistOptions(persister) });
    expect(after.getQueryData(['customers'])).toBeUndefined();
  });

  it('el guardado periódico también refleja la caché vaciada', async () => {
    const persister = freshPersister();
    const client = createAppQueryClient();
    client.setQueryData(['customers'], customers);
    const unsubscribe = persistQueryClientSubscribe({ queryClient: client, ...persistOptions(persister) });
    client.clear();
    await new Promise((resolve) => setTimeout(resolve, 2500)); // guardado limitado a 1 por segundo
    unsubscribe();

    const after = createAppQueryClient();
    await persistQueryClientRestore({ queryClient: after, ...persistOptions(persister) });
    expect(after.getQueryData(['customers'])).toBeUndefined();
  }, 10_000);

  it('una caché guardada con otro formato (buster) se descarta', async () => {
    const persister = freshPersister();
    const client = createAppQueryClient();
    client.setQueryData(['customers'], customers);
    await persistQueryClientSave({ queryClient: client, persister, buster: 'v0' });

    const after = createAppQueryClient();
    await persistQueryClientRestore({ queryClient: after, ...persistOptions(persister) });
    expect(after.getQueryData(['customers'])).toBeUndefined();
  });

  it('si entra otra persona, se detecta que la caché era de otro usuario', () => {
    const client = createAppQueryClient();
    expect(cacheBelongsToAnotherUser(client, 'u1')).toBe(false);
    client.setQueryData(['auth', 'current-profile', 'u1'], { id: 'u1' });
    expect(cacheBelongsToAnotherUser(client, 'u1')).toBe(false);
    expect(cacheBelongsToAnotherUser(client, 'u2')).toBe(true);
  });
});
