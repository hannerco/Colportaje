// HU-INV-05 · Detalle de un ejemplar y fecha de recibido contra Supabase local, por el mismo camino que la app.
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AppSupabaseClient } from '@/adapters/supabase/client';
import { createSupabaseCopyRepository } from '@/adapters/supabase/copy-repository';
import { createSupabaseCustomerRepository } from '@/adapters/supabase/customer-repository';
import { createSupabaseTitleRepository } from '@/adapters/supabase/title-repository';
import { localDate } from '@/domain/time';
import { loadCopyDetail, updateReceivedDate } from '@/features/inventory/use-cases/copy-detail';
import { createUser } from '../../scripts/lib/create-user';
import { fakeConnectivity } from '../support/fake-connectivity';
import { adminClient, anonClient, uniqueEmail } from './helpers/local-supabase';

const DB_URL = process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const TITLE = '00000000-0000-4000-8000-000000000101'; // seed: "Salud y bienestar en familia"
const pool = new pg.Pool({ connectionString: DB_URL, max: 2 });
const admin = adminClient();
const password = 'clave-local-123';
const owners: string[] = [];
let client: AppSupabaseClient;
let owner: string;

beforeAll(async () => {
  const email = uniqueEmail('hu-inv-05');
  owner = (await createUser(admin, { email, fullName: 'Detalle', password })).userId;
  owners.push(owner);
  client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
});

afterAll(async () => {
  for (const id of owners) {
    await pool.query('delete from public.copy_issue where owner_id = $1', [id]);
    await pool.query('delete from public.copy_event where owner_id = $1', [id]);
    await pool.query('delete from public.copy where owner_id = $1', [id]);
    await pool.query('delete from public.copy_counter where owner_id = $1', [id]);
    await pool.query('delete from public.customer where owner_id = $1', [id]);
    await admin.auth.admin.deleteUser(id);
  }
  await pool.end();
});

const readDeps = () => ({
  copies: createSupabaseCopyRepository(() => client),
  titles: createSupabaseTitleRepository(() => client),
  customers: createSupabaseCustomerRepository(() => client),
});

const writeDeps = () => ({
  copies: createSupabaseCopyRepository(() => client),
  connectivity: fakeConnectivity(),
  clock: { now: () => new Date() },
});

/** Psiconutrición #6 de la HU: recibido el 20/10, vendido el 02/11 por 98.000 y acordado luego en 93.000. */
const soldCopy = async () => {
  const customer = randomUUID();
  await pool.query(`insert into public.customer (id, owner_id, name) values ($1, $2, 'María Camila Henao')`, [
    customer,
    owner,
  ]);
  const copy = randomUUID();
  await pool.query(
    `insert into public.copy (id, owner_id, title_id, number, public_price_snapshot, colportor_price_snapshot, received_at)
     values ($1, $2, $3, 0, 98000, 49000, '2026-10-20')`,
    [copy, owner, TITLE],
  );
  await pool.query(`update public.copy_event set at = '2026-10-20T15:00:00Z' where copy_id = $1`, [copy]);
  await pool.query(
    `update public.copy set status = 'sold', customer_id = $2, agreed_price = 98000, sold_at = '2026-11-02T15:00:00Z' where id = $1`,
    [copy, customer],
  );
  await pool.query('update public.copy set agreed_price = 93000 where id = $1', [copy]);
  return copy;
};

describe('detalle de un ejemplar contra Supabase local (HU-INV-05)', () => {
  it('CA-1: cliente, acordado 93.000, diferencia −5.000, fechas e historial más reciente primero', async () => {
    const copy = await soldCopy();
    const result = await loadCopyDetail(readDeps(), copy);
    if (!result.ok) throw new Error(result.error.code);
    expect(result.value).toMatchObject({
      titleName: 'Salud y bienestar en familia',
      category: 'cultural',
      status: 'sold',
      customer: { name: 'María Camila Henao' },
      agreedPrice: 93_000,
      publicPriceSnapshot: 98_000,
      priceDelta: -5_000,
      soldAt: new Date('2026-11-02T15:00:00Z'),
      receivedAt: '2026-10-20',
      can: { editAgreedPrice: true, restorePublicPrice: true, flag: false, returnFromCustomer: true },
    });
    expect(result.value.history.map((h) => [h.type, h.data.customerName ?? null])).toEqual([
      ['price_changed', null],
      ['sold', 'María Camila Henao'],
      ['received', null],
    ]);
    expect(result.value.history[0]?.data).toMatchObject({ oldPrice: 98_000, newPrice: 93_000 });
  });

  it('CA-2: recibido al 03/11 → DATE_AFTER_SALE; al 28/10 se guarda y aparece en el historial', async () => {
    const copy = await soldCopy();
    expect(await updateReceivedDate(writeDeps(), copy, localDate('2026-11-03'))).toEqual({
      ok: false,
      error: { code: 'DATE_AFTER_SALE', retryable: false },
    });
    expect(await updateReceivedDate(writeDeps(), copy, localDate('2026-10-28'))).toEqual({
      ok: true,
      value: undefined,
    });
    const detail = await loadCopyDetail(readDeps(), copy);
    if (!detail.ok) throw new Error(detail.error.code);
    expect(detail.value.receivedAt).toBe('2026-10-28');
    expect(detail.value.history[0]).toMatchObject({
      type: 'received_date_changed',
      data: { oldDate: '2026-10-20', newDate: '2026-10-28' },
    });
  });

  it('CA-3: devuelto al líder con nota → ese evento se puede deshacer', async () => {
    const copy = randomUUID();
    await pool.query(
      `insert into public.copy (id, owner_id, title_id, number, public_price_snapshot, colportor_price_snapshot)
       values ($1, $2, $3, 0, 98000, 49000)`,
      [copy, owner, TITLE],
    );
    const c = await pool.connect();
    try {
      await c.query('begin');
      await c.query(`select set_config('colportor.copy_event', '{"note":"Fin de campaña"}', true)`);
      await c.query(`update public.copy set status = 'returned_to_leader' where id = $1`, [copy]);
      await c.query('commit');
    } finally {
      c.release();
    }
    const result = await loadCopyDetail(readDeps(), copy);
    if (!result.ok) throw new Error(result.error.code);
    expect(result.value.history[0]).toMatchObject({
      type: 'returned_to_leader',
      note: 'Fin de campaña',
      undo: 'returned_to_leader',
    });
    expect(result.value.can).toMatchObject({ flag: false, delete: false, editReceivedAt: true });
  });

  it('un ejemplar con novedad muestra su nota; uno eliminado o ajeno es NOT_FOUND', async () => {
    const copy = randomUUID();
    await pool.query(
      `insert into public.copy (id, owner_id, title_id, number, status, public_price_snapshot, colportor_price_snapshot)
       values ($1, $2, $3, 0, 'flagged', 98000, 49000)`,
      [copy, owner, TITLE],
    );
    await pool.query(
      `insert into public.copy_issue (id, owner_id, copy_id, note) values ($1, $2, $3, 'El líder dice 4')`,
      [randomUUID(), owner, copy],
    );
    const result = await loadCopyDetail(readDeps(), copy);
    expect(result.ok && result.value.openIssue?.note).toBe('El líder dice 4');

    await pool.query('update public.copy set deleted_at = now() where id = $1', [copy]);
    expect(await loadCopyDetail(readDeps(), copy)).toEqual({
      ok: false,
      error: { code: 'NOT_FOUND', retryable: false },
    });
    expect(await loadCopyDetail(readDeps(), randomUUID())).toEqual({
      ok: false,
      error: { code: 'NOT_FOUND', retryable: false },
    });
  });
});
