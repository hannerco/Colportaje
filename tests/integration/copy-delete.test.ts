// HU-INV-08 · Eliminar un ejemplar y deshacer contra Supabase local, por el mismo camino que la app.
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AppSupabaseClient } from '@/adapters/supabase/client';
import { createSupabaseCopyRepository } from '@/adapters/supabase/copy-repository';
import { createSupabaseCustomerRepository } from '@/adapters/supabase/customer-repository';
import { createSupabaseTitleRepository } from '@/adapters/supabase/title-repository';
import { buildCopiesListView, DEFAULT_COPIES_LIST_PARAMS } from '@/domain/copies-list';
import { localDate } from '@/domain/time';
import { assignCopyToCustomer } from '@/features/customers/use-cases/customer-books';
import { addCopiesBatch } from '@/features/inventory/use-cases/add-copies-batch';
import { loadCopiesListData } from '@/features/inventory/use-cases/copies-list';
import { deleteCopy, undoDeleteCopy } from '@/features/inventory/use-cases/copy-delete';
import { flagCopy, resolveCopyIssue } from '@/features/inventory/use-cases/copy-issue';
import { loadFlaggedCopies, loadInStockSummary } from '@/features/inventory/use-cases/stock';
import { createUser } from '../../scripts/lib/create-user';
import { fakeConnectivity } from '../support/fake-connectivity';
import { adminClient, anonClient, uniqueEmail } from './helpers/local-supabase';

const DB_URL = process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const CORAZON = '00000000-0000-4000-8000-000000000201'; // seed: religioso
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
  users.push({ id: userId, client });
};

beforeAll(async () => {
  await newUser('hu-inv-08-a');
  await newUser('hu-inv-08-b');
});

afterAll(async () => {
  for (const { id } of users) {
    await pool.query('delete from public.copy_issue where owner_id = $1', [id]);
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
  copies: createSupabaseCopyRepository(() => client),
  titles: createSupabaseTitleRepository(() => client),
  customers: createSupabaseCustomerRepository(() => client),
  connectivity: fakeConnectivity(),
  clock: { now: () => new Date() },
});

/** Agrega `n` ejemplares del título por el camino de la app; devuelve `[{ copyId, number }]`. */
const addCopies = async (n: number) => {
  const today = (await pool.query<{ d: string }>('select public.today_bogota()::text as d')).rows[0]!.d;
  const ids = Array.from({ length: n }, () => randomUUID());
  const result = await addCopiesBatch(deps(), {
    batchId: randomUUID(),
    receivedAt: localDate(today),
    lines: [{ titleId: CORAZON, copyIds: ids }],
  });
  if (!result.ok) throw new Error(result.error.code);
  return result.value.created.map((c) => ({ copyId: c.copyId, number: c.number }));
};

const inStockBooks = async () => {
  const s = await loadInStockSummary(deps());
  if (!s.ok) throw new Error(s.error.code);
  return s.value.booksTotal;
};

const listedIds = async () => {
  const data = await loadCopiesListData(deps());
  if (!data.ok) throw new Error(data.error.code);
  const view = buildCopiesListView(
    data.value.copies,
    data.value.titles,
    data.value.customers,
    DEFAULT_COPIES_LIST_PARAMS,
  );
  return { ids: view.rows.map((r) => r.copyId), all: view.counts.all };
};

const lastEvent = async (id: string) =>
  (
    await pool.query(
      'select type, note, data from public.copy_event where copy_id = $1 order by seq desc limit 1',
      [id],
    )
  ).rows[0];

describe('eliminar un ejemplar contra Supabase local (HU-INV-08)', () => {
  it('CA-1 y CA-2: desaparece de físico, Ejemplares y conteos; el número no se reutiliza; deshacer lo devuelve', async () => {
    const [nine] = await addCopies(1);
    const before = { books: await inStockBooks(), list: await listedIds() };

    expect(await deleteCopy(deps(), nine!.copyId, 'Lo registré dos veces')).toEqual({
      ok: true,
      value: undefined,
    });
    expect(await inStockBooks()).toBe(before.books - 1);
    const after = await listedIds();
    expect(after.ids).not.toContain(nine!.copyId);
    expect(after.all).toBe(before.list.all - 1);
    expect(await lastEvent(nine!.copyId)).toEqual({
      type: 'deleted',
      note: 'Lo registré dos veces',
      data: { previousStatus: 'in_stock' },
    });
    // El próximo ejemplar del título no reutiliza su número.
    const [next] = await addCopies(1);
    expect(next!.number).toBeGreaterThan(nine!.number);

    expect(await undoDeleteCopy(deps(), nine!.copyId)).toEqual({ ok: true, value: undefined });
    const row = await pool.query('select status, number, deleted_at from public.copy where id = $1', [
      nine!.copyId,
    ]);
    expect(row.rows[0]).toEqual({ status: 'in_stock', number: nine!.number, deleted_at: null });
    expect(await inStockBooks()).toBe(before.books + 1); // el #9 y el nuevo
    expect(await lastEvent(nine!.copyId)).toMatchObject({ type: 'undo_deleted' });
    // Ya no hay nada que deshacer.
    expect(await undoDeleteCopy(deps(), nine!.copyId)).toMatchObject({
      ok: false,
      error: { code: 'UNDO_NOT_AVAILABLE' },
    });
  });

  it('CA-3 (R3): vendido, perdido o devuelto al líder → COPY_NOT_DELETABLE', async () => {
    const [sold, lost] = await addCopies(2);
    const customer = randomUUID();
    await pool.query('insert into public.customer (id, owner_id, name) values ($1, $2, $3)', [
      customer,
      a().id,
      'Natalia',
    ]);
    await assignCopyToCustomer(deps(), sold!.copyId, customer);
    await flagCopy(deps(), lost!.copyId, 'Falta');
    await resolveCopyIssue(deps(), lost!.copyId, 'lost');
    for (const copy of [sold!, lost!])
      expect(await deleteCopy(deps(), copy.copyId)).toMatchObject({
        ok: false,
        error: { code: 'COPY_NOT_DELETABLE' },
      });
    const [leader] = await addCopies(1);
    await pool.query(
      `begin; set local session_replication_role = replica;
       update public.copy set status = 'returned_to_leader' where id = '${leader!.copyId}'; commit;`,
    );
    expect(await deleteCopy(deps(), leader!.copyId)).toMatchObject({
      ok: false,
      error: { code: 'COPY_NOT_DELETABLE' },
    });
  });

  it('CA-4 (R2, R5): con novedad y sin nota → la novedad queda resuelta como removed; deshacer la reabre', async () => {
    const [copy] = await addCopies(1);
    await flagCopy(deps(), copy!.copyId, 'El líder contó 3 y tengo 2');
    expect(await deleteCopy(deps(), copy!.copyId)).toEqual({ ok: true, value: undefined });
    const issue = await pool.query(
      'select resolution, resolution_note, resolved_at is not null as resolved from public.copy_issue where copy_id = $1',
      [copy!.copyId],
    );
    expect(issue.rows).toEqual([{ resolution: 'removed', resolution_note: null, resolved: true }]);
    expect(await lastEvent(copy!.copyId)).toMatchObject({
      type: 'resolved',
      data: { resolution: 'removed' },
    });

    expect(await undoDeleteCopy(deps(), copy!.copyId)).toEqual({ ok: true, value: undefined });
    const flagged = await loadFlaggedCopies(deps());
    expect(flagged.ok && flagged.value.find((f) => f.copyId === copy!.copyId)).toMatchObject({
      note: 'El líder contó 3 y tengo 2',
      number: copy!.number,
    });
    expect(await lastEvent(copy!.copyId)).toMatchObject({ type: 'undo_resolved' });
  });

  it('CA-5: con la nota obligatoria por configuración, sin nota → NOTE_REQUIRED y no se borra', async () => {
    const [copy] = await addCopies(1);
    expect(await deleteCopy(deps(), copy!.copyId, null, { noteRequired: true })).toEqual({
      ok: false,
      error: { code: 'NOTE_REQUIRED', retryable: false },
    });
    expect(
      (await pool.query('select deleted_at from public.copy where id = $1', [copy!.copyId])).rows[0]
        .deleted_at,
    ).toBeNull();
  });

  it('bordes: eliminar dos veces → NOT_FOUND; deshacer después de otro cambio → UNDO_NOT_AVAILABLE; ajeno → NOT_FOUND', async () => {
    const [copy, other] = await addCopies(2);
    await deleteCopy(deps(), copy!.copyId);
    expect(await deleteCopy(deps(), copy!.copyId)).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
    // Un ejemplar no eliminado no tiene nada que deshacer.
    expect(await undoDeleteCopy(deps(), other!.copyId)).toMatchObject({
      ok: false,
      error: { code: 'UNDO_NOT_AVAILABLE' },
    });
    expect(await deleteCopy(deps(users[1]!.client), other!.copyId)).toMatchObject({
      ok: false,
      error: { code: 'NOT_FOUND' },
    });
    expect(await undoDeleteCopy(deps(users[1]!.client), copy!.copyId)).toMatchObject({
      ok: false,
      error: { code: 'NOT_FOUND' },
    });
  });
});
