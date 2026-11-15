// HU-INV-07 · Marcar con novedad, resolver y deshacer contra Supabase local, por el mismo camino que la app.
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AppSupabaseClient } from '@/adapters/supabase/client';
import { createSupabaseCopyRepository } from '@/adapters/supabase/copy-repository';
import { createSupabaseCustomerRepository } from '@/adapters/supabase/customer-repository';
import { createSupabaseTitleRepository } from '@/adapters/supabase/title-repository';
import { assignCopyToCustomer, returnCopyFromCustomer } from '@/features/customers/use-cases/customer-books';
import { flagCopy, resolveCopyIssue, undoResolveCopyIssue } from '@/features/inventory/use-cases/copy-issue';
import { loadFlaggedCopies, loadInStockSummary } from '@/features/inventory/use-cases/stock';
import { createUser } from '../../scripts/lib/create-user';
import { fakeConnectivity } from '../support/fake-connectivity';
import { adminClient, anonClient, uniqueEmail } from './helpers/local-supabase';

const DB_URL = process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const CORAZON = '00000000-0000-4000-8000-000000000201'; // seed
const pool = new pg.Pool({ connectionString: DB_URL, max: 2 });
const admin = adminClient();
const password = 'clave-local-123';
const NOTE = 'El líder contó 3 y tengo 2';
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
  await newUser('hu-inv-07-a');
  await newUser('hu-inv-07-b');
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

const newCopy = async () => {
  const id = randomUUID();
  await pool.query(
    `insert into public.copy (id, owner_id, title_id, number, public_price_snapshot, colportor_price_snapshot, received_at)
     values ($1, $2, $3, 0, 50000, 1000, '2026-10-30')`,
    [id, a().id, CORAZON],
  );
  return id;
};

const copyRow = async (id: string) =>
  (
    await pool.query(
      'select status, number, deleted_at is not null as deleted from public.copy where id = $1',
      [id],
    )
  ).rows[0];

const inStockCount = async () => {
  const summary = await loadInStockSummary(deps());
  if (!summary.ok) throw new Error(summary.error.code);
  return summary.value.booksTotal;
};

const flagged = async () => {
  const items = await loadFlaggedCopies(deps());
  if (!items.ok) throw new Error(items.error.code);
  return items.value;
};

const lastEvent = async (id: string) =>
  (
    await pool.query(
      'select type, note, data from public.copy_event where copy_id = $1 order by seq desc limit 1',
      [id],
    )
  ).rows[0];

describe('novedades contra Supabase local (HU-INV-07)', () => {
  it('CA-1 a CA-3: marcar sale de físico y entra a Por resolver; Apareció vuelve; deshacer reabre la misma', async () => {
    const copy = await newCopy();
    const before = await inStockCount();

    expect(await flagCopy(deps(), copy, NOTE)).toEqual({ ok: true, value: undefined });
    expect((await copyRow(copy)).status).toBe('flagged');
    expect(await inStockCount()).toBe(before - 1);
    expect((await flagged()).find((f) => f.copyId === copy)).toMatchObject({ note: NOTE });
    expect(await lastEvent(copy)).toMatchObject({ type: 'flagged', note: NOTE });
    const issue = await pool.query('select id from public.copy_issue where copy_id = $1', [copy]);

    expect(await resolveCopyIssue(deps(), copy, 'found', 'Estaba en la caja')).toEqual({
      ok: true,
      value: undefined,
    });
    expect((await copyRow(copy)).status).toBe('in_stock');
    expect((await flagged()).some((f) => f.copyId === copy)).toBe(false);
    expect(await lastEvent(copy)).toMatchObject({
      type: 'resolved',
      note: 'Estaba en la caja',
      data: { resolution: 'found' },
    });

    expect(await undoResolveCopyIssue(deps(), copy)).toEqual({ ok: true, value: undefined });
    expect((await copyRow(copy)).status).toBe('flagged');
    expect((await flagged()).find((f) => f.copyId === copy)).toMatchObject({ note: NOTE });
    expect(await lastEvent(copy)).toMatchObject({ type: 'undo_resolved' });
    // La MISMA novedad, reabierta y sin datos de resolución.
    const reopened = await pool.query(
      'select id, note, resolution, resolution_note, resolved_at from public.copy_issue where copy_id = $1',
      [copy],
    );
    expect(reopened.rows).toEqual([
      { id: issue.rows[0].id, note: NOTE, resolution: null, resolution_note: null, resolved_at: null },
    ]);
  });

  it('CA-4: Perdido hace una semana se deshace desde el historial y vuelve con su nota original', async () => {
    const copy = await newCopy();
    await flagCopy(deps(), copy, 'Falta en la caja del líder');
    await resolveCopyIssue(deps(), copy, 'lost');
    expect((await copyRow(copy)).status).toBe('lost');
    await pool.query(
      `update public.copy_issue set resolved_at = now() - interval '7 days' where copy_id = $1`,
      [copy],
    );
    expect(await undoResolveCopyIssue(deps(), copy)).toEqual({ ok: true, value: undefined });
    expect((await copyRow(copy)).status).toBe('flagged');
    expect((await flagged()).find((f) => f.copyId === copy)).toMatchObject({
      note: 'Falta en la caja del líder',
    });
  });

  it('CA-5: Apareció y luego vendido → UNDO_NOT_AVAILABLE', async () => {
    const copy = await newCopy();
    await flagCopy(deps(), copy, NOTE);
    await resolveCopyIssue(deps(), copy, 'found');
    const customer = randomUUID();
    await pool.query('insert into public.customer (id, owner_id, name) values ($1, $2, $3)', [
      customer,
      a().id,
      'Natalia',
    ]);
    await assignCopyToCustomer(deps(), copy, customer);
    expect(await undoResolveCopyIssue(deps(), copy)).toEqual({
      ok: false,
      error: { code: 'UNDO_NOT_AVAILABLE', retryable: false },
    });
    expect((await copyRow(copy)).status).toBe('sold');
    // R4: aunque se devuelva y quede otra vez en físico, el último cambio ya no es la resolución.
    await returnCopyFromCustomer(deps(), copy, 'wrong_registration');
    expect((await copyRow(copy)).status).toBe('in_stock');
    expect(await undoResolveCopyIssue(deps(), copy)).toMatchObject({
      ok: false,
      error: { code: 'UNDO_NOT_AVAILABLE' },
    });
  });

  it('R4: si el estado ya no corresponde a la resolución (dato inconsistente), no se deshace', async () => {
    const copy = await newCopy();
    await flagCopy(deps(), copy, NOTE);
    await resolveCopyIssue(deps(), copy, 'found');
    // Sin triggers ni eventos: el último evento sigue siendo "Apareció", pero el ejemplar ya no está en físico.
    await pool.query(
      `begin; set local session_replication_role = replica;
       update public.copy set status = 'lost' where id = '${copy}'; commit;`,
    );
    expect(await undoResolveCopyIssue(deps(), copy)).toMatchObject({
      ok: false,
      error: { code: 'UNDO_NOT_AVAILABLE' },
    });
  });

  it('CA-6: Eliminar se deshace y el ejemplar reaparece en Por resolver con su número original', async () => {
    const copy = await newCopy();
    const { number } = await copyRow(copy);
    await flagCopy(deps(), copy, NOTE);
    await resolveCopyIssue(deps(), copy, 'removed');
    expect(await copyRow(copy)).toMatchObject({ deleted: true, status: 'flagged' });
    expect((await flagged()).some((f) => f.copyId === copy)).toBe(false);
    expect(await lastEvent(copy)).toMatchObject({ type: 'resolved', data: { resolution: 'removed' } });

    expect(await undoResolveCopyIssue(deps(), copy)).toEqual({ ok: true, value: undefined });
    expect(await copyRow(copy)).toEqual({ status: 'flagged', number, deleted: false });
    expect((await flagged()).find((f) => f.copyId === copy)).toMatchObject({ number, note: NOTE });
    expect(await lastEvent(copy)).toMatchObject({ type: 'undo_resolved' });
    // Deshacer dos veces ya no está disponible.
    expect(await undoResolveCopyIssue(deps(), copy)).toMatchObject({
      ok: false,
      error: { code: 'UNDO_NOT_AVAILABLE' },
    });
  });

  it('CA-7 y bordes: vendido o ya marcado → COPY_NOT_IN_STOCK; sin novedad → COPY_NOT_FLAGGED; ajeno → NOT_FOUND', async () => {
    const sold = await newCopy();
    const customer = randomUUID();
    await pool.query('insert into public.customer (id, owner_id, name) values ($1, $2, $3)', [
      customer,
      a().id,
      'Natalia',
    ]);
    await assignCopyToCustomer(deps(), sold, customer);
    expect(await flagCopy(deps(), sold, NOTE)).toMatchObject({
      ok: false,
      error: { code: 'COPY_NOT_IN_STOCK' },
    });

    const copy = await newCopy();
    await flagCopy(deps(), copy, NOTE);
    expect(await flagCopy(deps(), copy, NOTE)).toMatchObject({
      ok: false,
      error: { code: 'COPY_NOT_IN_STOCK' },
    });

    const plain = await newCopy();
    expect(await resolveCopyIssue(deps(), plain, 'found')).toMatchObject({
      ok: false,
      error: { code: 'COPY_NOT_FLAGGED' },
    });
    expect(await undoResolveCopyIssue(deps(), plain)).toMatchObject({
      ok: false,
      error: { code: 'UNDO_NOT_AVAILABLE' },
    });
    expect(await flagCopy(deps(users[1]!.client), plain, NOTE)).toMatchObject({
      ok: false,
      error: { code: 'NOT_FOUND' },
    });
    // La base también exige la nota.
    expect(await createSupabaseCopyRepository(() => a().client).flag(plain, '   ')).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION', details: { field: 'note' } },
    });
    // Por la API directa no se escribe una novedad.
    const { error } = await a()
      .client.from('copy_issue')
      .insert({ id: randomUUID(), owner_id: a().id, copy_id: plain, note: 'x' });
    expect(error?.code).toBe('42501');
  });
});
