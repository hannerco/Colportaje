import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PendingPhoto } from '@/repositories';

// IndexedDB que nunca responde (como Safari del iPhone a veces al abrir la base).
vi.mock('idb-keyval', () => {
  const never = () => new Promise<never>(() => undefined);
  return { createStore: () => ({}), setMany: never, entries: never, del: never };
});

const { createIndexedDbPhotoOutbox } = await import('./photo-outbox');

const photo: PendingPhoto = {
  photoId: 'p1',
  ownerId: 'u1',
  customerId: 'c1',
  target: { type: 'customer_info' },
  file: new Blob([new Uint8Array([1])], { type: 'image/jpeg' }),
  queuedAt: 1,
  failure: null,
};

afterEach(() => vi.useRealTimers());

describe('bandeja de fotos con IndexedDB que no responde (ADR-0054)', () => {
  it('no se queda esperando: guarda en memoria, lista y borra igual', async () => {
    vi.useFakeTimers();
    const outbox = createIndexedDbPhotoOutbox('colgada', 100);

    const put = outbox.put([photo]);
    await vi.advanceTimersByTimeAsync(100);
    await put;

    const list = outbox.list();
    await vi.advanceTimersByTimeAsync(100);
    expect((await list).map((p) => p.photoId)).toEqual(['p1']);

    const removed = outbox.remove('p1');
    await vi.advanceTimersByTimeAsync(100);
    await removed;
    const after = outbox.list();
    await vi.advanceTimersByTimeAsync(100);
    expect(await after).toEqual([]);
  });
});
