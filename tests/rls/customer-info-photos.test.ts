// HU-CLI-07 · photo.customer_id: vínculo y check por tipo, cliente archivado, última modificación y A/B.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asUser, assertDatabaseReachable, createUser, inTransaction, pool, type Tx } from './helpers/db';

beforeAll(assertDatabaseReachable);
afterAll(() => pool.end());

const CHECK_VIOLATION = '23514';

const setup = async (tx: Tx) => {
  const owner = await createUser(tx);
  const customer = randomUUID();
  await tx.query(
    `insert into public.customer (id, owner_id, name, updated_at) values ($1, $2, 'Natalia', '2026-01-01')`,
    [customer, owner],
  );
  return { owner, customer };
};

/** Inserta como el usuario una foto; devuelve el código de error o null. */
const insertAs = (tx: Tx, user: string, kind: string, customer: string | null, id = randomUUID()) =>
  asUser(tx, user, async () => {
    await tx.query('savepoint p');
    try {
      await tx.query(
        `insert into public.photo (id, owner_id, kind, path, thumb_path, bytes, customer_id)
         values ($1::uuid, $2::uuid, $3::public.photo_kind, $2::text || '/' || $3::text || '/' || $1::text || '.webp', null, 1000, $4::uuid)`,
        [id, user, kind, customer],
      );
      await tx.query('release savepoint p');
      return null;
    } catch (error) {
      await tx.query('rollback to savepoint p');
      const e = error as { message: string; code?: string };
      return e.code === 'P0001' ? e.message.split(':')[0]! : e.code!;
    }
  });

const touched = async (tx: Tx, customer: string) =>
  (
    await tx.query<{ t: boolean }>(
      `select updated_at > '2026-01-02' as t from public.customer where id = $1`,
      [customer],
    )
  ).rows[0]!.t;

describe('fotos de información del cliente (HU-CLI-07)', () => {
  it('check: customer_info exige cliente; deposit_receipt no lo lleva', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      expect(await insertAs(tx, owner, 'customer_info', null)).toBe(CHECK_VIOLATION);
      expect(await insertAs(tx, owner, 'deposit_receipt', customer)).toBe(CHECK_VIOLATION);
      expect(await insertAs(tx, owner, 'customer_info', customer)).toBeNull();
    }));

  it('R3: agregar y borrar mueven la última modificación del cliente', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = randomUUID();
      await insertAs(tx, owner, 'customer_info', customer, id);
      expect(await touched(tx, customer)).toBe(true);
      // Sin triggers: set_updated_at pondría now() otra vez.
      await tx.query('set local session_replication_role = replica');
      await tx.query(`update public.customer set updated_at = '2026-01-01' where id = $1`, [customer]);
      await tx.query('set local session_replication_role = origin');
      // Un cambio que no es borrar no la mueve.
      await tx.query(`update public.photo set bytes = 2000 where id = $1`, [id]);
      expect(await touched(tx, customer)).toBe(false);
      await asUser(tx, owner, () =>
        tx.query(`update public.photo set deleted_at = now() where id = $1`, [id]),
      );
      expect(await touched(tx, customer)).toBe(true);
    }));

  it('R2: archivado no recibe fotos (CUSTOMER_ARCHIVED), pero borrar se puede siempre', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const id = randomUUID();
      await insertAs(tx, owner, 'customer_info', customer, id);
      await tx.query(`update public.customer set archived_at = now() where id = $1`, [customer]);
      expect(await insertAs(tx, owner, 'customer_info', customer)).toBe('CUSTOMER_ARCHIVED');
      const deleted = await asUser(tx, owner, () =>
        tx.query(`update public.photo set deleted_at = now() where id = $1`, [id]),
      );
      expect(deleted.rowCount).toBe(1);
    }));

  it('el cliente de una foto no cambia; un cliente ajeno o borrado → NOT_FOUND', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const other = await setup(tx);
      const id = randomUUID();
      await insertAs(tx, owner, 'customer_info', customer, id);
      expect(await insertAs(tx, owner, 'customer_info', other.customer)).toBe('NOT_FOUND');
      const second = randomUUID();
      await tx.query(`insert into public.customer (id, owner_id, name) values ($1, $2, 'Otro')`, [
        second,
        owner,
      ]);
      await tx.query('savepoint m');
      await expect(
        tx.query(`update public.photo set customer_id = $2 where id = $1`, [id, second]),
      ).rejects.toMatchObject({ message: expect.stringContaining('INVALID_TRANSITION') });
      await tx.query('rollback to savepoint m');
      await tx.query(`update public.customer set deleted_at = now() where id = $1`, [second]);
      expect(await insertAs(tx, owner, 'customer_info', second)).toBe('NOT_FOUND');
      // B no ve las fotos de A.
      const seen = await asUser(tx, other.owner, () =>
        tx.query('select id from public.photo where id = $1', [id]),
      );
      expect(seen.rowCount).toBe(0);
    }));
});
