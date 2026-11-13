// HU-INV-02 · Agregar por lote contra Supabase local, por el mismo camino que la app
// (caso de uso → repositorio Supabase → función add_copies con la sesión del usuario).
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createSupabaseCopyRepository } from '@/adapters/supabase/copy-repository';
import type { AppSupabaseClient } from '@/adapters/supabase/client';
import { batchLines, createAddBatch, type AddCopiesInput } from '@/domain/add-batch';
import { localDate, type Clock, type LocalDate } from '@/domain/time';
import { addCopiesBatch } from '@/features/inventory/use-cases/add-copies-batch';
import { createUser } from '../../scripts/lib/create-user';
import { fakeConnectivity } from '../support/fake-connectivity';
import { adminClient, anonClient, clientWithFetch, uniqueEmail } from './helpers/local-supabase';

const DB_URL = process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
// Seed: dos culturales (en la HU, "Un corazón tranquilo" y "Bebidas saludables").
const CORAZON = {
  id: '00000000-0000-4000-8000-000000000101',
  name: 'Un corazón tranquilo',
  category: 'cultural',
} as const;
const BEBIDAS = {
  id: '00000000-0000-4000-8000-000000000102',
  name: 'Bebidas saludables',
  category: 'cultural',
} as const;

const pool = new pg.Pool({ connectionString: DB_URL, max: 2 });
const admin = adminClient();
const email = uniqueEmail('hu-inv-02');
const password = 'clave-local-123';
let owner: string;
let client: AppSupabaseClient;
let accessToken: string;
let today: LocalDate;
let clock: Clock;

beforeAll(async () => {
  owner = (await createUser(admin, { email, fullName: 'Agregar por lote', password })).userId;
  client = anonClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  accessToken = data.session.access_token;
  today = localDate((await pool.query<{ d: string }>(`select public.today_bogota()::text as d`)).rows[0]!.d);
  clock = { now: () => new Date(`${today}T12:00:00-05:00`) };
});

afterAll(async () => {
  await pool.query('delete from public.copy_event where owner_id = $1', [owner]);
  await pool.query('delete from public.copy where owner_id = $1', [owner]);
  await pool.query('delete from public.copy_counter where owner_id = $1', [owner]);
  await admin.auth.admin.deleteUser(owner);
  await pool.end();
});

const deps = (c: AppSupabaseClient = client) => ({
  copies: createSupabaseCopyRepository(() => c),
  connectivity: fakeConnectivity(),
  clock,
});

/** El lote de CA-1: 2 toques en "Un corazón tranquilo" y 1 en "Bebidas saludables". */
const caOneBatch = (): AddCopiesInput => ({
  batchId: randomUUID(),
  receivedAt: today,
  lines: batchLines(
    createAddBatch([CORAZON, BEBIDAS]).increment(CORAZON.id).increment(CORAZON.id).increment(BEBIDAS.id),
    randomUUID,
  ),
});

const ownCopies = async () =>
  (
    await pool.query<{
      title_id: string;
      number: number;
      status: string;
      received_at: string;
      public_price_snapshot: number;
    }>(
      `select title_id, number, status, received_at::text, public_price_snapshot
       from public.copy where owner_id = $1 order by created_at, title_id, number`,
      [owner],
    )
  ).rows;

const resetCopies = async () => {
  await pool.query('delete from public.copy_event where owner_id = $1', [owner]);
  await pool.query('delete from public.copy where owner_id = $1', [owner]);
  await pool.query('delete from public.copy_counter where owner_id = $1', [owner]);
};

describe('agregar por lote contra Supabase local (HU-INV-02)', () => {
  it('CA-2: confirmar el lote de CA-1 con fecha de hoy crea Corazón #1 y #2 y Bebidas #1, en físico, con los precios del título', async () => {
    await resetCopies();
    const input = caOneBatch();
    const result = await addCopiesBatch(deps(), input);
    if (!result.ok) throw new Error(result.error.code);
    expect(result.value.created.map(({ titleId, number }) => [titleId, number])).toEqual([
      [BEBIDAS.id, 1],
      [CORAZON.id, 1],
      [CORAZON.id, 2],
    ]);
    expect(result.value.created.map((c) => c.copyId)).toEqual(input.lines.flatMap((l) => l.copyIds));
    const rows = await ownCopies();
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.status === 'in_stock' && r.received_at === today)).toBe(true);
    expect(rows.find((r) => r.title_id === CORAZON.id)?.public_price_snapshot).toBe(75_000);
    expect(rows.find((r) => r.title_id === BEBIDAS.id)?.public_price_snapshot).toBe(68_000);
  });

  it('CA-6: si la respuesta se pierde, reintentar con los mismos copyIds deja 3 ejemplares, no 6', async () => {
    await resetCopies();
    const input = caOneBatch();
    // La petición llega a la base, pero la respuesta "se pierde" en el camino.
    const losingFetch: typeof fetch = async (...args) => {
      await fetch(...args);
      throw new TypeError('Failed to fetch');
    };
    const lost = await addCopiesBatch(deps(clientWithFetch(accessToken, losingFetch)), input);
    expect(lost).toEqual({ ok: false, error: { code: 'NETWORK_ERROR', retryable: true } });
    expect(await ownCopies()).toHaveLength(3);

    const retry = await addCopiesBatch(deps(), input);
    if (!retry.ok) throw new Error(retry.error.code);
    expect(retry.value.created.map((c) => c.number)).toEqual([1, 1, 2]);
    expect(await ownCopies()).toHaveLength(3);
  });

  it('CA-4: un título desactivado justo antes de confirmar → TITLE_INACTIVE con su id y no crea ninguno', async () => {
    await resetCopies();
    await pool.query('update public.title set is_active = false where id = $1', [BEBIDAS.id]);
    try {
      const result = await addCopiesBatch(deps(), caOneBatch());
      expect(result).toEqual({
        ok: false,
        error: { code: 'TITLE_INACTIVE', retryable: false, details: { titleIds: [BEBIDAS.id] } },
      });
      expect(await ownCopies()).toEqual([]);
    } finally {
      await pool.query('update public.title set is_active = true where id = $1', [BEBIDAS.id]);
    }
  });

  it('CA-5: la base también rechaza una fecha futura (aunque el reloj del teléfono esté mal) → DATE_IN_FUTURE', async () => {
    await resetCopies();
    const tomorrow = localDate(
      (await pool.query<{ d: string }>(`select (public.today_bogota() + 1)::text as d`)).rows[0]!.d,
    );
    const wrongClock = { now: () => new Date(`${tomorrow}T12:00:00-05:00`) };
    const result = await addCopiesBatch(
      { ...deps(), clock: wrongClock },
      { ...caOneBatch(), receivedAt: tomorrow },
    );
    expect(result).toEqual({ ok: false, error: { code: 'DATE_IN_FUTURE', retryable: false } });
    expect(await ownCopies()).toEqual([]);
  });

  it('CA-8: el precio del título cambia de 75.000 a 80.000 después de agregar → el ejemplar conserva 75.000', async () => {
    await resetCopies();
    const result = await addCopiesBatch(deps(), {
      batchId: randomUUID(),
      receivedAt: today,
      lines: [{ titleId: CORAZON.id, copyIds: [randomUUID()] }],
    });
    if (!result.ok) throw new Error(result.error.code);
    await pool.query('update public.title set public_price = 80000 where id = $1', [CORAZON.id]);
    try {
      const { data, error } = await client
        .from('copy')
        .select('public_price_snapshot')
        .eq('id', result.value.created[0]!.copyId)
        .single();
      expect(error).toBeNull();
      expect(data?.public_price_snapshot).toBe(75_000);
    } finally {
      await pool.query('update public.title set public_price = 75000 where id = $1', [CORAZON.id]);
    }
  });

  it('VALIDATION de la base llega con details.field (lote mal formado que el dominio no vio)', async () => {
    const result = await createSupabaseCopyRepository(() => client).addBatch({
      batchId: randomUUID(),
      receivedAt: today,
      lines: [{ titleId: 'no-es-uuid', copyIds: [randomUUID()] }],
    });
    expect(result).toEqual({
      ok: false,
      error: { code: 'VALIDATION', retryable: false, details: { field: 'lines' } },
    });
  });
});
