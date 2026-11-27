import { describe, expect, it, vi } from 'vitest';
import type { GetSupabaseClient } from './client';
import { createSupabaseStorageRepository } from './storage-repository';

/** Un Storage falso que firma una URL distinta cada vez. */
function fakeStorage() {
  let n = 0;
  const createSignedUrl = vi.fn(async (path: string) => ({
    data: { signedUrl: `https://storage/${path}?token=${++n}` },
    error: null,
  }));
  const upload = vi.fn(async () => ({ data: {}, error: null }));
  const remove = vi.fn(async () => ({ data: [], error: null }));
  const getClient = (() => ({
    storage: { from: () => ({ createSignedUrl, upload, remove }) },
  })) as unknown as GetSupabaseClient;
  return { getClient, createSignedUrl };
}

describe('URL firmadas de las fotos (la ficha se pide de nuevo al abrirse)', () => {
  const path = 'u1/customer_invoice/p1.thumb.webp';

  it('reutiliza la URL mientras le quede al menos la mitad de su vida', async () => {
    let clock = 0;
    const { getClient, createSignedUrl } = fakeStorage();
    const storage = createSupabaseStorageRepository(getClient, () => clock);

    const first = await storage.signedUrl(path, 3600);
    clock = 1800 * 1000;
    const again = await storage.signedUrl(path, 3600);

    expect(again).toEqual(first);
    expect(createSignedUrl).toHaveBeenCalledTimes(1);
  });

  it('firma otra cuando ya pasó la mitad de su vida', async () => {
    let clock = 0;
    const { getClient, createSignedUrl } = fakeStorage();
    const storage = createSupabaseStorageRepository(getClient, () => clock);

    const first = await storage.signedUrl(path, 3600);
    clock = 1801 * 1000;
    const later = await storage.signedUrl(path, 3600);

    expect(later).not.toEqual(first);
    expect(createSignedUrl).toHaveBeenCalledTimes(2);
  });

  it('subir o borrar el archivo olvida su URL', async () => {
    const { getClient, createSignedUrl } = fakeStorage();
    const storage = createSupabaseStorageRepository(getClient, () => 0);

    await storage.signedUrl(path, 3600);
    await storage.upload(path, new Blob([], { type: 'image/webp' }));
    await storage.signedUrl(path, 3600);
    await storage.remove([path]);
    await storage.signedUrl(path, 3600);

    expect(createSignedUrl).toHaveBeenCalledTimes(3);
  });
});
