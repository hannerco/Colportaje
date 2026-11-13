// HU-CLI-02 · Crear y editar un cliente: enlace de Maps, archivado bloqueado, idempotencia y A/B.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { isValidMapsUrl } from '@/domain/customer-data';
import {
  asUser,
  assertDatabaseReachable,
  createUser,
  expectError,
  inTransaction,
  pool,
  type Tx,
} from './helpers/db';

const RAISED = 'P0001';
const CHECK_VIOLATION = '23514';

beforeAll(assertDatabaseReachable);
afterAll(() => pool.end());

const newCustomer = async (tx: Tx, owner: string, name = 'Natalia Andrea Cárdenas') => {
  const id = randomUUID();
  await asUser(tx, owner, () =>
    tx.query('insert into public.customer (id, name) values ($1, $2)', [id, name]),
  );
  return id;
};

const MAPS_URLS = [
  'https://maps.app.goo.gl/abc',
  'https://www.google.com/maps/place/Medell%C3%ADn',
  'https://google.com/maps?q=6.2,-75.5',
  'https://maps.google.com/?q=6.2,-75.5',
  'https://maps.google.com',
  'https://www.google.com/maps',
  'https://evil.com/maps',
  'http://maps.app.goo.gl/abc',
  'https://www.google.com/search?q=maps',
  'https://www.google.com/mapsxyz',
  'https://maps.app.goo.gl.evil.com/abc',
  'https://maps.google.com@evil.com/',
  'https://maps.google.com:8443/',
  'javascript:alert(1)',
  'https://maps.app.goo.gl/a b',
  'https://www.google.com.co/maps',
];

describe('cliente: enlace de Maps (R3, SECURITY.md)', () => {
  it.each(MAPS_URLS)('la base y el dominio coinciden con %s', (url) =>
    inTransaction(async (tx) => {
      const owner = await createUser(tx);
      const id = await newCustomer(tx, owner);
      const sql = 'update public.customer set maps_url = $2 where id = $1';
      if (isValidMapsUrl(url)) await tx.query(sql, [id, url]);
      else expect(await expectError(tx, sql, [id, url])).toBe(CHECK_VIOLATION);
    }),
  );
});

describe('cliente: crear y editar (HU-CLI-02)', () => {
  it('CA-7: reintentar la creación con el mismo id no duplica ni pisa lo que ya se escribió', () =>
    inTransaction(async (tx) => {
      const owner = await createUser(tx);
      const id = await newCustomer(tx, owner);
      await tx.query(`update public.customer set phone = '312 448 0917' where id = $1`, [id]);
      await asUser(tx, owner, () =>
        tx.query(
          `insert into public.customer (id, name) values ($1, 'Natalia') on conflict (id) do nothing`,
          [id],
        ),
      );
      const { rows } = await tx.query('select name, phone from public.customer where owner_id = $1', [owner]);
      expect(rows).toEqual([{ name: 'Natalia Andrea Cárdenas', phone: '312 448 0917' }]);
    }));

  it('CA-2: un nombre de solo espacios se rechaza al crear y al actualizar', () =>
    inTransaction(async (tx) => {
      const owner = await createUser(tx);
      const id = await newCustomer(tx, owner);
      expect(await expectError(tx, `update public.customer set name = '   ' where id = $1`, [id])).toBe(
        CHECK_VIOLATION,
      );
      expect(
        await expectError(tx, `insert into public.customer (id, owner_id, name) values ($1, $2, '  ')`, [
          randomUUID(),
          owner,
        ]),
      ).toBe(CHECK_VIOLATION);
    }));

  it('CA-3 / R4: cada actualización mueve la última modificación', () =>
    inTransaction(async (tx) => {
      const owner = await createUser(tx);
      const id = await newCustomer(tx, owner);
      await tx.query(`update public.customer set updated_at = '2026-01-01' where id = $1`, [id]);
      await asUser(tx, owner, () =>
        tx.query(`update public.customer set phone = '312 448 0917' where id = $1`, [id]),
      );
      const { rows } = await tx.query(
        `select phone, updated_at > '2026-01-02' as changed from public.customer where id = $1`,
        [id],
      );
      expect(rows).toEqual([{ phone: '312 448 0917', changed: true }]);
    }));

  it('R6: un archivado no se edita; restaurarlo sí, y después se edita', () =>
    inTransaction(async (tx) => {
      const owner = await createUser(tx);
      const id = await newCustomer(tx, owner);
      await tx.query('update public.customer set archived_at = now() where id = $1', [id]);
      for (const set of [
        `name = 'Otra'`,
        `phone = '1'`,
        `avatar_emoji = '🌻'`,
        `maps_url = 'https://maps.app.goo.gl/x'`,
        'deleted_at = now()',
      ]) {
        expect(await expectError(tx, `update public.customer set ${set} where id = $1`, [id])).toBe(RAISED);
      }
      // La "última modificación" que mueve otra función no es una edición.
      await tx.query('update public.customer set updated_at = now() where id = $1', [id]);
      await tx.query('update public.customer set archived_at = null where id = $1', [id]);
      await tx.query(`update public.customer set name = 'Otra' where id = $1`, [id]);
    }));

  it('A/B: B no edita el cliente de A (0 filas) ni lo crea a su nombre', () =>
    inTransaction(async (tx) => {
      const a = await createUser(tx);
      const b = await createUser(tx);
      const id = await newCustomer(tx, a);
      const updated = await asUser(tx, b, () =>
        tx.query(`update public.customer set name = 'Intruso' where id = $1`, [id]),
      );
      expect(updated.rowCount).toBe(0);
      const code = await asUser(tx, b, () =>
        expectError(tx, `insert into public.customer (id, owner_id, name) values ($1, $2, 'X')`, [
          randomUUID(),
          a,
        ]),
      );
      expect(code).toBe('42501');
      const { rows } = await tx.query('select name from public.customer where id = $1', [id]);
      expect(rows[0].name).toBe('Natalia Andrea Cárdenas');
    }));
});
