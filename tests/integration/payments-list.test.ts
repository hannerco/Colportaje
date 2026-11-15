// HU-DIN-03 · Lista de abonos contra Supabase local: la misma lectura del resumen (API con RLS) alimenta
// buildPaymentsListView, como en la app.
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AppSupabaseClient } from '@/adapters/supabase/client';
import { createSupabaseCustomerRepository } from '@/adapters/supabase/customer-repository';
import { createSupabaseMoneyRepository } from '@/adapters/supabase/money-repository';
import { createSupabaseTitleRepository } from '@/adapters/supabase/title-repository';
import {
  DEFAULT_PAYMENTS_LIST_PARAMS,
  defaultPaymentsSort,
  type PaymentsListParams,
} from '@/domain/payments-list';
import { addDays, localDate, type LocalDate } from '@/domain/time';
import { loadMoneySummaryData } from '@/features/money/use-cases/money-summary';
import { paymentsListFrom } from '@/features/money/use-cases/payments-list';
import { createUser } from '../../scripts/lib/create-user';
import { adminClient, anonClient, uniqueEmail } from './helpers/local-supabase';

const DB_URL = process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const pool = new pg.Pool({ connectionString: DB_URL, max: 2 });
const admin = adminClient();
const password = 'clave-local-123';
let owner: string;
let client: AppSupabaseClient;
let today: LocalDate;

beforeAll(async () => {
  const email = uniqueEmail('hu-din-03');
  owner = (await createUser(admin, { email, fullName: 'Lista de abonos', password })).userId;
  client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  today = localDate((await pool.query<{ d: string }>('select public.today_bogota()::text as d')).rows[0]!.d);
});

afterAll(async () => {
  await pool.query(
    `begin; set local session_replication_role = replica;
     delete from public.payment where owner_id = '${owner}';
     delete from public.leader_deposit where owner_id = '${owner}'; commit;`,
  );
  await pool.query('delete from public.customer where owner_id = $1', [owner]);
  await admin.auth.admin.deleteUser(owner);
  await pool.end();
});

const list = async (params: Partial<PaymentsListParams> = {}) => {
  const data = await loadMoneySummaryData({
    money: createSupabaseMoneyRepository(() => client),
    customers: createSupabaseCustomerRepository(() => client),
    titles: createSupabaseTitleRepository(() => client),
  });
  if (!data.ok) throw new Error(data.error.code);
  return paymentsListFrom(data.value, { ...DEFAULT_PAYMENTS_LIST_PARAMS, ...params }, today);
};

const insert = (sql: string) =>
  pool.query(`begin; set local session_replication_role = replica; ${sql}; commit;`);

describe('lista de abonos contra Supabase local (HU-DIN-03)', () => {
  it('conteos por vista, vencidos, cuota inicial, archivados, borrador y descartados', async () => {
    const [ana, oscar, gone] = [randomUUID(), randomUUID(), randomUUID()];
    await pool.query(
      `insert into public.customer (id, owner_id, name) values ($1, $4, 'Ana'), ($2, $4, 'Óscar'), ($3, $4, 'Descartado')`,
      [ana, oscar, gone, owner],
    );
    const draft = randomUUID();
    await insert(
      `insert into public.leader_deposit (id, owner_id, cash_amount) values ('${draft}', '${owner}', 10000)`,
    );
    // Ana: cuota inicial, 2 por cobrar vencidos (12 y 3 días), 1 futuro, 1 cancelado y 1 cobrado en un borrador.
    await insert(`
      insert into public.payment (id, owner_id, customer_id, kind, status, paid_at, due_date, original_due_date, paid_amount, method)
      values ('${randomUUID()}', '${owner}', '${ana}', 'down_payment', 'collected', '${today}'::date - 33, '${today}'::date - 33, '${today}'::date - 33, 80000, 'transfer');
      insert into public.payment (id, owner_id, customer_id, kind, status, agreed_amount, due_date, original_due_date)
      values ('${randomUUID()}', '${owner}', '${ana}', 'scheduled', 'scheduled', 60000, '${today}'::date - 12, '${today}'::date - 12),
             ('${randomUUID()}', '${owner}', '${ana}', 'scheduled', 'scheduled', 60000, '${today}'::date - 3, '${today}'::date - 3),
             ('${randomUUID()}', '${owner}', '${ana}', 'scheduled', 'scheduled', 60000, '${today}'::date + 2, '${today}'::date + 2);
      insert into public.payment (id, owner_id, customer_id, kind, status, agreed_amount, due_date, original_due_date, canceled_at, cancel_reason)
      values ('${randomUUID()}', '${owner}', '${ana}', 'scheduled', 'canceled', 40000, '${today}'::date + 9, '${today}'::date + 9, now(), 'manual');
      insert into public.payment (id, owner_id, customer_id, kind, status, paid_at, paid_amount, method, leader_deposit_id)
      values ('${randomUUID()}', '${owner}', '${ana}', 'extra', 'collected', '${today}', 10000, 'cash', '${draft}')`);
    // Óscar (archivado): un cobrado sin entregar. Descartado: un cobrado que no debe aparecer.
    await insert(`
      insert into public.payment (id, owner_id, customer_id, kind, status, paid_at, paid_amount, method)
      values ('${randomUUID()}', '${owner}', '${oscar}', 'extra', 'collected', '${today}', 30000, 'cash'),
             ('${randomUUID()}', '${owner}', '${gone}', 'extra', 'collected', '${today}', 99000, 'cash')`);
    await pool.query(`update public.customer set archived_at = now() where id = $1`, [oscar]);
    await pool.query(`update public.customer set deleted_at = now() where id = $1`, [gone]);

    const all = await list();
    expect(all.counts).toEqual({ all: 6, toCollect: 3, toDeliver: 3, delivered: 0, canceled: 1 });

    // CA-2: Por cobrar, de la más antigua a la más nueva; el chip deja los vencidos.
    const toCollect = await list({ view: 'to_collect', sort: defaultPaymentsSort('to_collect') });
    expect(toCollect.rows.map((r) => [r.isOverdue, r.overdueDays, r.canCollect])).toEqual([
      [true, 12, true],
      [true, 3, true],
      [false, 0, true],
    ]);
    expect((await list({ view: 'to_collect', overdueOnly: true })).rows).toHaveLength(2);

    // CA-3: la cuota inicial con su valor y fecha reales como acordados.
    expect(all.rows.find((r) => r.kind === 'down_payment')).toMatchObject({
      agreedAmount: 80_000,
      agreedDate: addDays(today, -33),
      paidAmount: 80_000,
    });

    // CA-5 y el borrador: Por entregar marca al archivado y al que está en un borrador.
    const toDeliver = await list({ view: 'to_deliver', sort: { key: 'customer', dir: 'asc' } });
    // Las dos filas de Ana empatan en nombre y se desempatan por id (aleatorio): se comparan sin ese orden.
    const rows = toDeliver.rows.map((r) => `${r.customer.name}|${r.customer.archived}|${r.inDraftDeposit}`);
    expect(rows[2]).toBe('Óscar|true|false');
    expect(rows.slice(0, 2).sort()).toEqual(['Ana|false|false', 'Ana|false|true']);

    // CA-4: Efectivo deja solo cobrados en efectivo; los conteos no cambian.
    const cash = await list({ method: 'cash' });
    expect(cash.rows.every((r) => r.method === 'cash')).toBe(true);
    expect(cash.counts).toEqual(all.counts);
  });
});
