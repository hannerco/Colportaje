// HU-INV-04 · Lista de ejemplares contra Supabase local, por el mismo camino que la app
// (repositorios con la sesión del usuario → RLS → buildCopiesListView).
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AppSupabaseClient } from '@/adapters/supabase/client';
import { createSupabaseCopyRepository } from '@/adapters/supabase/copy-repository';
import { createSupabaseCustomerRepository } from '@/adapters/supabase/customer-repository';
import { createSupabaseTitleRepository } from '@/adapters/supabase/title-repository';
import { buildCopiesListView, DEFAULT_COPIES_LIST_PARAMS } from '@/domain/copies-list';
import { loadCopiesListData } from '@/features/inventory/use-cases/copies-list';
import { createUser } from '../../scripts/lib/create-user';
import { adminClient, anonClient, uniqueEmail } from './helpers/local-supabase';

const DB_URL = process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const CULTURAL = '00000000-0000-4000-8000-000000000101'; // público 75.000
const MINI = '00000000-0000-4000-8000-000000000301';

const pool = new pg.Pool({ connectionString: DB_URL, max: 2 });
const admin = adminClient();
const password = 'clave-local-123';
const owners: string[] = [];

const signIn = async (label: string) => {
  const email = uniqueEmail(label);
  const { userId } = await createUser(admin, { email, fullName: label, password });
  owners.push(userId);
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { id: userId, client };
};

const deps = (client: AppSupabaseClient) => ({
  copies: createSupabaseCopyRepository(() => client),
  titles: createSupabaseTitleRepository(() => client),
  customers: createSupabaseCustomerRepository(() => client),
});

const insertCopy = async (owner: string, titleId: string, extra: Record<string, unknown> = {}) => {
  const values: Record<string, unknown> = {
    id: randomUUID(),
    owner_id: owner,
    title_id: titleId,
    number: 0,
    public_price_snapshot: titleId === MINI ? null : 75_000,
    colportor_price_snapshot: 1_000,
    ...extra,
  };
  const keys = Object.keys(values);
  await pool.query(
    `insert into public.copy (${keys.join(', ')}) values (${keys.map((_, i) => `$${i + 1}`).join(', ')})`,
    Object.values(values),
  );
  return values.id as string;
};

let a: { id: string; client: AppSupabaseClient };
let b: { id: string; client: AppSupabaseClient };
let soldId: string;

beforeAll(async () => {
  a = await signIn('hu-inv-04-a');
  b = await signIn('hu-inv-04-b');
  const customer = randomUUID();
  await pool.query(
    `insert into public.customer (id, owner_id, name, avatar_emoji) values ($1, $2, 'Gloria Inés Patiño', '🌻')`,
    [customer, a.id],
  );
  await insertCopy(a.id, CULTURAL, { received_at: '2026-10-30' });
  soldId = await insertCopy(a.id, CULTURAL, {
    status: 'sold',
    customer_id: customer,
    agreed_price: 70_000,
    sold_at: '2026-11-02T15:00:00Z',
    received_at: '2026-10-20',
  });
  await insertCopy(a.id, MINI);
  await insertCopy(a.id, CULTURAL, { deleted_at: new Date().toISOString() });
  await insertCopy(b.id, CULTURAL);
});

afterAll(async () => {
  for (const owner of owners) {
    await pool.query('delete from public.copy_event where owner_id = $1', [owner]);
    await pool.query('delete from public.copy where owner_id = $1', [owner]);
    await pool.query('delete from public.copy_counter where owner_id = $1', [owner]);
    await pool.query('delete from public.customer where owner_id = $1', [owner]);
    await admin.auth.admin.deleteUser(owner);
  }
  await pool.end();
});

describe('lista de ejemplares contra Supabase local (HU-INV-04)', () => {
  it('solo los del usuario, sin minibooks ni eliminados, con cliente, precio y diferencia', async () => {
    const data = await loadCopiesListData(deps(a.client));
    if (!data.ok) throw new Error(data.error.code);
    const result = buildCopiesListView(data.value.copies, data.value.titles, data.value.customers, {
      ...DEFAULT_COPIES_LIST_PARAMS,
      sort: { key: 'sold', dir: 'desc' },
    });
    expect(result.counts).toEqual({ all: 2, inStock: 1, sold: 1, priceChanged: 1 });
    expect(result.rows[0]).toMatchObject({
      copyId: soldId,
      titleName: 'Salud y bienestar en familia',
      status: 'sold',
      customer: { name: 'Gloria Inés Patiño', avatarEmoji: '🌻' },
      rowDate: '2026-11-02',
      receivedAt: '2026-10-20',
      price: 70_000,
      priceDelta: -5_000,
    });
    expect(result.rows[1]).toMatchObject({
      status: 'in_stock',
      rowDate: null,
      price: 75_000,
      customer: null,
    });
  });

  it('RLS A/B: B solo ve su ejemplar y ningún cliente de A', async () => {
    const data = await loadCopiesListData(deps(b.client));
    if (!data.ok) throw new Error(data.error.code);
    expect(data.value.copies).toHaveLength(1);
    expect(data.value.customers).toEqual([]);
  });
});
