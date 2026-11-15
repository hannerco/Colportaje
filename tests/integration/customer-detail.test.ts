// HU-CLI-12 · Ficha del cliente contra Supabase local: la lectura completa por la API (RLS), como en la app.
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AppSupabaseClient } from '@/adapters/supabase/client';
import { createSupabaseCustomerRepository } from '@/adapters/supabase/customer-repository';
import { createSupabaseInvoiceRepository } from '@/adapters/supabase/invoice-repository';
import { createSupabasePaymentRepository } from '@/adapters/supabase/payment-repository';
import { createSupabasePhotoRepository } from '@/adapters/supabase/photo-repository';
import { createSupabaseStorageRepository } from '@/adapters/supabase/storage-repository';
import { addDays, localDate, type LocalDate } from '@/domain/time';
import { loadCustomerDetail } from '@/features/customers/use-cases/customer-detail';
import { reschedulePayment } from '@/features/payments/use-cases/reschedule';
import { createUser } from '../../scripts/lib/create-user';
import { fakeConnectivity } from '../support/fake-connectivity';
import { adminClient, anonClient, uniqueEmail } from './helpers/local-supabase';

const DB_URL = process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const RELIGIOSO = '00000000-0000-4000-8000-000000000201'; // seed
const pool = new pg.Pool({ connectionString: DB_URL, max: 2 });
const admin = adminClient();
const password = 'clave-local-123';
const users: { id: string; client: AppSupabaseClient }[] = [];
let today: LocalDate;

const newUser = async (label: string) => {
  const email = uniqueEmail(label);
  const { userId } = await createUser(admin, { email, fullName: label, password });
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  users.push({ id: userId, client });
};

beforeAll(async () => {
  await newUser('hu-cli-12-a');
  await newUser('hu-cli-12-b');
  today = localDate((await pool.query<{ d: string }>('select public.today_bogota()::text as d')).rows[0]!.d);
});

afterAll(async () => {
  for (const { id } of users) {
    await pool.query('delete from public.payment_reschedule where owner_id = $1', [id]);
    await pool.query('delete from public.payment_event where owner_id = $1', [id]);
    await pool.query(
      `begin; set local session_replication_role = replica;
       delete from public.payment where owner_id = '${id}';
       delete from public.leader_deposit_event where owner_id = '${id}';
       delete from public.leader_deposit where owner_id = '${id}'; commit;`,
    );
    await pool.query('delete from public.leader_deposit_counter where owner_id = $1', [id]);
    await pool.query('delete from public.copy_event where owner_id = $1', [id]);
    await pool.query('delete from public.copy where owner_id = $1', [id]);
    await pool.query('delete from public.copy_counter where owner_id = $1', [id]);
    await pool.query('delete from public.customer where owner_id = $1', [id]);
    await admin.auth.admin.deleteUser(id);
  }
  await pool.end();
});

const a = () => users[0]!;
const deps = (client = a().client) => ({
  customers: createSupabaseCustomerRepository(() => client),
  payments: createSupabasePaymentRepository(() => client),
  photos: createSupabasePhotoRepository(() => client),
  invoices: createSupabaseInvoiceRepository(() => client),
  storage: createSupabaseStorageRepository(() => client),
  connectivity: fakeConnectivity(),
  clock: { now: () => new Date() },
});

const newCustomer = async (extra = '') => {
  const id = randomUUID();
  await pool.query(
    `insert into public.customer (id, owner_id, name, phone, address) values ($1, $2, 'María Camila Henao', '301 557 9032', 'Laureles')`,
    [id, a().id],
  );
  if (extra) await pool.query(`update public.customer set ${extra} where id = $1`, [id]);
  return id;
};

const sell = (customer: string, price: number, publicPrice = price) =>
  pool.query(
    `insert into public.copy (id, owner_id, title_id, number, status, customer_id, agreed_price, sold_at,
                              public_price_snapshot, colportor_price_snapshot, received_at)
     values ($1, $2, $3, 0, 'sold', $4, $5, now(), $6, 1000, '2026-10-01')`,
    [randomUUID(), a().id, RELIGIOSO, customer, price, publicPrice],
  );

/** Un programado con fecha acordada `due` (puede ser pasada: se inserta sin triggers). */
const scheduled = async (customer: string, due: LocalDate, amount = 60_000, status = 'scheduled') => {
  const id = randomUUID();
  await pool.query(
    `begin; set local session_replication_role = replica;
     insert into public.payment (id, owner_id, customer_id, kind, status, agreed_amount, due_date, original_due_date,
                                 canceled_at, cancel_reason)
     values ('${id}', '${a().id}', '${customer}', 'scheduled', '${status}', ${amount}, '${due}', '${due}',
             ${status === 'canceled' ? 'now()' : 'null'}, ${status === 'canceled' ? "'manual'" : 'null'});
     commit;`,
  );
  return id;
};

const load = async (customer: string, client = a().client) => loadCustomerDetail(deps(client), customer);

describe('ficha del cliente contra Supabase local (HU-CLI-12)', () => {
  it('CA-1 y CA-2: cuenta, abonos en orden con vencido, Cobrar, cancelado aparte, libros y contacto', async () => {
    const customer = await newCustomer();
    await sell(customer, 200_000);
    await sell(customer, 140_000);
    await sell(customer, 120_000, 130_000);
    await pool.query(
      `insert into public.payment (id, owner_id, customer_id, kind, status, paid_at, due_date, original_due_date, paid_amount, method)
       values ($1, $2, $3, 'down_payment', 'collected', $4, $4, $4, 80000, 'transfer')`,
      [randomUUID(), a().id, customer, addDays(today, -33)],
    );
    await scheduled(customer, addDays(today, -19));
    await scheduled(customer, addDays(today, -5));
    await scheduled(customer, addDays(today, 9));
    await scheduled(customer, addDays(today, 25), 40_000, 'canceled');

    const result = await load(customer);
    if (!result.ok) throw new Error(result.error.code);
    const d = result.value;
    expect(d.account).toMatchObject({ balance: 380_000, paidTotal: 80_000, debt: 460_000 });
    expect(d.payments.map((p) => [p.kind, p.isOverdue, p.can.collect])).toEqual([
      ['down_payment', false, false],
      ['scheduled', true, true],
      ['scheduled', true, true],
      ['scheduled', false, true],
    ]);
    expect(d.payments[1]!.overdueDays).toBe(19);
    expect(d.canceledPayments).toHaveLength(1);
    expect(d.books.map((b) => b.priceDelta).sort()).toEqual([-10_000, null, null]);
    expect(d.contact).toEqual({
      phone: '301 557 9032',
      telLink: 'tel:3015579032',
      whatsappLink: 'https://wa.me/573015579032',
    });
    expect(d.mapsLink).toBe('https://www.google.com/maps/search/?api=1&query=Laureles');
    expect(d).toMatchObject({ infoPhotos: [], invoices: [], location: null });
  });

  it('CA-3: un abono prorrogado trae su fecha original y cuántas prórrogas tuvo', async () => {
    const customer = await newCustomer();
    await sell(customer, 100_000);
    const original = addDays(today, 3);
    const payment = await scheduled(customer, original);
    const moved = await reschedulePayment(deps(), payment, { newDueDate: addDays(today, 17) });
    if (!moved.ok) throw new Error(moved.error.code);
    const result = await load(customer);
    expect(result.ok && result.value.payments[0]).toMatchObject({
      dueDate: addDays(today, 17),
      originalDueDate: original,
      rescheduleCount: 1,
    });
  });

  it('CA-4: un abono en un Abibono confirmado no se edita ni se borra; ubicación aproximada', async () => {
    const customer = await newCustomer('latitude = 6.2518, longitude = -75.5915, location_accuracy_m = 80');
    await sell(customer, 100_000);
    const payment = randomUUID();
    const deposit = randomUUID();
    await pool.query(
      `insert into public.payment (id, owner_id, customer_id, kind, status, paid_at, paid_amount, method)
       values ($1, $2, $3, 'extra', 'collected', $4, 50000, 'cash')`,
      [payment, a().id, customer, today],
    );
    const c = await pool.connect();
    try {
      await c.query('begin');
      await c.query('insert into public.leader_deposit (id, owner_id, cash_amount) values ($1, $2, 50000)', [
        deposit,
        a().id,
      ]);
      await c.query('update public.payment set leader_deposit_id = $2 where id = $1', [payment, deposit]);
      await c.query('commit');
      await c.query('begin');
      await c.query(
        `update public.leader_deposit set status = 'confirmed', confirmed_at = now() where id = $1`,
        [deposit],
      );
      await c.query(`update public.payment set status = 'delivered' where id = $1`, [payment]);
      await c.query('commit');
    } finally {
      c.release();
    }
    const result = await load(customer);
    if (!result.ok) throw new Error(result.error.code);
    expect(result.value.payments[0]).toMatchObject({
      status: 'delivered',
      deposit: { id: deposit, status: 'confirmed' },
      can: { edit: false, delete: false, collect: false },
    });
    expect(result.value.location).toEqual({
      latitude: 6.2518,
      longitude: -75.5915,
      accuracyMeters: 80,
      isApproximate: true,
    });
    expect(result.value.mapsLink).toBe('https://www.google.com/maps/search/?api=1&query=6.2518,-75.5915');
  });

  it('CA-5: sin libros y con una cuota cobrada → aviso "Aún no tiene libro"', async () => {
    const customer = await newCustomer();
    await pool.query(
      `insert into public.payment (id, owner_id, customer_id, kind, status, paid_at, paid_amount, method)
       values ($1, $2, $3, 'extra', 'collected', $4, 20000, 'cash')`,
      [randomUUID(), a().id, customer, today],
    );
    const result = await load(customer);
    expect(result.ok && result.value.notices).toEqual({ noBook: true, excess: null });
  });

  it('descartado, inexistente o de otro usuario → NOT_FOUND', async () => {
    const discarded = await newCustomer('deleted_at = now()');
    expect(await load(discarded)).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
    expect(await load(randomUUID())).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
    const mine = await newCustomer();
    expect(await load(mine, users[1]!.client)).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
  });
});
