import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createSupabaseAuthRepository } from '@/adapters/supabase/auth-repository';
import { createSupabaseCopyRepository } from '@/adapters/supabase/copy-repository';
import { createUser } from '../../scripts/lib/create-user';
import { adminClient, anonClient, uniqueEmail } from './helpers/local-supabase';

const DB_URL = process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const TITLE = '00000000-0000-4000-8000-000000000201';
// Conexiones independientes: cada inserción es su propia transacción, como dos teléfonos a la vez.
const pool = new pg.Pool({ connectionString: DB_URL, max: 10 });
const admin = adminClient();
const email = uniqueEmail('hu-inv-01');
const password = 'clave-local-123';
let owner: string;

beforeAll(async () => {
  owner = (await createUser(admin, { email, fullName: 'Inventario', password })).userId;
});

afterAll(async () => {
  await pool.query('delete from public.copy_event where owner_id = $1', [owner]);
  await pool.query('delete from public.copy where owner_id = $1', [owner]);
  await pool.query('delete from public.copy_counter where owner_id = $1', [owner]);
  await admin.auth.admin.deleteUser(owner);
  await pool.end();
});

const insertCopy = async () => {
  const id = randomUUID();
  await pool.query(
    `insert into public.copy (id, owner_id, title_id, number, colportor_price_snapshot, public_price_snapshot)
     values ($1, $2, $3, 0, 51000, 60000)`,
    [id, owner, TITLE],
  );
  return id;
};

describe('ejemplares contra Supabase local (HU-INV-01)', () => {
  it('CA-3: 10 inserciones simultáneas del mismo título reciben 1 a 10 sin repetir', async () => {
    await Promise.all(Array.from({ length: 10 }, insertCopy));
    const { rows } = await pool.query<{ number: number }>(
      'select number from public.copy where owner_id = $1 and title_id = $2 order by number',
      [owner, TITLE],
    );
    expect(rows.map((r) => r.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('getHistory: eventos del más reciente al más antiguo, con sus datos; un ejemplar eliminado no se lee', async () => {
    const copyId = await insertCopy();
    await pool.query(`update public.copy set received_at = received_at - 2 where id = $1`, [copyId]);
    const client = anonClient();
    await createSupabaseAuthRepository(() => client).signIn({ email, password });
    const copies = createSupabaseCopyRepository(() => client);

    const history = await copies.getHistory(copyId);
    if (!history.ok) throw new Error(history.error.code);
    expect(history.value.map((e) => e.type)).toEqual(['received_date_changed', 'received']);
    const [changed] = history.value;
    expect(changed?.data.oldDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(changed?.at).toBeInstanceOf(Date);
    expect(changed?.note).toBeNull();

    // Otro usuario (o un id inexistente) no ve nada.
    expect(await copies.getHistory(randomUUID())).toEqual({
      ok: false,
      error: { code: 'NOT_FOUND', retryable: false },
    });

    // R5: eliminado → no aparece en ninguna lectura.
    await pool.query('update public.copy set deleted_at = now() where id = $1', [copyId]);
    expect(await copies.getHistory(copyId)).toEqual({
      ok: false,
      error: { code: 'NOT_FOUND', retryable: false },
    });
  });
});
