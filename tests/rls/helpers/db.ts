// Arnés de pruebas RLS contra Supabase local (HU-BASE-02).
// Cada prueba corre en una transacción que se revierte: no deja usuarios, filas ni tablas.
import { randomUUID } from 'node:crypto';
import pg from 'pg';

/** Postgres local de `supabase start` (credenciales locales por defecto, no son claves de la nube). */
const DB_URL = process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

export const pool = new pg.Pool({ connectionString: DB_URL, max: 2 });

export type Tx = pg.PoolClient;

/** Falla con un mensaje claro si Supabase local no está corriendo. */
export async function assertDatabaseReachable(): Promise<void> {
  try {
    await pool.query('select 1');
  } catch (cause) {
    throw new Error('No hay conexión con Supabase local. Arráncalo con `pnpm db:start`.', { cause });
  }
}

/** Corre `fn` dentro de una transacción que siempre se revierte. */
export async function inTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const tx = await pool.connect();
  try {
    await tx.query('begin');
    return await fn(tx);
  } finally {
    await tx.query('rollback');
    tx.release();
  }
}

/**
 * Ejecuta `fn` como el usuario autenticado `userId`, igual que PostgREST:
 * rol `authenticated` y `request.jwt.claims` con su `sub` (de ahí lee `auth.uid()`).
 */
export async function asUser<T>(tx: Tx, userId: string, fn: () => Promise<T>): Promise<T> {
  await tx.query('set local role authenticated');
  await tx.query(`select set_config('request.jwt.claims', $1, true)`, [
    JSON.stringify({ sub: userId, role: 'authenticated' }),
  ]);
  try {
    return await fn();
  } finally {
    await tx.query('reset role');
    await tx.query(`select set_config('request.jwt.claims', '', true)`);
  }
}

/** Ejecuta `fn` como visitante sin sesión (rol `anon`). */
export async function asAnon<T>(tx: Tx, fn: () => Promise<T>): Promise<T> {
  await tx.query('set local role anon');
  try {
    return await fn();
  } finally {
    await tx.query('reset role');
  }
}

/** Ejecuta una consulta que debe fallar; devuelve el código de error de Postgres sin abortar la transacción. */
export async function expectError(tx: Tx, sql: string, params: unknown[] = []): Promise<string> {
  await tx.query('savepoint expect_error');
  try {
    await tx.query(sql, params);
  } catch (error) {
    await tx.query('rollback to savepoint expect_error');
    return (error as { code?: string }).code ?? 'unknown';
  }
  await tx.query('release savepoint expect_error');
  throw new Error(`Se esperaba un error y la consulta funcionó: ${sql}`);
}

type UserOptions = { isAdmin?: boolean; isActive?: boolean };

/** Crea un usuario ficticio en auth.users (el trigger crea profile y rol colportor) y admin si se pide. */
export async function createUser(
  tx: Tx,
  { isAdmin = false, isActive = true }: UserOptions = {},
): Promise<string> {
  const id = randomUUID();
  // El trigger handle_new_user (HU-BASE-03) crea el perfil y el rol colportor.
  await tx.query(
    `insert into auth.users (id, email, aud, role, raw_user_meta_data)
     values ($1, $2, 'authenticated', 'authenticated', '{"full_name": "Usuario de prueba"}')`,
    [id, `${id}@example.test`],
  );
  if (!isActive) await tx.query(`update public.profile set is_active = false where id = $1`, [id]);
  if (isAdmin) await tx.query(`insert into public.user_role (user_id, role) values ($1, 'admin')`, [id]);
  return id;
}

/** Crea una tabla de negocio de prueba con el patrón obligatorio de la migración base. */
export async function createOwnerTable(tx: Tx, name: string, { grant = true }: { grant?: boolean } = {}) {
  await tx.query(`
    create table public.${name} (
      id uuid primary key default gen_random_uuid(),
      owner_id uuid not null default auth.uid() references auth.users,
      note text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      deleted_at timestamptz
    );
    create trigger ${name}_set_updated_at before update on public.${name}
      for each row execute function public.set_updated_at();
    alter table public.${name} enable row level security;
    create policy ${name}_owner on public.${name} for all to authenticated
      using (owner_id = (select auth.uid()) and (select public.is_active_user()))
      with check (owner_id = (select auth.uid()) and (select public.is_active_user()));
  `);
  if (grant) await tx.query(`grant select, insert, update, delete on public.${name} to authenticated`);
}
