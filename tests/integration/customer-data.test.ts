// HU-CLI-02 · Crear y editar un cliente contra Supabase local, por el mismo camino que la app
// (casos de uso → repositorio Supabase con la sesión del usuario → RLS y checks de la base).
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AppSupabaseClient } from '@/adapters/supabase/client';
import { createSupabaseCustomerRepository } from '@/adapters/supabase/customer-repository';
import { computeCustomerAccount } from '@/domain/customer';
import { localDate } from '@/domain/time';
import {
  createCustomer,
  loadPossibleDuplicates,
  updateCustomer,
} from '@/features/customers/use-cases/customer-data';
import { createUser } from '../../scripts/lib/create-user';
import { fakeConnectivity } from '../support/fake-connectivity';
import { adminClient, anonClient, uniqueEmail } from './helpers/local-supabase';

const DB_URL = process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const pool = new pg.Pool({ connectionString: DB_URL, max: 2 });
const admin = adminClient();
const password = 'clave-local-123';
const owners: string[] = [];
let client: AppSupabaseClient;
let other: AppSupabaseClient;

const signIn = async (label: string) => {
  const email = uniqueEmail(label);
  owners.push((await createUser(admin, { email, fullName: label, password })).userId);
  const c = anonClient();
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return c;
};

beforeAll(async () => {
  client = await signIn('hu-cli-02');
  other = await signIn('hu-cli-02-otro');
});

afterAll(async () => {
  for (const owner of owners) {
    await pool.query('delete from public.customer where owner_id = $1', [owner]);
    await admin.auth.admin.deleteUser(owner);
  }
  await pool.end();
});

const deps = (c: AppSupabaseClient = client) => ({
  customers: createSupabaseCustomerRepository(() => c),
  connectivity: fakeConnectivity(),
});

const row = async (id: string) =>
  (await pool.query('select * from public.customer where id = $1', [id])).rows as Record<string, unknown>[];

describe('crear y editar un cliente contra Supabase local (HU-CLI-02)', () => {
  it('CA-1: "Natalia Andrea Cárdenas" queda creada como prospecto', async () => {
    const id = randomUUID();
    expect(await createCustomer(deps(), { id, name: 'Natalia Andrea Cárdenas' })).toEqual({
      ok: true,
      value: { id },
    });
    const [created] = await row(id);
    expect(created).toMatchObject({ name: 'Natalia Andrea Cárdenas', archived_at: null, deleted_at: null });
    const data = await deps().customers.getAccountData(id);
    if (!data.ok) throw new Error(data.error.code);
    expect(computeCustomerAccount(data.value, localDate('2026-11-08')).isProspect).toBe(true);
  });

  it('CA-7: reintentar con el mismo id deja un solo cliente y no pisa lo escrito', async () => {
    const id = randomUUID();
    await createCustomer(deps(), { id, name: 'Natalia' });
    await updateCustomer(deps(), id, { phone: '312 448 0917' });
    expect(await createCustomer(deps(), { id, name: 'Natalia' })).toEqual({ ok: true, value: { id } });
    expect(await row(id)).toEqual([expect.objectContaining({ name: 'Natalia', phone: '312 448 0917' })]);
    // El id de un cliente ajeno no se puede "reintentar".
    expect(await createCustomer(deps(other), { id, name: 'Otra' })).toEqual({
      ok: false,
      error: { code: 'CONFLICT', retryable: false },
    });
  });

  it('CA-2: un nombre de solo espacios → VALIDATION en name y no cambia nada (ni pasando el dominio)', async () => {
    const id = randomUUID();
    await createCustomer(deps(), { id, name: 'Natalia' });
    expect(await updateCustomer(deps(), id, { name: '   ' })).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION', details: { field: 'name' } },
    });
    // La base también lo rechaza si alguien salta el dominio.
    expect(await deps().customers.update(id, { name: '  ' })).toEqual({
      ok: false,
      error: { code: 'VALIDATION', retryable: false, details: { field: 'name' } },
    });
    expect(await deps().customers.update(id, { mapsUrl: 'https://evil.com/maps' })).toEqual({
      ok: false,
      error: { code: 'VALIDATION', retryable: false, details: { field: 'mapsUrl' } },
    });
    expect((await row(id))[0]).toMatchObject({ name: 'Natalia', maps_url: null });
  });

  it('CA-3: "312 448 0917" queda tal cual y la última modificación cambia', async () => {
    const id = randomUUID();
    await createCustomer(deps(), { id, name: 'Natalia' });
    await pool.query(`update public.customer set updated_at = '2026-01-01' where id = $1`, [id]);
    expect(await updateCustomer(deps(), id, { phone: '312 448 0917', avatarEmoji: '👨‍👩‍👧' })).toEqual({
      ok: true,
      value: undefined,
    });
    const [saved] = await row(id);
    expect(saved).toMatchObject({ phone: '312 448 0917', avatar_emoji: '👨‍👩‍👧' });
    expect((saved!.updated_at as Date) > new Date('2026-01-02')).toBe(true);
  });

  it('R6: un archivado → CUSTOMER_ARCHIVED; un cliente ajeno o borrado → NOT_FOUND', async () => {
    const id = randomUUID();
    await createCustomer(deps(), { id, name: 'Natalia' });
    await pool.query('update public.customer set archived_at = now() where id = $1', [id]);
    expect(await updateCustomer(deps(), id, { phone: '1' })).toEqual({
      ok: false,
      error: { code: 'CUSTOMER_ARCHIVED', retryable: false },
    });
    expect(await updateCustomer(deps(other), id, { phone: '1' })).toEqual({
      ok: false,
      error: { code: 'NOT_FOUND', retryable: false },
    });
    const gone = randomUUID();
    await createCustomer(deps(), { id: gone, name: 'Borrada' });
    await pool.query('update public.customer set deleted_at = now() where id = $1', [gone]);
    expect(await updateCustomer(deps(), gone, { phone: '1' })).toEqual({
      ok: false,
      error: { code: 'NOT_FOUND', retryable: false },
    });
  });

  it('CA-6: duplicados por nombre o teléfono entre los clientes del usuario, con archivados marcados', async () => {
    const maria = randomUUID();
    await createCustomer(deps(), { id: maria, name: 'María Gómez' });
    await updateCustomer(deps(), maria, { phone: '3125551234' });
    await pool.query('update public.customer set archived_at = now() where id = $1', [maria]);
    // Un cliente igual de otro usuario nunca aparece.
    await createCustomer(deps(other), { id: randomUUID(), name: 'María Gómez' });

    const byName = await loadPossibleDuplicates(deps(), { name: 'maria gomez' });
    expect(byName.ok && byName.value).toEqual([
      { id: maria, name: 'María Gómez', phone: '3125551234', archived: true, reason: 'name' },
    ]);
    const byPhone = await loadPossibleDuplicates(deps(), {
      phone: '+57 312 555 1234',
      excludeId: randomUUID(),
    });
    expect(byPhone.ok && byPhone.value.map((d) => [d.id, d.reason])).toEqual([[maria, 'phone']]);
    expect(await loadPossibleDuplicates(deps(), { phone: '3125551234', excludeId: maria })).toEqual({
      ok: true,
      value: [],
    });
  });
});
