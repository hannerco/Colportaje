import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { afterAll, describe, expect, it } from 'vitest';
import { createSupabaseAuthRepository } from '@/adapters/supabase/auth-repository';
import type { AppSupabaseClient } from '@/adapters/supabase/client';
import type { Database } from '@/adapters/supabase/database.types';
import { createSupabasePhotoRepository } from '@/adapters/supabase/photo-repository';
import { createSupabaseStorageRepository, USER_PHOTOS_BUCKET } from '@/adapters/supabase/storage-repository';
import { createPhoto } from '@/features/photos/upload-photo';
import { createUser } from '../../scripts/lib/create-user';
import { pool } from '../rls/helpers/db';
import { napiImageCodec, photoLikeJpeg } from '../support/napi-image-codec';
import { adminClient, anonClient, uniqueEmail } from './helpers/local-supabase';
import { fakeConnectivity } from '../support/fake-connectivity';

const admin = adminClient();
const userIds: string[] = [];

afterAll(async () => {
  for (const id of userIds) {
    const { data } = await admin.storage.from(USER_PHOTOS_BUCKET).list(`${id}/customer_info`);
    const paths = (data ?? []).map((f) => `${id}/customer_info/${f.name}`);
    if (paths.length > 0) await admin.storage.from(USER_PHOTOS_BUCKET).remove(paths);
    await pool.query('delete from public.photo where owner_id = $1', [id]);
    await pool.query('delete from public.customer where owner_id = $1', [id]);
    await admin.auth.admin.deleteUser(id);
  }
  await pool.end();
});

/** Usuario ficticio con sesión iniciada en su propio cliente (un dispositivo). */
async function signedInUser() {
  const email = uniqueEmail('hu-base-05');
  const password = 'clave-local-123';
  const { userId } = await createUser(admin, { email, fullName: 'Fotógrafa', password });
  userIds.push(userId);
  const client = anonClient();
  await createSupabaseAuthRepository(() => client).signIn({ email, password });
  return { userId, client };
}

/** Las fotos `customer_info` llevan cliente (HU-CLI-07). */
async function customerOf(userId: string) {
  const id = randomUUID();
  await pool.query(`insert into public.customer (id, owner_id, name) values ($1, $2, 'Natalia')`, [
    id,
    userId,
  ]);
  return id;
}

const webp = (bytes = 2048) => new Blob([new Uint8Array(bytes)], { type: 'image/webp' });

function photoDeps(client: AppSupabaseClient) {
  return {
    connectivity: fakeConnectivity(true),
    auth: createSupabaseAuthRepository(() => client),
    imageCodec: napiImageCodec,
    storage: createSupabaseStorageRepository(() => client),
    photos: createSupabasePhotoRepository(() => client),
  };
}

describe('Storage de fotos contra Supabase local (HU-BASE-05)', () => {
  it('CA-2: A no puede subir ni leer bajo la carpeta de B', async () => {
    const a = await signedInUser();
    const b = await signedInUser();
    const storageA = createSupabaseStorageRepository(() => a.client);
    const storageB = createSupabaseStorageRepository(() => b.client);
    const pathOfB = `${b.userId}/customer_info/${randomUUID()}.webp`;
    expect((await storageB.upload(pathOfB, webp())).ok).toBe(true);

    expect(await storageA.upload(`${b.userId}/customer_info/${randomUUID()}.webp`, webp())).toMatchObject({
      ok: false,
      error: { code: 'FORBIDDEN' },
    });
    expect((await storageA.signedUrl(pathOfB, 60)).ok).toBe(false);
  });

  it('R3: la dueña ve su foto con una URL firmada que caduca; subir de nuevo la misma ruta no duplica', async () => {
    const a = await signedInUser();
    const storage = createSupabaseStorageRepository(() => a.client);
    const path = `${a.userId}/customer_info/${randomUUID()}.webp`;
    expect((await storage.upload(path, webp(1000))).ok).toBe(true);
    expect((await storage.upload(path, webp(3000))).ok).toBe(true);

    const url = await storage.signedUrl(path, 60);
    if (!url.ok) throw new Error(url.error.code);
    expect(url.value).toMatch(/token=/);
    const response = await fetch(url.value);
    expect(response.status).toBe(200);
    expect((await response.arrayBuffer()).byteLength).toBe(3000);

    const { data } = await a.client.storage.from(USER_PHOTOS_BUCKET).list(`${a.userId}/customer_info`);
    expect(data?.filter((f) => path.endsWith(f.name))).toHaveLength(1);
  });

  it('R1: el bucket rechaza lo que no es WebP (nunca el original)', async () => {
    const a = await signedInUser();
    const { error } = await a.client.storage
      .from(USER_PHOTOS_BUCKET)
      .upload(`${a.userId}/customer_info/${randomUUID()}.jpg`, new Blob(['x'], { type: 'image/jpeg' }), {
        contentType: 'image/jpeg',
      });
    expect(error).not.toBeNull();
  });

  it('flujo completo: comprime, sube archivo y miniatura y crea la fila; el uso total la incluye', async () => {
    const a = await signedInUser();
    const deps = photoDeps(a.client);
    const photoId = randomUUID();
    const customerId = await customerOf(a.userId);
    const result = await createPhoto(deps, {
      photoId,
      kind: 'customer_info',
      file: photoLikeJpeg(1600, 1200),
      customerId,
    });
    if (!result.ok) throw new Error(result.error.code);
    expect(result.value.path).toBe(`${a.userId}/customer_info/${photoId}.webp`);

    const { rows } = await pool.query(
      'select kind, path, thumb_path, bytes from public.photo where id = $1',
      [photoId],
    );
    expect(rows).toEqual([
      {
        kind: 'customer_info',
        path: result.value.path,
        thumb_path: result.value.thumbPath,
        bytes: result.value.bytes,
      },
    ]);
    expect(await deps.photos.totalBytes()).toEqual({ ok: true, value: result.value.bytes });

    // Reintentar con el mismo id no duplica (AF-91).
    expect(
      (
        await createPhoto(deps, {
          photoId,
          kind: 'customer_info',
          file: photoLikeJpeg(800, 600),
          customerId,
        })
      ).ok,
    ).toBe(true);
    const count = await pool.query('select count(*)::int as n from public.photo where id = $1', [photoId]);
    expect(count.rows).toEqual([{ n: 1 }]);
  }, 30_000);

  it('CA-3: si la subida falla por red, no queda fila y el error es NETWORK_ERROR reintentable', async () => {
    const a = await signedInUser();
    const deps = photoDeps(a.client);
    // Storage apuntando a un puerto sin servicio (la red "se cae" al subir).
    const unreachable = createClient<Database>('http://127.0.0.1:9', 'clave', {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const photoId = randomUUID();
    const result = await createPhoto(
      { ...deps, storage: createSupabaseStorageRepository(() => unreachable) },
      { photoId, kind: 'customer_info', file: photoLikeJpeg(400, 300) },
    );
    expect(result).toEqual({ ok: false, error: { code: 'NETWORK_ERROR', retryable: true } });
    const { rows } = await pool.query('select count(*)::int as n from public.photo where id = $1', [photoId]);
    expect(rows).toEqual([{ n: 0 }]);
  });

  it('CA-5: con dos fotos de 150 y 140 KB el uso total es su suma; borrar es lógico', async () => {
    const a = await signedInUser();
    const photos = createSupabasePhotoRepository(() => a.client);
    const customerId = await customerOf(a.userId);
    const [first, second] = [randomUUID(), randomUUID()];
    for (const [id, bytes] of [
      [first!, 150_000],
      [second!, 140_000],
    ] as const) {
      expect(
        (
          await photos.create({
            id,
            kind: 'customer_info',
            path: `${a.userId}/customer_info/${id}.webp`,
            thumbPath: `${a.userId}/customer_info/${id}.thumb.webp`,
            bytes,
            customerId,
          })
        ).ok,
      ).toBe(true);
    }
    expect(await photos.totalBytes()).toEqual({ ok: true, value: 290_000 });

    expect(await photos.softDelete(first!)).toEqual({ ok: true, value: undefined });
    expect(await photos.softDelete(first!)).toEqual({ ok: true, value: undefined }); // reintento
    expect(await photos.softDelete(randomUUID())).toEqual({
      ok: false,
      error: { code: 'NOT_FOUND', retryable: false },
    });
    const { rows } = await pool.query(
      'select deleted_at is not null as deleted from public.photo where id = $1',
      [first],
    );
    expect(rows).toEqual([{ deleted: true }]);
    expect(await photos.totalBytes()).toEqual({ ok: true, value: 290_000 });
  });
});
