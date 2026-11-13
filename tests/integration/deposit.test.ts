// HU-DIN-01 · Abibono contra Supabase local: COMMIT real (las reglas diferidas se comprueban al confirmar
// la transacción) y acceso por la API con la sesión del usuario (RLS A/B).
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AppSupabaseClient } from '@/adapters/supabase/client';
import { createUser } from '../../scripts/lib/create-user';
import { adminClient, anonClient, uniqueEmail } from './helpers/local-supabase';

const DB_URL = process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
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
  const user = { id: userId, client };
  users.push(user);
  return user;
};

/** Corre `fn` en una transacción que se CONFIRMA (como lo hará cada función de HU-DIN-04/05/07). */
const committed = async (fn: (c: pg.PoolClient) => Promise<void>) => {
  const c = await pool.connect();
  try {
    await c.query('begin');
    await fn(c);
    await c.query('commit');
  } catch (error) {
    await c.query('rollback');
    throw error;
  } finally {
    c.release();
  }
};

afterAll(async () => {
  for (const { id } of users) {
    // Limpieza física de datos de prueba (la app nunca borra así: los bloqueos son para UPDATE).
    await pool.query('delete from public.payment where owner_id = $1', [id]);
    await pool.query('delete from public.leader_deposit_event where owner_id = $1', [id]);
    // Un Abibono confirmado no se borra (trigger); para limpiar se omiten los triggers solo en esta sesión.
    await pool.query(`begin; set local session_replication_role = replica;
                      delete from public.leader_deposit where owner_id = '${id}'; commit;`);
    await pool.query('delete from public.leader_deposit_counter where owner_id = $1', [id]);
    await pool.query('delete from public.customer where owner_id = $1', [id]);
    await admin.auth.admin.deleteUser(id);
  }
  await pool.end();
});

let a: { id: string; client: AppSupabaseClient };
let b: { id: string; client: AppSupabaseClient };
let payment: string;
let deposit: string;

beforeAll(async () => {
  a = await newUser('hu-din-01-a');
  b = await newUser('hu-din-01-b');
  const customer = randomUUID();
  payment = randomUUID();
  deposit = randomUUID();
  // Un abono cobrado, en un Abibono que se confirma: Abibono y abono cambian en la misma transacción.
  await committed(async (c) => {
    await c.query(`insert into public.customer (id, owner_id, name) values ($1, $2, 'Clienta')`, [
      customer,
      a.id,
    ]);
    await c.query(
      `insert into public.payment (id, owner_id, customer_id, kind, status, paid_amount, paid_at, method)
       values ($1, $2, $3, 'extra', 'collected', 40000, public.today_bogota(), 'cash')`,
      [payment, a.id, customer],
    );
    await c.query(`insert into public.leader_deposit (id, owner_id, cash_amount) values ($1, $2, 40000)`, [
      deposit,
      a.id,
    ]);
    await c.query('update public.payment set leader_deposit_id = $2 where id = $1', [payment, deposit]);
  });
  await committed(async (c) => {
    // Primero el Abibono y después el abono: la regla R6 se comprueba al final.
    await c.query(
      `update public.leader_deposit set status = 'confirmed', confirmed_at = now() where id = $1`,
      [deposit],
    );
    await c.query(`update public.payment set status = 'delivered' where id = $1`, [payment]);
  });
});

describe('Abibono contra Supabase local (HU-DIN-01)', () => {
  it('R6 con COMMIT real: confirmar el Abibono sin entregar sus abonos no se guarda', async () => {
    const other = randomUUID();
    await committed(async (c) => {
      await c.query(`insert into public.leader_deposit (id, owner_id, cash_amount) values ($1, $2, 1)`, [
        other,
        a.id,
      ]);
    });
    const p = randomUUID();
    await committed(async (c) => {
      await c.query(
        `insert into public.payment (id, owner_id, customer_id, kind, status, paid_amount, paid_at, method, leader_deposit_id)
         select $1, $2, customer_id, 'extra', 'collected', 1000, public.today_bogota(), 'cash', $3
         from public.payment where id = $4`,
        [p, a.id, other, payment],
      );
    });
    await expect(
      committed(async (c) => {
        await c.query(
          `update public.leader_deposit set status = 'confirmed', confirmed_at = now() where id = $1`,
          [other],
        );
      }),
    ).rejects.toMatchObject({ code: 'P0001' });
    const { rows } = await pool.query(
      'select status, deposit_number from public.leader_deposit where id = $1',
      [other],
    );
    expect(rows).toEqual([{ status: 'draft', deposit_number: null }]);
  });

  it('el Abibono confirmado recibió su número 1 y su evento', async () => {
    const { data, error } = await a.client
      .from('leader_deposit')
      .select('deposit_number, status')
      .eq('id', deposit)
      .single();
    expect(error).toBeNull();
    expect(data).toEqual({ deposit_number: 1, status: 'confirmed' });
    const events = await a.client
      .from('leader_deposit_event')
      .select('type')
      .eq('leader_deposit_id', deposit);
    expect(events.data).toEqual([{ type: 'confirmed' }]);
  });

  it('CA-4: cambiar el valor de un abono entregado por la API se rechaza', async () => {
    const { error } = await a.client.from('payment').update({ paid_amount: 1 }).eq('id', payment);
    expect(error?.code).toBe('42501');
    const { rows } = await pool.query('select paid_amount from public.payment where id = $1', [payment]);
    expect(rows[0].paid_amount).toBe(40_000);
  });

  it('CA-5: cambiar el efectivo de un Abibono confirmado por la API se rechaza', async () => {
    const { error } = await a.client.from('leader_deposit').update({ cash_amount: 1 }).eq('id', deposit);
    expect(error?.code).toBe('42501');
  });

  it('CA-6: vincular el abono a otro Abibono se rechaza (también por la API)', async () => {
    const { error } = await a.client
      .from('payment')
      .update({ leader_deposit_id: randomUUID() })
      .eq('id', payment);
    expect(error?.code).toBe('42501');
  });

  it('RLS A/B: A ve su Abibono y su abono vinculado; B no ve nada de A', async () => {
    const own = await a.client.from('payment').select('id, leader_deposit_id, status').eq('id', payment);
    expect(own.data).toEqual([{ id: payment, leader_deposit_id: deposit, status: 'delivered' }]);
    const foreign = await b.client.from('leader_deposit').select('id');
    expect(foreign.data).toEqual([]);
    const foreignEvents = await b.client.from('leader_deposit_event').select('id');
    expect(foreignEvents.data).toEqual([]);
  });
});
