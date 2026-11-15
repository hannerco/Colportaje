// HU-CLI-04 Â· Lista de clientes contra Supabase local: la lectura completa por la API (RLS) alimenta
// buildCustomerListView igual que en la app.
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AppSupabaseClient } from '@/adapters/supabase/client';
import { createSupabaseCustomerRepository } from '@/adapters/supabase/customer-repository';
import { createSupabaseTitleRepository } from '@/adapters/supabase/title-repository';
import { buildCustomerListView, DEFAULT_CUSTOMER_LIST_PARAMS } from '@/domain/customer-list';
import { localDate } from '@/domain/time';
import { loadCustomerListData } from '@/features/customers/use-cases/customer-list';
import { createUser } from '../../scripts/lib/create-user';
import { adminClient, anonClient, uniqueEmail } from './helpers/local-supabase';

const DB_URL = process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const CORAZON = '00000000-0000-4000-8000-000000000201'; // seed
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
  const user = { id: userId, client };
  users.push(user);
  return user;
};

beforeAll(async () => {
  await newUser('hu-cli-04-a');
  await newUser('hu-cli-04-b');
});

afterAll(async () => {
  for (const { id } of users) {
    await pool.query('delete from public.payment where owner_id = $1', [id]);
    await pool.query('delete from public.copy_event where owner_id = $1', [id]);
    await pool.query('delete from public.copy where owner_id = $1', [id]);
    await pool.query('delete from public.copy_counter where owner_id = $1', [id]);
    await pool.query('delete from public.customer where owner_id = $1', [id]);
    await admin.auth.admin.deleteUser(id);
  }
  await pool.end();
});

const customer = async (owner: string, name: string, extra = '') => {
  const id = randomUUID();
  await pool.query(`insert into public.customer (id, owner_id, name) values ($1, $2, $3)`, [id, owner, name]);
  if (extra) await pool.query(`update public.customer set ${extra} where id = $1`, [id]);
  return id;
};

const sell = async (owner: string, customerId: string, price: number) =>
  pool.query(
    `insert into public.copy (id, owner_id, title_id, number, status, customer_id, agreed_price, sold_at,
                              public_price_snapshot, colportor_price_snapshot, received_at)
     values ($1, $2, $3, 0, 'sold', $4, $5, now(), $5, 1000, '2026-10-01')`,
    [randomUUID(), owner, CORAZON, customerId, price],
  );

const pay = async (owner: string, customerId: string, amount: number, overdue = false) =>
  overdue
    ? pool.query(
        `begin; set local session_replication_role = replica;
         insert into public.payment (id, owner_id, customer_id, kind, status, agreed_amount, due_date, original_due_date)
         values ('${randomUUID()}', '${owner}', '${customerId}', 'scheduled', 'scheduled', ${amount},
                 public.today_bogota() - 3, public.today_bogota() - 3); commit;`,
      )
    : pool.query(
        `insert into public.payment (id, owner_id, customer_id, kind, status, paid_at, paid_amount, method)
         values ($1, $2, $3, 'extra', 'collected', public.today_bogota(), $4, 'cash')`,
        [randomUUID(), owner, customerId, amount],
      );

describe('lista de clientes contra Supabase local (HU-CLI-04)', () => {
  it('carga por la API solo lo del usuario, sin descartados, y la vista cuadra', async () => {
    const [a, b] = users as [(typeof users)[0], (typeof users)[0]];
    const paying = await customer(a.id, 'Pagando');
    await sell(a.id, paying, 100_000);
    const overdue = await customer(a.id, 'Vencido');
    await sell(a.id, overdue, 100_000);
    await pay(a.id, overdue, 50_000, true);
    const settled = await customer(a.id, 'Saldado');
    await sell(a.id, settled, 100_000);
    await pay(a.id, settled, 100_000);
    await customer(a.id, 'Prospecto', `phone = '301 557 9032', address = 'Cra 45, Belén'`);
    const archived = await customer(a.id, 'Archivado', 'archived_at = now()');
    await sell(a.id, archived, 50_000);
    await customer(a.id, 'Descartado', 'deleted_at = now()');
    await sell(b.id, await customer(b.id, 'De otro usuario'), 70_000);

    const data = await loadCustomerListData({
      customers: createSupabaseCustomerRepository(() => a.client),
      titles: createSupabaseTitleRepository(() => a.client),
    });
    if (!data.ok) throw new Error(data.error.code);
    const today = (await pool.query<{ d: string }>('select public.today_bogota()::text as d')).rows[0]!.d;
    const v = buildCustomerListView(
      data.value.customers,
      data.value.accounts,
      { ...DEFAULT_CUSTOMER_LIST_PARAMS, includeProspects: true, sort: { key: 'name', dir: 'asc' } },
      localDate(today),
    );
    expect(v.counts).toEqual({ all: 4, debtors: 2, settled: 1, archived: 1 });
    expect(v.statusCounts).toEqual({ current: 1, overdue: 1, settled: 1 });
    expect(v.rows.map((r) => [r.name, r.standing, r.balance, r.books?.title ?? null])).toEqual([
      ['Pagando', 'current', 100_000, 'Esperanza para hoy'],
      ['Prospecto', null, 0, null],
      ['Saldado', 'settled', 0, 'Esperanza para hoy'],
      ['Vencido', 'overdue', 100_000, 'Esperanza para hoy'],
    ]);
    expect(v.rows.find((r) => r.name === 'Saldado')!.lastPaymentAt).toBe(today);

    // HU-CLI-05: la carga trae teléfono y dirección para buscar (sin el interruptor de prospectos).
    const search = (text: string) =>
      buildCustomerListView(
        data.value.customers,
        data.value.accounts,
        { ...DEFAULT_CUSTOMER_LIST_PARAMS, search: text },
        localDate(today),
      ).rows.map((r) => r.name);
    expect(search('belen')).toEqual(['Prospecto']);
    expect(search('5579032')).toEqual(['Prospecto']);
    expect(search('esperanza para hoy').sort()).toEqual(['Pagando', 'Saldado', 'Vencido']);
  }, 30_000);
});
