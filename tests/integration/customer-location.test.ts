// HU-CLI-06 · Guardar y quitar la ubicación contra Supabase local, por el mismo camino que la app.
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createSupabaseAuthRepository } from '@/adapters/supabase/auth-repository';
import type { AppSupabaseClient } from '@/adapters/supabase/client';
import { createSupabaseCustomerRepository } from '@/adapters/supabase/customer-repository';
import { mapsLinkFor } from '@/domain/customer-location';
import { clearCustomerLocation, setCustomerLocation } from '@/features/customers/use-cases/customer-location';
import { createUser } from '../../scripts/lib/create-user';
import { fakeConnectivity } from '../support/fake-connectivity';
import { adminClient, anonClient, uniqueEmail } from './helpers/local-supabase';

const DB_URL = process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const pool = new pg.Pool({ connectionString: DB_URL, max: 2 });
const admin = adminClient();
const password = 'clave-local-123';
const users: { id: string; client: AppSupabaseClient }[] = [];

const newUser = async (label: string) => {
  const email = uniqueEmail(label);
  const { userId } = await createUser(admin, { email, fullName: label, password });
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  users.push({ id: userId, client });
};

beforeAll(async () => {
  await newUser('hu-cli-06-a');
  await newUser('hu-cli-06-b');
});

afterAll(async () => {
  for (const { id } of users) {
    await pool.query('delete from public.customer where owner_id = $1', [id]);
    await admin.auth.admin.deleteUser(id);
  }
  await pool.end();
});

const deps = (client: AppSupabaseClient) => {
  const points = new Map<string, { lat: number; lng: number }>();
  return {
    customers: createSupabaseCustomerRepository(() => client),
    connectivity: fakeConnectivity(),
    auth: createSupabaseAuthRepository(() => client),
    lastPickerPoint: {
      get: (u: string) => points.get(u) ?? null,
      set: (u: string, p: { lat: number; lng: number }) => void points.set(u, p),
      clear: () => points.clear(),
    },
  };
};

const newCustomer = async (owner: string) => {
  const id = randomUUID();
  await pool.query(
    `insert into public.customer (id, owner_id, name, updated_at) values ($1, $2, 'Natalia', '2026-01-01')`,
    [id, owner],
  );
  return id;
};

const row = async (id: string) =>
  (
    await pool.query(
      `select latitude::float8 as latitude, longitude::float8 as longitude, location_accuracy_m,
              maps_url, address, updated_at > '2026-01-02' as touched
       from public.customer where id = $1`,
      [id],
    )
  ).rows[0];

const untouch = (id: string) =>
  pool.query(
    `begin; set local session_replication_role = replica;
     update public.customer set updated_at = '2026-01-01' where id = '${id}'; commit;`,
  );

describe('ubicación del cliente contra Supabase local (HU-CLI-06)', () => {
  it('CA-1 / R4: queda guardada, mueve la última modificación y el enlace usa las coordenadas', async () => {
    const [a] = users as [(typeof users)[0]];
    const id = await newCustomer(a.id);
    expect(
      await setCustomerLocation(deps(a.client), id, {
        latitude: 6.2518,
        longitude: -75.5915,
        accuracyMeters: 12,
      }),
    ).toEqual({ ok: true, value: undefined });
    const saved = await row(id);
    expect(saved).toMatchObject({
      latitude: 6.2518,
      longitude: -75.5915,
      location_accuracy_m: 12,
      touched: true,
    });
    expect(mapsLinkFor({ ...saved, mapsUrl: saved.maps_url })).toBe(
      'https://www.google.com/maps/search/?api=1&query=6.2518,-75.5915',
    );
  });

  it('CA-3: latitud 91 → VALIDATION latitude; la base también lo rechaza', async () => {
    const [a] = users as [(typeof users)[0]];
    const id = await newCustomer(a.id);
    expect(
      await setCustomerLocation(deps(a.client), id, { latitude: 91, longitude: 0, accuracyMeters: 5 }),
    ).toMatchObject({ ok: false, error: { code: 'VALIDATION', details: { field: 'latitude' } } });
    expect(
      await createSupabaseCustomerRepository(() => a.client).setLocation(id, {
        latitude: 91,
        longitude: 0,
        accuracyMeters: 5,
      }),
    ).toMatchObject({ ok: false, error: { code: 'VALIDATION', details: { field: 'latitude' } } });
    expect(await row(id)).toMatchObject({ latitude: null, longitude: null, touched: false });
  });

  it('CA-5 / R4: quitar deja las dos coordenadas y la precisión vacías y mueve la última modificación', async () => {
    const [a] = users as [(typeof users)[0]];
    const id = await newCustomer(a.id);
    await setCustomerLocation(deps(a.client), id, { latitude: 6.25, longitude: -75.59, accuracyMeters: 80 });
    await untouch(id);
    expect(await clearCustomerLocation(deps(a.client), id)).toEqual({ ok: true, value: undefined });
    expect(await row(id)).toMatchObject({
      latitude: null,
      longitude: null,
      location_accuracy_m: null,
      touched: true,
    });
  });

  it('archivado → CUSTOMER_ARCHIVED; de otro usuario o inexistente → NOT_FOUND', async () => {
    const [a, b] = users as [(typeof users)[0], (typeof users)[0]];
    const archived = await newCustomer(a.id);
    await pool.query('update public.customer set archived_at = now() where id = $1', [archived]);
    const loc = { latitude: 6.25, longitude: -75.59, accuracyMeters: null };
    expect(await setCustomerLocation(deps(a.client), archived, loc)).toMatchObject({
      ok: false,
      error: { code: 'CUSTOMER_ARCHIVED' },
    });
    const others = await newCustomer(a.id);
    expect(await setCustomerLocation(deps(b.client), others, loc)).toMatchObject({
      ok: false,
      error: { code: 'NOT_FOUND' },
    });
    expect(await row(others)).toMatchObject({ latitude: null });
    expect(await clearCustomerLocation(deps(a.client), randomUUID())).toMatchObject({
      ok: false,
      error: { code: 'NOT_FOUND' },
    });
  });
});
