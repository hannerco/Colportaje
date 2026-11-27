import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import type { PendingPhoto } from '@/repositories';
import { createIndexedDbPhotoOutbox } from './photo-outbox';

const photo = (photoId: string, queuedAt = 1): PendingPhoto => ({
  photoId,
  ownerId: 'u1',
  customerId: 'c1',
  target: { type: 'customer_info' },
  file: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }),
  queuedAt,
  failure: null,
});

describe('bandeja de fotos en IndexedDB (ADR-0054)', () => {
  it('guarda, lee con el archivo intacto y borra', async () => {
    const outbox = createIndexedDbPhotoOutbox('test-outbox-1');
    await outbox.put([photo('p1'), photo('p2', 2)]);

    const saved = await outbox.list();
    expect(saved.map((p) => p.photoId).sort()).toEqual(['p1', 'p2']);
    const first = saved.find((p) => p.photoId === 'p1')!;
    expect(first.file.type).toBe('image/jpeg');
    expect([...new Uint8Array(await first.file.arrayBuffer())]).toEqual([1, 2, 3]);

    await outbox.remove('p1');
    expect((await outbox.list()).map((p) => p.photoId)).toEqual(['p2']);
  });

  it('sobrevive a cerrar la app: otra instancia lee lo mismo', async () => {
    await createIndexedDbPhotoOutbox('test-outbox-2').put([photo('p1')]);
    const reopened = createIndexedDbPhotoOutbox('test-outbox-2');
    expect((await reopened.list()).map((p) => p.photoId)).toEqual(['p1']);
  });

  it('poner otra vez la misma foto la reemplaza (p. ej. al marcarla como fallida)', async () => {
    const outbox = createIndexedDbPhotoOutbox('test-outbox-3');
    await outbox.put([photo('p1')]);
    await outbox.put([{ ...photo('p1'), failure: 'CUSTOMER_ARCHIVED' }]);
    expect(await outbox.list()).toEqual([
      expect.objectContaining({ photoId: 'p1', failure: 'CUSTOMER_ARCHIVED' }),
    ]);
  });
});
