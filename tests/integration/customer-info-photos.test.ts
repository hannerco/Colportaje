// HU-CLI-07 · Fotos de información del cliente contra Supabase local (base y Storage), por el camino de la app.
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createSupabaseAuthRepository } from '@/adapters/supabase/auth-repository';
import type { AppSupabaseClient } from '@/adapters/supabase/client';
import type { Database } from '@/adapters/supabase/database.types';
import { createSupabasePhotoRepository } from '@/adapters/supabase/photo-repository';
import { createSupabaseStorageRepository, USER_PHOTOS_BUCKET } from '@/adapters/supabase/storage-repository';
import {
  addCustomerInfoPhoto,
  deleteCustomerInfoPhoto,
  getPhotoUrl,
  listCustomerInfoPhotos,
} from '@/features/customers/use-cases/customer-photos';
import { createUser } from '../../scripts/lib/create-user';
import { fakeConnectivity } from '../support/fake-connectivity';
import { napiImageCodec, photoLikeJpeg } from '../support/napi-image-codec';
import { adminClient, anonClient, uniqueEmail } from './helpers/local-supabase';

const DB_URL = process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const pool = new pg.Pool({ connectionString: DB_URL, max: 2 });
const admin = adminClient();
const password = 'clave-local-123';
let owner: string;
let client: AppSupabaseClient;

beforeAll(async () => {
  const email = uniqueEmail('hu-cli-07');
  owner = (await createUser(admin, { email, fullName: 'Imágenes', password })).userId;
  client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
});

afterAll(async () => {
  const { data } = await admin.storage.from(USER_PHOTOS_BUCKET).list(`${owner}/customer_info`);
  const paths = (data ?? []).map((f) => `${owner}/customer_info/${f.name}`);
  if (paths.length > 0) await admin.storage.from(USER_PHOTOS_BUCKET).remove(paths);
  await pool.query('delete from public.photo where owner_id = $1', [owner]);
  await pool.query('delete from public.customer where owner_id = $1', [owner]);
  await admin.auth.admin.deleteUser(owner);
  await pool.end();
});

const deps = () => ({
  connectivity: fakeConnectivity(),
  auth: createSupabaseAuthRepository(() => client),
  imageCodec: napiImageCodec,
  storage: createSupabaseStorageRepository(() => client),
  photos: createSupabasePhotoRepository(() => client),
});

const newCustomer = async () => {
  const id = randomUUID();
  await pool.query(
    `insert into public.customer (id, owner_id, name, updated_at) values ($1, $2, 'Natalia', '2026-01-01')`,
    [id, owner],
  );
  return id;
};

describe('fotos de información del cliente contra Supabase local (HU-CLI-07)', () => {
  it('CA-1: un cliente sin fotos; se agrega una y aparece en la lista con su miniatura', async () => {
    const customerId = await newCustomer();
    expect(await listCustomerInfoPhotos(deps(), customerId)).toEqual({ ok: true, value: [] });
    const photoId = randomUUID();
    expect(
      await addCustomerInfoPhoto(deps(), { photoId, customerId, file: photoLikeJpeg(1600, 1200) }),
    ).toEqual({
      ok: true,
      value: { photoId },
    });
    const list = await listCustomerInfoPhotos(deps(), customerId);
    if (!list.ok) throw new Error(list.error.code);
    expect(list.value).toEqual([{ photoId, thumbUrl: expect.any(String), createdAt: expect.any(Date) }]);
    // La miniatura firmada se descarga y es WebP.
    const thumb = await fetch(list.value[0]!.thumbUrl);
    expect(thumb.ok).toBe(true);
    expect(thumb.headers.get('content-type')).toBe('image/webp');
    const full = await getPhotoUrl(deps(), photoId);
    expect(full.ok && full.value).toContain(`${photoId}.webp`);
    // R3: agregar movió la última modificación.
    const c = await pool.query(`select updated_at > '2026-01-02' as t from public.customer where id = $1`, [
      customerId,
    ]);
    expect(c.rows[0].t).toBe(true);
  }, 30_000);

  it('CA-2: se borra y ya no aparece; la fila tiene deleted_at y el archivo se conserva', async () => {
    const customerId = await newCustomer();
    const photoId = randomUUID();
    await addCustomerInfoPhoto(deps(), { photoId, customerId, file: photoLikeJpeg(400, 300) });
    expect(await deleteCustomerInfoPhoto(deps(), photoId)).toEqual({ ok: true, value: undefined });
    expect(await listCustomerInfoPhotos(deps(), customerId)).toEqual({ ok: true, value: [] });
    const row = await pool.query('select deleted_at is not null as deleted from public.photo where id = $1', [
      photoId,
    ]);
    expect(row.rows).toEqual([{ deleted: true }]);
    expect(await getPhotoUrl(deps(), photoId)).toEqual({
      ok: false,
      error: { code: 'NOT_FOUND', retryable: false },
    });
    const { data } = await admin.storage
      .from(USER_PHOTOS_BUCKET)
      .list(`${owner}/customer_info`, { search: photoId });
    expect(data?.length).toBe(2); // archivo y miniatura
  }, 30_000);

  it('CA-3: si la subida falla, no hay foto nueva; el reintento con el mismo photoId la crea una sola vez', async () => {
    const customerId = await newCustomer();
    const photoId = randomUUID();
    const unreachable = createClient<Database>('http://127.0.0.1:9', 'clave', {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const failed = await addCustomerInfoPhoto(
      { ...deps(), storage: createSupabaseStorageRepository(() => unreachable) },
      { photoId, customerId, file: photoLikeJpeg(400, 300) },
    );
    expect(failed).toEqual({ ok: false, error: { code: 'NETWORK_ERROR', retryable: true } });
    expect(await listCustomerInfoPhotos(deps(), customerId)).toEqual({ ok: true, value: [] });
    for (let i = 0; i < 2; i++) {
      expect(
        (await addCustomerInfoPhoto(deps(), { photoId, customerId, file: photoLikeJpeg(400, 300) })).ok,
      ).toBe(true);
    }
    const list = await listCustomerInfoPhotos(deps(), customerId);
    expect(list.ok && list.value.map((p) => p.photoId)).toEqual([photoId]);
  }, 30_000);

  it('un cliente archivado no recibe fotos (CUSTOMER_ARCHIVED); borrar una inexistente → NOT_FOUND', async () => {
    const customerId = await newCustomer();
    await pool.query('update public.customer set archived_at = now() where id = $1', [customerId]);
    expect(
      await addCustomerInfoPhoto(deps(), {
        photoId: randomUUID(),
        customerId,
        file: photoLikeJpeg(400, 300),
      }),
    ).toEqual({ ok: false, error: { code: 'CUSTOMER_ARCHIVED', retryable: false } });
    expect(await deleteCustomerInfoPhoto(deps(), randomUUID())).toEqual({
      ok: false,
      error: { code: 'NOT_FOUND', retryable: false },
    });
  }, 30_000);
});
