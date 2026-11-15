// HU-CLI-08 · Facturas contra Supabase local (base y Storage), por el mismo camino que la app.
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createSupabaseAuthRepository } from '@/adapters/supabase/auth-repository';
import type { AppSupabaseClient } from '@/adapters/supabase/client';
import type { Database } from '@/adapters/supabase/database.types';
import { createSupabaseInvoiceRepository } from '@/adapters/supabase/invoice-repository';
import { createSupabaseStorageRepository, USER_PHOTOS_BUCKET } from '@/adapters/supabase/storage-repository';
import {
  addInvoicePhoto,
  createInvoiceWithPhoto,
  deleteInvoicePhoto,
  listCustomerInvoices,
  updateInvoice,
} from '@/features/customers/use-cases/customer-invoices';
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
let today: string;

beforeAll(async () => {
  const email = uniqueEmail('hu-cli-08');
  owner = (await createUser(admin, { email, fullName: 'Facturas', password })).userId;
  client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  today = (await pool.query<{ d: string }>('select public.today_bogota()::text as d')).rows[0]!.d;
});

afterAll(async () => {
  const { data } = await admin.storage.from(USER_PHOTOS_BUCKET).list(`${owner}/customer_invoice`);
  const paths = (data ?? []).map((f) => `${owner}/customer_invoice/${f.name}`);
  if (paths.length > 0) await admin.storage.from(USER_PHOTOS_BUCKET).remove(paths);
  await pool.query(
    `begin; set local session_replication_role = replica;
     delete from public.photo where owner_id = '${owner}';
     delete from public.customer_invoice where owner_id = '${owner}'; commit;`,
  );
  await pool.query('delete from public.customer where owner_id = $1', [owner]);
  await admin.auth.admin.deleteUser(owner);
  await pool.end();
});

const deps = () => ({
  connectivity: fakeConnectivity(),
  auth: createSupabaseAuthRepository(() => client),
  imageCodec: napiImageCodec,
  storage: createSupabaseStorageRepository(() => client),
  invoices: createSupabaseInvoiceRepository(() => client),
});

const newCustomer = async () => {
  const id = randomUUID();
  await pool.query(`insert into public.customer (id, owner_id, name) values ($1, $2, 'Natalia')`, [
    id,
    owner,
  ]);
  return id;
};

/** Cliente con una factura recién creada (1 foto). */
const withInvoice = async () => {
  const customerId = await newCustomer();
  const [invoiceId, photoId] = [randomUUID(), randomUUID()];
  const created = await createInvoiceWithPhoto(deps(), {
    invoiceId,
    photoId,
    customerId,
    file: photoLikeJpeg(800, 600),
  });
  if (!created.ok) throw new Error(created.error.code);
  return { customerId, invoiceId, photoId };
};

describe('facturas contra Supabase local (HU-CLI-08)', () => {
  it('CA-1: sin facturas; al subir la foto existe una factura con fecha de hoy, sin N.º y con 1 foto', async () => {
    const customerId = await newCustomer();
    expect(await listCustomerInvoices(deps(), customerId)).toEqual({ ok: true, value: [] });
    const [invoiceId, photoId] = [randomUUID(), randomUUID()];
    expect(
      await createInvoiceWithPhoto(deps(), {
        invoiceId,
        photoId,
        customerId,
        file: photoLikeJpeg(1600, 1200),
      }),
    ).toEqual({ ok: true, value: { invoiceId } });
    const list = await listCustomerInvoices(deps(), customerId);
    if (!list.ok) throw new Error(list.error.code);
    expect(list.value).toEqual([
      { invoiceId, number: null, date: today, photos: [{ photoId, thumbUrl: expect.any(String) }] },
    ]);
    const thumb = await fetch(list.value[0]!.photos[0]!.thumbUrl);
    expect(thumb.headers.get('content-type')).toBe('image/webp');
  }, 30_000);

  it('CA-2 y CA-5: el N.º "0123" queda guardado, también repetido en otra factura', async () => {
    const { customerId, invoiceId } = await withInvoice();
    expect(await updateInvoice(deps(), invoiceId, { number: '0123' })).toEqual({
      ok: true,
      value: undefined,
    });
    const second = randomUUID();
    await createInvoiceWithPhoto(deps(), {
      invoiceId: second,
      photoId: randomUUID(),
      customerId,
      file: photoLikeJpeg(400, 300),
    });
    expect(await updateInvoice(deps(), second, { number: '0123', date: '2026-10-30' })).toEqual({
      ok: true,
      value: undefined,
    });
    const list = await listCustomerInvoices(deps(), customerId);
    // Orden: fecha descendente (la de hoy antes que la del 30/10).
    expect(list.ok && list.value.map((i) => [i.invoiceId, i.number])).toEqual([
      [invoiceId, '0123'],
      [second, '0123'],
    ]);
    // La base también valida la fecha.
    expect(
      await createSupabaseInvoiceRepository(() => client).update(invoiceId, { date: '2026-02-30' as never }),
    ).toEqual({ ok: false, error: { code: 'VALIDATION', retryable: false, details: { field: 'date' } } });
  }, 30_000);

  it('CA-3: al agregar una segunda foto, la factura tiene 2', async () => {
    const { customerId, invoiceId } = await withInvoice();
    expect(
      await addInvoicePhoto(deps(), { invoiceId, photoId: randomUUID(), file: photoLikeJpeg(400, 300) }),
    ).toEqual({
      ok: true,
      value: undefined,
    });
    const list = await listCustomerInvoices(deps(), customerId);
    expect(list.ok && list.value[0]!.photos).toHaveLength(2);
  }, 30_000);

  it('CA-4: con 1 foto, borrarla da invoiceDeleted = true y la factura ya no aparece', async () => {
    const { customerId, photoId } = await withInvoice();
    expect(await deleteInvoicePhoto(deps(), photoId)).toEqual({ ok: true, value: { invoiceDeleted: true } });
    expect(await listCustomerInvoices(deps(), customerId)).toEqual({ ok: true, value: [] });
  }, 30_000);

  it('CA-6: insertar una factura sin foto directo por la API falla', async () => {
    const customerId = await newCustomer();
    const { error } = await client
      .from('customer_invoice')
      .insert({ id: randomUUID(), owner_id: owner, customer_id: customerId });
    expect(error?.code).toBe('42501');
    const n = await pool.query(
      'select count(*)::int as n from public.customer_invoice where customer_id = $1',
      [customerId],
    );
    expect(n.rows[0].n).toBe(0);
  });

  it('si la subida de la primera foto falla, no se crea la factura', async () => {
    const customerId = await newCustomer();
    const unreachable = createClient<Database>('http://127.0.0.1:9', 'clave', {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const result = await createInvoiceWithPhoto(
      { ...deps(), storage: createSupabaseStorageRepository(() => unreachable) },
      { invoiceId: randomUUID(), photoId: randomUUID(), customerId, file: photoLikeJpeg(400, 300) },
    );
    expect(result).toEqual({ ok: false, error: { code: 'NETWORK_ERROR', retryable: true } });
    expect(await listCustomerInvoices(deps(), customerId)).toEqual({ ok: true, value: [] });
  });
});
