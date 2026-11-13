import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { createSupabaseAuthRepository } from '@/adapters/supabase/auth-repository';
import { createSupabasePhotoRepository } from '@/adapters/supabase/photo-repository';
import { createSupabaseStorageRepository, USER_PHOTOS_BUCKET } from '@/adapters/supabase/storage-repository';
import { createPhoto } from '@/features/photos/upload-photo';
import { runMutation } from '@/features/shared/run-mutation';
import { createUser } from '../../scripts/lib/create-user';
import { pool } from '../rls/helpers/db';
import { fakeConnectivity } from '../support/fake-connectivity';
import { napiImageCodec, photoLikeJpeg } from '../support/napi-image-codec';
import { adminClient, anonClient, clientWithFetch, uniqueEmail } from './helpers/local-supabase';

const admin = adminClient();
const userIds: string[] = [];

afterAll(async () => {
  for (const id of userIds) {
    await pool.query('delete from public.photo where owner_id = $1', [id]);
    await admin.auth.admin.deleteUser(id);
  }
  await pool.end();
});

async function signedInUser() {
  const email = uniqueEmail('hu-base-06');
  const password = 'clave-local-123';
  const { userId } = await createUser(admin, { email, fullName: 'Sin señal', password });
  userIds.push(userId);
  const client = anonClient();
  await createSupabaseAuthRepository(() => client).signIn({ email, password });
  return { userId, client };
}

const photoRows = async (where: string, value: string) =>
  (
    await pool.query<{ n: number }>(`select count(*)::int as n from public.photo where ${where} = $1`, [
      value,
    ])
  ).rows[0]?.n;

describe('escrituras sin conexión (HU-BASE-06)', () => {
  it('CA-2 / R1: sin red, una acción devuelve OFFLINE y no cambia nada en la base ni en Storage', async () => {
    const { userId, client } = await signedInUser();
    const photoId = randomUUID();
    const result = await createPhoto(
      {
        connectivity: fakeConnectivity(false),
        auth: createSupabaseAuthRepository(() => client),
        imageCodec: napiImageCodec,
        storage: createSupabaseStorageRepository(() => client),
        photos: createSupabasePhotoRepository(() => client),
      },
      { photoId, kind: 'customer_info', file: photoLikeJpeg(400, 300) },
    );
    expect(result).toEqual({ ok: false, error: { code: 'OFFLINE', retryable: false } });
    expect(await photoRows('owner_id', userId)).toBe(0);
    const { data } = await admin.storage.from(USER_PHOTOS_BUCKET).list(`${userId}/customer_info`);
    expect(data).toEqual([]);
  });

  it('CA-5 / R4: si la respuesta se pierde, el reintento con el mismo id deja una sola fila', async () => {
    const { userId, client } = await signedInUser();
    const { data } = await client.auth.getSession();
    const token = data.session!.access_token;
    const photoId = randomUUID();
    const newPhoto = {
      id: photoId,
      kind: 'customer_info' as const,
      path: `${userId}/customer_info/${photoId}.webp`,
      thumbPath: `${userId}/customer_info/${photoId}.thumb.webp`,
      bytes: 1000,
    };

    // La petición llega al servidor, pero la respuesta se pierde en el camino.
    const lossy = createSupabasePhotoRepository(() => clientWithFetch(token, lossyFetch));
    const first = await runMutation(fakeConnectivity(true), () => lossy.create(newPhoto));
    expect(first).toEqual({ ok: false, error: { code: 'NETWORK_ERROR', retryable: true } });
    expect(await photoRows('id', photoId)).toBe(1); // el servidor sí la guardó

    // El usuario reintenta (mismo id) con la red ya estable.
    const stable = createSupabasePhotoRepository(() => client);
    expect(await runMutation(fakeConnectivity(true), () => stable.create(newPhoto))).toEqual({
      ok: true,
      value: undefined,
    });
    expect(await photoRows('id', photoId)).toBe(1);
  });
});

/** Hace la petición y luego simula que la respuesta no llegó. */
const lossyFetch: typeof fetch = async (input, init) => {
  await fetch(input, init);
  throw new TypeError('fetch failed');
};
