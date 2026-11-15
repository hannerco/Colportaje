// HU-DIN-06 · Lista de Abibonos contra Supabase local: la misma lectura de Dinero (API con RLS) alimenta
// buildDepositsListView, como en la app.
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AppSupabaseClient } from '@/adapters/supabase/client';
import { createSupabaseCustomerRepository } from '@/adapters/supabase/customer-repository';
import { createSupabaseMoneyRepository } from '@/adapters/supabase/money-repository';
import { createSupabaseTitleRepository } from '@/adapters/supabase/title-repository';
import { DEFAULT_DEPOSITS_LIST_PARAMS, type DepositsListParams } from '@/domain/deposits-list';
import { depositsListFrom } from '@/features/money/use-cases/deposits-list';
import { loadMoneySummaryData } from '@/features/money/use-cases/money-summary';
import { createUser } from '../../scripts/lib/create-user';
import { adminClient, anonClient, uniqueEmail } from './helpers/local-supabase';

const DB_URL = process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const pool = new pg.Pool({ connectionString: DB_URL, max: 2 });
const admin = adminClient();
const password = 'clave-local-123';
let owner: string;
let stranger: string;
let client: AppSupabaseClient;

beforeAll(async () => {
  const email = uniqueEmail('hu-din-06');
  owner = (await createUser(admin, { email, fullName: 'Lista de Abibonos', password })).userId;
  stranger = (await createUser(admin, { email: uniqueEmail('hu-din-06-b'), fullName: 'Otro', password }))
    .userId;
  client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
});

afterAll(async () => {
  for (const user of [owner, stranger]) {
    await pool.query(
      `begin; set local session_replication_role = replica;
       delete from public.photo where owner_id = '${user}';
       delete from public.leader_deposit_event where owner_id = '${user}';
       delete from public.leader_deposit where owner_id = '${user}';
       delete from public.leader_deposit_counter where owner_id = '${user}'; commit;`,
    );
    await admin.auth.admin.deleteUser(user);
  }
  await pool.end();
});

const list = async (params: Partial<DepositsListParams> = {}) => {
  const data = await loadMoneySummaryData({
    money: createSupabaseMoneyRepository(() => client),
    customers: createSupabaseCustomerRepository(() => client),
    titles: createSupabaseTitleRepository(() => client),
  });
  if (!data.ok) throw new Error(data.error.code);
  return depositsListFrom(data.value, { ...DEFAULT_DEPOSITS_LIST_PARAMS, ...params });
};

/** Un Abibono con recibo; si `confirm`, confirmado (como lo dejará HU-DIN-05: número por el trigger). */
const deposit = async (
  user: string,
  o: {
    title?: string;
    date: string;
    cash: number;
    transfer: number;
    confirm: boolean;
    receipt: 'none' | 'active' | 'deleted';
  },
) => {
  const id = randomUUID();
  await pool.query(
    `insert into public.leader_deposit (id, owner_id, title, deposit_date, cash_amount, transfer_amount)
     values ($1, $2, $3, $4, $5, $6)`,
    [id, user, o.title ?? null, o.date, o.cash, o.transfer],
  );
  if (o.receipt !== 'none') {
    const photo = randomUUID();
    await pool.query(
      `insert into public.photo (id, owner_id, kind, path, bytes, leader_deposit_id, deleted_at)
       values ($1, $2, 'deposit_receipt', $3, 10, $4, $5)`,
      [photo, user, `${user}/deposit_receipt/${photo}.webp`, id, o.receipt === 'deleted' ? new Date() : null],
    );
  }
  if (o.confirm)
    await pool.query(
      `update public.leader_deposit set status = 'confirmed', confirmed_at = now() where id = $1`,
      [id],
    );
  return id;
};

describe('lista de Abibonos contra Supabase local (HU-DIN-06)', () => {
  it('CA-1 a CA-4 con la lectura de Dinero', async () => {
    const c = (date: string, cash: number, transfer: number, title?: string) =>
      deposit(owner, { date, cash, transfer, confirm: true, receipt: 'active', ...(title ? { title } : {}) });
    await c('2026-09-20', 200_000, 80_000);
    await c('2026-10-01', 150_000, 100_000, 'Donación campaña');
    await c('2026-10-10', 300_000, 120_000);
    await c('2026-10-25', 180_000, 0);
    await c('2026-11-01', 210_000, 100_000);
    // Un borrador sin recibo (su único recibo está borrado), y uno de otro usuario que no aparece.
    const pending = await deposit(owner, {
      date: '2026-11-05',
      cash: 50_000,
      transfer: 0,
      confirm: false,
      receipt: 'deleted',
    });
    await deposit(stranger, {
      date: '2026-11-05',
      cash: 999_000,
      transfer: 0,
      confirm: true,
      receipt: 'active',
    });

    const all = await list();
    expect(all.count).toBe(6);
    expect(all.totalDeliveredToLeader).toBe(1_440_000);
    expect(all.rows[0]).toMatchObject({
      depositId: pending,
      title: 'Abibono (6)',
      status: 'draft',
      hasReceipt: false,
    });
    expect(all.rows.filter((r) => r.status === 'confirmed').every((r) => r.hasReceipt)).toBe(true);

    expect((await list({ search: 'donacion' })).rows.map((r) => r.title)).toEqual(['Donación campaña']);
    expect((await list({ sort: { key: 'total', dir: 'desc' } })).rows[0]!.total).toBe(420_000);
    // Los confirmados recibieron los números 1 a 5 en orden de confirmación.
    expect((await list({ sort: { key: 'name', dir: 'asc' } })).rows.map((r) => r.title)).toEqual([
      'Abibono (1)',
      'Abibono (3)',
      'Abibono (4)',
      'Abibono (5)',
      'Abibono (6)',
      'Donación campaña',
    ]);
  });
});
