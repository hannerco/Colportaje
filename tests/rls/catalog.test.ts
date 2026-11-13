import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  asAnon,
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
const SEED_TITLES = 15;

beforeAll(assertDatabaseReachable);
afterAll(() => pool.end());

const insertTitle = (
  tx: Tx,
  values: { category: string; publicPrice: number | null; colportorPrice?: number },
) =>
  `insert into public.title (id, name, public_price, colportor_price, category)
   values ('${randomUUID()}', 'Prueba', ${values.publicPrice ?? 'null'}, ${values.colportorPrice ?? 1000}, '${values.category}')`;

const countTitles = async (tx: Tx) =>
  (await tx.query<{ n: number }>('select count(*)::int as n from public.title')).rows[0]?.n;

describe('title: RLS (HU-BASE-04 R1, R3)', () => {
  it('R1: un usuario autenticado y activo lee todo el catálogo (incluidos los desactivados, para getMany)', async () => {
    await inTransaction(async (tx) => {
      const user = await createUser(tx);
      await asUser(tx, user, async () => {
        expect(await countTitles(tx)).toBe(SEED_TITLES);
      });
    });
  });

  it('R1: un usuario desactivado no lee títulos; anon no tiene acceso', async () => {
    await inTransaction(async (tx) => {
      const user = await createUser(tx, { isActive: false });
      await asUser(tx, user, async () => {
        expect(await countTitles(tx)).toBe(0);
      });
      await asAnon(tx, async () => {
        expect(await expectError(tx, 'select * from public.title')).toBe(INSUFFICIENT_PRIVILEGE);
      });
    });
  });

  it('CA-4: un colportor no puede modificar ni crear títulos', async () => {
    await inTransaction(async (tx) => {
      const user = await createUser(tx);
      await asUser(tx, user, async () => {
        const updated = await tx.query(`update public.title set colportor_price = 1`);
        expect(updated.rowCount).toBe(0);
        expect(await expectError(tx, insertTitle(tx, { category: 'cultural', publicPrice: 1000 }))).toBe(
          INSUFFICIENT_PRIVILEGE,
        );
      });
    });
  });

  it('BR-TIT-01: el admin crea y edita títulos', async () => {
    await inTransaction(async (tx) => {
      const admin = await createUser(tx, { isAdmin: true });
      await asUser(tx, admin, async () => {
        await tx.query(insertTitle(tx, { category: 'cultural', publicPrice: 50_000 }));
        const updated = await tx.query(
          `update public.title set is_active = false where id = '00000000-0000-4000-8000-000000000101'`,
        );
        expect(updated.rowCount).toBe(1);
      });
    });
  });

  it('R3 / BR-TIT-03: nadie borra un título, ni el admin ni la service_role', async () => {
    await inTransaction(async (tx) => {
      const admin = await createUser(tx, { isAdmin: true });
      await asUser(tx, admin, async () => {
        expect(await expectError(tx, `delete from public.title`)).toBe(INSUFFICIENT_PRIVILEGE);
      });
      await tx.query('set local role service_role');
      expect(await expectError(tx, `delete from public.title`)).toBe(INSUFFICIENT_PRIVILEGE);
      await tx.query('reset role');
    });
  });
});

describe('title: checks de precio (HU-BASE-04 R2, BR-TIT-04)', () => {
  it.each([
    ['cultural sin precio público', { category: 'cultural', publicPrice: null }],
    ['religioso sin precio público', { category: 'religious', publicPrice: null }],
    ['precio público 0', { category: 'cultural', publicPrice: 0 }],
    ['minibook con precio público 0', { category: 'minibook', publicPrice: 0 }],
    ['precio colportor negativo', { category: 'minibook', publicPrice: null, colportorPrice: -1 }],
  ])('R2: la base rechaza %s', async (_label, values) => {
    await inTransaction(async (tx) => {
      expect(await expectError(tx, insertTitle(tx, values))).toBe(CHECK_VIOLATION);
    });
  });

  it('R2: acepta un minibook sin precio público y gratis', async () => {
    await inTransaction(async (tx) => {
      await tx.query(insertTitle(tx, { category: 'minibook', publicPrice: null, colportorPrice: 0 }));
    });
  });
});

describe('bucket title-images (HU-BASE-04, SECURITY.md)', () => {
  const upload = `insert into storage.objects (bucket_id, name) values ('title-images', 'portadas/prueba.webp')`;

  it('existe y es público', async () => {
    const { rows } = await pool.query(`select public from storage.buckets where id = 'title-images'`);
    expect(rows).toEqual([{ public: true }]);
  });

  it('un colportor no sube portadas; el admin sí; cualquiera puede leerlas', async () => {
    await inTransaction(async (tx) => {
      const user = await createUser(tx);
      const admin = await createUser(tx, { isAdmin: true });
      await asUser(tx, user, async () => {
        expect(await expectError(tx, upload)).toBe(INSUFFICIENT_PRIVILEGE);
      });
      await asUser(tx, admin, async () => {
        await tx.query(upload);
      });
      await asAnon(tx, async () => {
        const { rows } = await tx.query(`select name from storage.objects where bucket_id = 'title-images'`);
        expect(rows).toEqual([{ name: 'portadas/prueba.webp' }]);
      });
    });
  });
});
