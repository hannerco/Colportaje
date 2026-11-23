import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  asUser,
  assertDatabaseReachable,
  createUser,
  expectError,
  inTransaction,
  pool,
  type Tx,
} from './helpers/db';

const INSUFFICIENT_PRIVILEGE = '42501';
const CHECK_VIOLATION = '23514';
const INVALID_ENUM = '22P02';

beforeAll(assertDatabaseReachable);
afterAll(() => pool.end());

/** Un cliente del dueño: las fotos `customer_info` llevan cliente (HU-CLI-07). */
const customerOf = async (tx: Tx, owner: string) => {
  const id = randomUUID();
  await tx.query(`insert into public.customer (id, owner_id, name) values ($1, $2, 'Natalia')`, [id, owner]);
  return id;
};

const insertPhoto = async (tx: Tx, owner: string, kind: string, path?: string) =>
  tx.query(
    `insert into public.photo (id, owner_id, kind, path, thumb_path, bytes, customer_id)
     values ($1, $2, $3, $4, $5, 1000, $6)`,
    [
      randomUUID(),
      owner,
      kind,
      path ?? `${owner}/${kind}/a.webp`,
      `${owner}/${kind}/a.thumb.webp`,
      await customerOf(tx, owner),
    ],
  );

describe('photo: tabla y RLS (HU-BASE-05)', () => {
  it('CA-4: un kind que no existe se rechaza', async () => {
    await inTransaction(async (tx) => {
      const user = await createUser(tx);
      expect(
        await expectError(
          tx,
          `insert into public.photo (id, owner_id, kind, path, bytes) values ($1, $2, 'selfie', 'x', 1)`,
          [randomUUID(), user],
        ),
      ).toBe(INVALID_ENUM);
    });
  });

  it('BR-PHO-02: la ruta debe estar en la carpeta del dueño y del tipo', async () => {
    await inTransaction(async (tx) => {
      const a = await createUser(tx);
      const b = await createUser(tx);
      await insertPhoto(tx, a, 'customer_info');
      await tx.query('savepoint s');
      await expect(insertPhoto(tx, a, 'customer_info', `${b}/customer_info/x.webp`)).rejects.toMatchObject({
        code: CHECK_VIOLATION,
      });
      await tx.query('rollback to savepoint s');
      await expect(insertPhoto(tx, a, 'customer_info', `${a}/deposit_receipt/x.webp`)).rejects.toMatchObject({
        code: CHECK_VIOLATION,
      });
    });
  });

  it('el usuario registra y borra (lógico) sus fotos, pero no puede borrarlas físicamente', async () => {
    await inTransaction(async (tx) => {
      const a = await createUser(tx);
      await asUser(tx, a, async () => {
        await insertPhoto(tx, a, 'customer_info');
        const updated = await tx.query(`update public.photo set deleted_at = now()`);
        expect(updated.rowCount).toBe(1);
        expect(await expectError(tx, `delete from public.photo`)).toBe(INSUFFICIENT_PRIVILEGE);
      });
    });
  });

  it('CA-5: el uso total suma los bytes del usuario, también los de fotos borradas', async () => {
    await inTransaction(async (tx) => {
      const a = await createUser(tx);
      const b = await createUser(tx);
      await tx.query(
        `insert into public.photo (id, owner_id, kind, path, bytes, deleted_at, customer_id) values
          ($1, $3::uuid, 'customer_info', $3::text || '/customer_info/1.webp', 150000, null, $6::uuid),
          ($2, $3::uuid, 'customer_info', $3::text || '/customer_info/2.webp', 140000, now(), $6::uuid),
          ($4, $5::uuid, 'customer_info', $5::text || '/customer_info/3.webp', 999999, null, $7::uuid)`,
        [randomUUID(), randomUUID(), a, randomUUID(), b, await customerOf(tx, a), await customerOf(tx, b)],
      );
      await asUser(tx, a, async () => {
        const { rows } = await tx.query<{ total: string }>('select public.photo_total_bytes() as total');
        expect(Number(rows[0]?.total)).toBe(290_000);
      });
    });
  });
});

describe('bucket user-photos (HU-BASE-05 R2)', () => {
  const objectIn = (folder: string) =>
    `insert into storage.objects (bucket_id, name) values ('user-photos', '${folder}/customer_info/x.webp')`;

  it('es privado, acepta WebP y JPEG (iPhone, #55) y limita el tamaño', async () => {
    const { rows } = await pool.query(
      `select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'user-photos'`,
    );
    expect(rows).toEqual([
      { public: false, file_size_limit: '1048576', allowed_mime_types: ['image/webp', 'image/jpeg'] },
    ]);
  });

  it('CA-2 (SQL): A escribe y lee en su carpeta; no escribe ni ve la de B; un usuario desactivado no accede', async () => {
    await inTransaction(async (tx) => {
      const a = await createUser(tx);
      const b = await createUser(tx);
      const inactive = await createUser(tx, { isActive: false });
      await tx.query(objectIn(b));
      await asUser(tx, a, async () => {
        await tx.query(objectIn(a));
        expect(await expectError(tx, objectIn(b))).toBe(INSUFFICIENT_PRIVILEGE);
        const { rows } = await tx.query(`select name from storage.objects where bucket_id = 'user-photos'`);
        expect(rows).toEqual([{ name: `${a}/customer_info/x.webp` }]);
      });
      await asUser(tx, inactive, async () => {
        expect(await expectError(tx, objectIn(inactive))).toBe(INSUFFICIENT_PRIVILEGE);
      });
    });
  });
});
