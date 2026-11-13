// HU-CLI-09 · Agregar y quitar libros en la ficha contra Supabase local, por el mismo camino que la app.
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AppSupabaseClient } from '@/adapters/supabase/client';
import { createSupabaseCopyRepository } from '@/adapters/supabase/copy-repository';
import { createSupabaseCustomerRepository } from '@/adapters/supabase/customer-repository';
import { createSupabaseTitleRepository } from '@/adapters/supabase/title-repository';
import { assignableCopies } from '@/domain/assignable-copies';
import {
  assignCopyToCustomer,
  loadAssignableData,
  removeCopyDuringCreation,
} from '@/features/customers/use-cases/customer-books';
import { createUser } from '../../scripts/lib/create-user';
import { fakeConnectivity } from '../support/fake-connectivity';
import { adminClient, anonClient, uniqueEmail } from './helpers/local-supabase';

const DB_URL = process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const CORAZON = '00000000-0000-4000-8000-000000000201'; // seed: "Esperanza para hoy" (religioso)
const MINI = '00000000-0000-4000-8000-000000000301';
const pool = new pg.Pool({ connectionString: DB_URL, max: 4 });
const admin = adminClient();
const password = 'clave-local-123';
let owner: string;
let client: AppSupabaseClient;

beforeAll(async () => {
  const email = uniqueEmail('hu-cli-09');
  owner = (await createUser(admin, { email, fullName: 'Libros en la ficha', password })).userId;
  client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
});

afterAll(async () => {
  await pool.query('delete from public.payment where owner_id = $1', [owner]);
  await pool.query('delete from public.copy_event where owner_id = $1', [owner]);
  await pool.query('delete from public.copy where owner_id = $1', [owner]);
  await pool.query('delete from public.copy_counter where owner_id = $1', [owner]);
  await pool.query('delete from public.customer where owner_id = $1', [owner]);
  await admin.auth.admin.deleteUser(owner);
  await pool.end();
});

const deps = () => ({
  copies: createSupabaseCopyRepository(() => client),
  customers: createSupabaseCustomerRepository(() => client),
  connectivity: fakeConnectivity(),
  clock: { now: () => new Date() },
});

const newCustomer = async (name = 'Natalia') => {
  const id = randomUUID();
  await pool.query('insert into public.customer (id, owner_id, name) values ($1, $2, $3)', [id, owner, name]);
  return id;
};

const newCopy = async (price: number | null, title = CORAZON) => {
  const id = randomUUID();
  await pool.query(
    `insert into public.copy (id, owner_id, title_id, number, public_price_snapshot, colportor_price_snapshot, received_at)
     values ($1, $2, $3, 0, $4, 1000, '2026-10-30')`,
    [id, owner, title, price],
  );
  return id;
};

const assignableIds = async () => {
  const data = await loadAssignableData({
    copies: createSupabaseCopyRepository(() => client),
    titles: createSupabaseTitleRepository(() => client),
  });
  if (!data.ok) throw new Error(data.error.code);
  return assignableCopies(data.value.copies, data.value.titles).map((c) => c.copyId);
};

describe('agregar y quitar libros contra Supabase local (HU-CLI-09)', () => {
  it('CA-3: asignar a Natalia por 95.000 la saca de los asignables y su deuda es 95.000', async () => {
    const natalia = await newCustomer();
    const copy = await newCopy(95_000);
    expect(await assignableIds()).toContain(copy);
    const result = await assignCopyToCustomer(deps(), copy, natalia);
    if (!result.ok) throw new Error(result.error.code);
    expect(result.value.account).toMatchObject({ debt: 95_000, isProspect: false });
    expect(await assignableIds()).not.toContain(copy);
  });

  it('CA-4: quitarlo durante la creación lo devuelve a físico con su recibido y la deuda vuelve a 0', async () => {
    const natalia = await newCustomer();
    const copy = await newCopy(95_000);
    await assignCopyToCustomer(deps(), copy, natalia);
    const result = await removeCopyDuringCreation(deps(), copy);
    if (!result.ok) throw new Error(result.error.code);
    expect(result.value).toMatchObject({ account: { debt: 0, isProspect: true }, excess: null });
    const { rows } = await pool.query(
      `select status, customer_id, received_at::text as received from public.copy where id = $1`,
      [copy],
    );
    expect(rows[0]).toEqual({ status: 'in_stock', customer_id: null, received: '2026-10-30' });
    expect(await assignableIds()).toContain(copy);
  });

  it('CA-5: 180.000 en libros y 140.000 programados; quitar uno de 85.000 → franja, más lejano', async () => {
    const natalia = await newCustomer();
    const keep = await newCopy(95_000);
    const remove = await newCopy(85_000);
    await assignCopyToCustomer(deps(), keep, natalia);
    await assignCopyToCustomer(deps(), remove, natalia);
    for (const [i, amount] of [70_000, 70_000].entries()) {
      await pool.query(
        `insert into public.payment (id, owner_id, customer_id, kind, status, agreed_amount, due_date, original_due_date)
         values ($1, $2, $3, 'scheduled', 'scheduled', $4, public.today_bogota() + $5::int, public.today_bogota() + $5::int)`,
        [randomUUID(), owner, natalia, amount, (i + 1) * 15],
      );
    }
    const result = await removeCopyDuringCreation(deps(), remove);
    if (!result.ok) throw new Error(result.error.code);
    expect(result.value.account).toMatchObject({ debt: 95_000, scheduledTotal: 140_000 });
    expect(result.value.excess).toMatchObject({
      presentation: 'banner',
      suggestedOrder: 'farthest',
      excess: 45_000,
      trigger: 'form_edit',
    });
  });

  it('CA-6: un minibook en físico → COPY_IS_MINIBOOK; un archivado → CUSTOMER_ARCHIVED', async () => {
    const natalia = await newCustomer();
    expect(await assignCopyToCustomer(deps(), await newCopy(null, MINI), natalia)).toEqual({
      ok: false,
      error: { code: 'COPY_IS_MINIBOOK', retryable: false },
    });
    const archived = await newCustomer('Archivada');
    await pool.query('update public.customer set archived_at = now() where id = $1', [archived]);
    expect(await assignCopyToCustomer(deps(), await newCopy(95_000), archived)).toEqual({
      ok: false,
      error: { code: 'CUSTOMER_ARCHIVED', retryable: false },
    });
  });

  it('quitar un ejemplar que no está vendido → COPY_NOT_SOLD', async () => {
    expect(await removeCopyDuringCreation(deps(), await newCopy(95_000))).toEqual({
      ok: false,
      error: { code: 'COPY_NOT_SOLD', retryable: false },
    });
  });

  it('R6: dos asignaciones simultáneas del mismo ejemplar a clientes distintos → solo una lo logra', async () => {
    const copy = await newCopy(95_000);
    const one = await newCustomer('Una');
    const two = await newCustomer('Otra');
    // Dos sesiones (como dos teléfonos) con conexiones propias.
    const secondClient = anonClient();
    const { data } = await client.auth.getSession();
    await secondClient.auth.setSession({
      access_token: data.session!.access_token,
      refresh_token: data.session!.refresh_token,
    });
    const otherDeps = { ...deps(), copies: createSupabaseCopyRepository(() => secondClient) };
    const results = await Promise.all([
      assignCopyToCustomer(deps(), copy, one),
      assignCopyToCustomer(otherDeps, copy, two),
    ]);
    const okCount = results.filter((r) => r.ok).length;
    expect(okCount).toBe(1);
    expect(results.find((r) => !r.ok)).toEqual({
      ok: false,
      error: { code: 'COPY_NOT_IN_STOCK', retryable: false },
    });
    const { rows } = await pool.query('select customer_id from public.copy where id = $1', [copy]);
    expect([one, two]).toContain(rows[0].customer_id);
  });
});
