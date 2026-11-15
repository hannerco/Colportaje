// HU-CLI-11 · Archivar y restaurar contra Supabase local, por el mismo camino que la app.
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AppSupabaseClient } from '@/adapters/supabase/client';
import { createSupabaseCustomerRepository } from '@/adapters/supabase/customer-repository';
import { createSupabaseTitleRepository } from '@/adapters/supabase/title-repository';
import {
  buildCustomerListView,
  DEFAULT_CUSTOMER_LIST_PARAMS,
  type CustomerListParams,
} from '@/domain/customer-list';
import { localDate } from '@/domain/time';
import {
  archiveCustomer,
  getArchivePreview,
  restoreCustomer,
} from '@/features/customers/use-cases/customer-archive';
import { loadCustomerListData } from '@/features/customers/use-cases/customer-list';
import { createUser } from '../../scripts/lib/create-user';
import { fakeConnectivity } from '../support/fake-connectivity';
import { adminClient, anonClient, uniqueEmail } from './helpers/local-supabase';

const DB_URL = process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const CORAZON = '00000000-0000-4000-8000-000000000201'; // seed
const pool = new pg.Pool({ connectionString: DB_URL, max: 2 });
const admin = adminClient();
const password = 'clave-local-123';
let owner: string;
let client: AppSupabaseClient;

beforeAll(async () => {
  const email = uniqueEmail('hu-cli-11');
  owner = (await createUser(admin, { email, fullName: 'Archivar', password })).userId;
  client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
});

afterAll(async () => {
  await pool.query('delete from public.payment_event where owner_id = $1', [owner]);
  await pool.query('delete from public.payment where owner_id = $1', [owner]);
  await pool.query('delete from public.copy_event where owner_id = $1', [owner]);
  await pool.query('delete from public.copy where owner_id = $1', [owner]);
  await pool.query('delete from public.copy_counter where owner_id = $1', [owner]);
  await pool.query('delete from public.customer where owner_id = $1', [owner]);
  await admin.auth.admin.deleteUser(owner);
  await pool.end();
});

const deps = () => ({
  customers: createSupabaseCustomerRepository(() => client),
  titles: createSupabaseTitleRepository(() => client),
  connectivity: fakeConnectivity(),
});

const newCustomer = async (name: string) => {
  const id = randomUUID();
  await pool.query('insert into public.customer (id, owner_id, name) values ($1, $2, $3)', [id, owner, name]);
  return id;
};

/** Filas de la lista de clientes, por el mismo camino que `useCustomerList`. */
const listIds = async (params: Partial<CustomerListParams>) => {
  const data = await loadCustomerListData(deps());
  if (!data.ok) throw new Error(data.error.code);
  const today = (await pool.query<{ d: string }>('select public.today_bogota()::text as d')).rows[0]!.d;
  return buildCustomerListView(
    data.value.customers,
    data.value.accounts,
    { ...DEFAULT_CUSTOMER_LIST_PARAMS, includeProspects: true, ...params },
    localDate(today),
  ).rows.map((r) => r.id);
};

describe('archivar y restaurar contra Supabase local (HU-CLI-11)', () => {
  it('CA-1: con un libro vendido → CUSTOMER_HAS_BOOKS; la vista previa ya lo dice', async () => {
    const customer = await newCustomer('Con libro');
    await pool.query(
      `insert into public.copy (id, owner_id, title_id, number, status, customer_id, agreed_price, sold_at,
                                public_price_snapshot, colportor_price_snapshot, received_at)
       values ($1, $2, $3, 0, 'sold', $4, 95000, now(), 95000, 1000, '2026-10-30')`,
      [randomUUID(), owner, CORAZON, customer],
    );
    expect(await getArchivePreview(deps(), customer)).toMatchObject({
      ok: true,
      value: { canArchive: false, soldCount: 1 },
    });
    expect(await archiveCustomer(deps(), customer)).toEqual({
      ok: false,
      error: { code: 'CUSTOMER_HAS_BOOKS', retryable: false },
    });
  });

  it('CA-2 y CA-3: archiva un prospecto con 2 programados y 30.000 cobrados; al restaurar siguen cancelados', async () => {
    const customer = await newCustomer('Rubén Darío Vélez');
    const scheduled = [randomUUID(), randomUUID()];
    for (const [i, id] of scheduled.entries())
      await pool.query(
        `insert into public.payment (id, owner_id, customer_id, kind, status, agreed_amount, due_date, original_due_date)
         values ($1, $2, $3, 'scheduled', 'scheduled', 50000, public.today_bogota() + $4::int, public.today_bogota() + $4::int)`,
        [id, owner, customer, (i + 1) * 10],
      );
    const cash = randomUUID();
    await pool.query(
      `insert into public.payment (id, owner_id, customer_id, kind, status, paid_amount, paid_at, method)
       values ($1, $2, $3, 'extra', 'collected', 30000, public.today_bogota(), 'cash')`,
      [cash, owner, customer],
    );

    const preview = await getArchivePreview(deps(), customer);
    expect(preview.ok && preview.value.scheduledToCancel.map((p) => p.paymentId)).toEqual(scheduled);
    expect(await listIds({})).toContain(customer);

    expect(await archiveCustomer(deps(), customer)).toEqual({ ok: true, value: undefined });
    const payments = await pool.query(
      'select id, status, cancel_reason, leader_deposit_id from public.payment where customer_id = $1 order by id',
      [customer],
    );
    for (const row of payments.rows)
      expect(row).toEqual(
        row.id === cash
          ? { id: cash, status: 'collected', cancel_reason: null, leader_deposit_id: null } // sigue por entregar
          : { id: row.id, status: 'canceled', cancel_reason: 'customer_archived', leader_deposit_id: null },
      );
    // El cobrado sigue por entregar y su cliente consta como archivado (la etiqueta de Dinero, AF-47).
    const owned = await client.from('customer').select('archived_at').eq('id', customer).single();
    expect(owned.data?.archived_at).not.toBeNull();
    // R5: sale de Todos y de la búsqueda normal; está en Archivados y en "Buscar en Archivados".
    expect(await listIds({})).not.toContain(customer);
    expect(await listIds({ search: 'ruben' })).not.toContain(customer);
    expect(await listIds({ tab: 'archived' })).toContain(customer);
    expect(await listIds({ search: 'ruben', includeArchivedInSearch: true })).toContain(customer);

    expect(await restoreCustomer(deps(), customer)).toEqual({ ok: true, value: undefined });
    expect(await listIds({})).toContain(customer);
    const after = await pool.query(
      `select count(*)::int as n from public.payment where customer_id = $1 and status = 'canceled'`,
      [customer],
    );
    expect(after.rows[0].n).toBe(2);
  });

  it('CA-4: restaurar un cliente no archivado → CUSTOMER_NOT_ARCHIVED', async () => {
    const customer = await newCustomer('Activo');
    expect(await restoreCustomer(deps(), customer)).toEqual({
      ok: false,
      error: { code: 'CUSTOMER_NOT_ARCHIVED', retryable: false },
    });
  });

  it('por la API directa no se archiva (debe pasar por la función)', async () => {
    const customer = await newCustomer('Directo');
    const { error } = await client
      .from('customer')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', customer);
    expect(error?.message).toMatch(/^INVALID_TRANSITION/);
  });
});
