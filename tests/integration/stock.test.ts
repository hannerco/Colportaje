// HU-INV-03 · Libros en físico y Por resolver contra Supabase local, por el mismo camino que la app
// (lecturas → repositorios Supabase con la sesión del usuario → RLS).
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AppSupabaseClient } from '@/adapters/supabase/client';
import { createSupabaseCopyRepository } from '@/adapters/supabase/copy-repository';
import { createSupabaseTitleRepository } from '@/adapters/supabase/title-repository';
import {
  loadFlaggedCopies,
  loadInStockCopiesOfTitle,
  loadInStockSummary,
} from '@/features/inventory/use-cases/stock';
import { createUser } from '../../scripts/lib/create-user';
import { adminClient, anonClient, uniqueEmail } from './helpers/local-supabase';

const DB_URL = process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
// Seed: Bebidas → "Cocina natural colombiana" (68.000), Corazón → "Esperanza para hoy" (60.000),
// minibook "Paz interior" (sin precio público, colportor 1.500) y un título desactivado.
const BEBIDAS = '00000000-0000-4000-8000-000000000102';
const CORAZON = '00000000-0000-4000-8000-000000000201';
const MINI = '00000000-0000-4000-8000-000000000301';
const INACTIVE = '00000000-0000-4000-8000-000000000108';

const pool = new pg.Pool({ connectionString: DB_URL, max: 2 });
const admin = adminClient();
const password = 'clave-local-123';
const users: string[] = [];

const signedIn = async (email: string): Promise<AppSupabaseClient> => {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
};

const newUser = async (label: string) => {
  const email = uniqueEmail(label);
  const { userId } = await createUser(admin, { email, fullName: label, password });
  users.push(userId);
  return { id: userId, client: await signedIn(email) };
};

const depsFor = (client: AppSupabaseClient) => ({
  copies: createSupabaseCopyRepository(() => client),
  titles: createSupabaseTitleRepository(() => client),
});

/** Inserta ejemplares directo (como postgres); el número lo asigna el trigger. */
const insertCopies = async (
  owner: string,
  titleId: string,
  n: number,
  { status = 'in_stock', receivedAt = '2026-10-01', price = 60_000 } = {},
) => {
  const { rows } = await pool.query<{ id: string }>(
    `insert into public.copy (id, owner_id, title_id, number, status, public_price_snapshot,
                              colportor_price_snapshot, received_at)
     select gen_random_uuid(), $1, $2, 0, $3::public.copy_status, $4, 1000, $5::date
     from generate_series(1, $6)
     returning id`,
    [owner, titleId, status, price, receivedAt, n],
  );
  return rows.map((r) => r.id);
};

afterAll(async () => {
  for (const owner of users) {
    await pool.query('delete from public.copy_issue where owner_id = $1', [owner]);
    await pool.query('delete from public.copy_event where owner_id = $1', [owner]);
    await pool.query('delete from public.copy where owner_id = $1', [owner]);
    await pool.query('delete from public.copy_counter where owner_id = $1', [owner]);
    await admin.auth.admin.deleteUser(owner);
  }
  await pool.end();
});

let a: { id: string; client: AppSupabaseClient };
let b: { id: string; client: AppSupabaseClient };
let flaggedId: string;

beforeAll(async () => {
  a = await newUser('hu-inv-03-a');
  b = await newUser('hu-inv-03-b');
  // A: 4 Bebidas (una con precio copiado viejo), 3 Corazón (uno con novedad), 12 minibooks,
  // 2 de un título desactivado, y ejemplares que no cuentan: vendido, eliminado.
  await insertCopies(a.id, BEBIDAS, 3);
  await insertCopies(a.id, BEBIDAS, 1, { price: 70_000 });
  await insertCopies(a.id, CORAZON, 2);
  [flaggedId] = (await insertCopies(a.id, CORAZON, 1, { status: 'flagged' })) as [string];
  await pool.query(
    `insert into public.copy_issue (id, owner_id, copy_id, note) values ($1, $2, $3, 'El líder dice 4')`,
    [randomUUID(), a.id, flaggedId],
  );
  await insertCopies(a.id, MINI, 12);
  await insertCopies(a.id, INACTIVE, 2);
  const [deleted] = await insertCopies(a.id, BEBIDAS, 1);
  await pool.query('update public.copy set deleted_at = now() where id = $1', [deleted]);
  // B: sus propios ejemplares, que A nunca debe ver.
  await insertCopies(b.id, BEBIDAS, 5);
});

describe('Libros en físico contra Supabase local (HU-INV-03)', () => {
  it('CA-1: Bebidas 4, Corazón 2, booksTotal 6 (+2 del desactivado), minibook 12 y 1 por resolver', async () => {
    const result = await loadInStockSummary(depsFor(a.client));
    if (!result.ok) throw new Error(result.error.code);
    const summary = result.value;
    expect(summary.titles.map((t) => [t.titleId, t.inStockCount])).toEqual([
      [BEBIDAS, 4],
      [INACTIVE, 2],
      [CORAZON, 2],
    ]);
    expect(summary.booksTotal).toBe(8);
    expect(summary.minibooks.map((t) => [t.titleId, t.inStockCount, t.referencePrice])).toEqual([
      [MINI, 12, 1_500],
    ]);
    expect(summary.flaggedCount).toBe(1);
  });

  it('CA-2: el precio de referencia es el vigente del título (68.000), no el copiado viejo (70.000)', async () => {
    const result = await loadInStockSummary(depsFor(a.client));
    expect(result.ok && result.value.titles.find((t) => t.titleId === BEBIDAS)?.referencePrice).toBe(68_000);
  });

  it('CA-5: el título desactivado con 2 en físico aparece con 2', async () => {
    const result = await loadInStockSummary(depsFor(a.client));
    expect(result.ok && result.value.titles.find((t) => t.titleId === INACTIVE)?.inStockCount).toBe(2);
  });

  it('RLS: B solo ve lo suyo; A no ve los 5 de B (ni B los de A)', async () => {
    const result = await loadInStockSummary(depsFor(b.client));
    expect(result.ok && result.value).toEqual({
      booksTotal: 5,
      titles: [expect.objectContaining({ titleId: BEBIDAS, inStockCount: 5 })],
      minibooks: [],
      flaggedCount: 0,
    });
    const flaggedForB = await loadFlaggedCopies(depsFor(b.client));
    expect(flaggedForB).toEqual({ ok: true, value: [] });
  });

  it('CA-4: un título abierto lista sus ejemplares del recibido más antiguo al más nuevo, sin eliminados', async () => {
    const owner = await newUser('hu-inv-03-orden');
    const [n1] = await insertCopies(owner.id, CORAZON, 1, { receivedAt: '2026-11-03' });
    const [n2] = await insertCopies(owner.id, CORAZON, 1, { receivedAt: '2026-10-18' });
    const [n3] = await insertCopies(owner.id, CORAZON, 1, { receivedAt: '2026-10-25' });
    const [gone] = await insertCopies(owner.id, CORAZON, 1, { receivedAt: '2026-10-01' });
    await pool.query('update public.copy set deleted_at = now() where id = $1', [gone]);

    const result = await loadInStockCopiesOfTitle(depsFor(owner.client), CORAZON);
    if (!result.ok) throw new Error(result.error.code);
    expect(result.value.title).toEqual({
      name: 'Esperanza para hoy',
      inStockCount: 3,
      referencePrice: 60_000,
    });
    expect(result.value.copies.map((c) => [c.copyId, c.number, c.receivedAt])).toEqual([
      [n2, 2, '2026-10-18'],
      [n3, 3, '2026-10-25'],
      [n1, 1, '2026-11-03'],
    ]);
  });

  it('Por resolver: el ejemplar con novedad, con su nota y la fecha en que se marcó', async () => {
    const result = await loadFlaggedCopies(depsFor(a.client));
    if (!result.ok) throw new Error(result.error.code);
    expect(result.value).toEqual([
      {
        copyId: flaggedId,
        titleName: 'Esperanza para hoy',
        number: 3,
        note: 'El líder dice 4',
        flaggedAt: expect.any(Date),
      },
    ]);
  });

  it('más de 1.000 ejemplares (límite de una respuesta de PostgREST) se cuentan todos', async () => {
    const owner = await newUser('hu-inv-03-muchos');
    await insertCopies(owner.id, MINI, 1_001);
    const summary = await loadInStockSummary(depsFor(owner.client));
    expect(summary.ok && summary.value.minibooks[0]?.inStockCount).toBe(1_001);
    const ofTitle = await loadInStockCopiesOfTitle(depsFor(owner.client), MINI);
    expect(ofTitle.ok && ofTitle.value.copies).toHaveLength(1_001);
  });
});
