// HU-CLI-08 · Facturas: nacen con su foto, nunca sin fotos activas, N.º y fecha, borrado y A/B.
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

beforeAll(assertDatabaseReachable);
afterAll(() => pool.end());

const INSUFFICIENT_PRIVILEGE = '42501';

type Outcome = { ok: true; value: unknown } | { ok: false; code: string; detail?: string; pgCode?: string };

/** Llama a una función como el usuario (o anon) dentro de un savepoint. */
const call = (tx: Tx, user: string | null, sql: string, params: unknown[]) => {
  const run = async (): Promise<Outcome> => {
    await tx.query('savepoint fn');
    try {
      const { rows } = await tx.query(sql, params);
      await tx.query('release savepoint fn');
      return { ok: true, value: rows[0] ? Object.values(rows[0])[0] : undefined };
    } catch (error) {
      await tx.query('rollback to savepoint fn');
      const e = error as { message: string; code?: string; detail?: string };
      return { ok: false, code: e.message.split(':')[0]!, detail: e.detail, pgCode: e.code };
    }
  };
  return user === null ? asAnon(tx, run) : asUser(tx, user, run);
};

const path = (owner: string, photo: string) => `${owner}/customer_invoice/${photo}.webp`;

const create = (
  tx: Tx,
  user: string | null,
  owner: string,
  invoice: string,
  photo: string,
  customer: string,
) =>
  call(tx, user, 'select public.create_invoice_with_photo($1, $2, $3, $4, $5, 1000)', [
    invoice,
    photo,
    customer,
    path(owner, photo),
    path(owner, photo).replace('.webp', '.thumb.webp'),
  ]);

const addPhoto = (tx: Tx, user: string, invoice: string, photo: string) =>
  call(tx, user, 'select public.add_invoice_photo($1, $2, $3, $4, 1000)', [
    invoice,
    photo,
    path(user, photo),
    null,
  ]);

const update = (tx: Tx, user: string, invoice: string, patch: unknown) =>
  call(tx, user, 'select public.update_invoice($1, $2::jsonb)', [invoice, JSON.stringify(patch)]);

const deletePhoto = (tx: Tx, user: string, photo: string) =>
  call(tx, user, 'select public.delete_invoice_photo($1) as deleted', [photo]);

const setup = async (tx: Tx) => {
  const owner = await createUser(tx);
  const customer = randomUUID();
  await tx.query(
    `insert into public.customer (id, owner_id, name, updated_at) values ($1, $2, 'Natalia', '2026-01-01')`,
    [customer, owner],
  );
  return { owner, customer };
};

const invoiceRow = async (tx: Tx, id: string) =>
  (
    await tx.query(
      `select i.invoice_number as number, i.invoice_date::text as date, i.invoice_date = public.today_bogota() as today,
              i.deleted_at is not null as deleted,
              (select count(*)::int from public.photo p where p.invoice_id = i.id and p.deleted_at is null) as photos
       from public.customer_invoice i where i.id = $1`,
      [id],
    )
  ).rows[0];

const resetTouched = async (tx: Tx, customer: string) => {
  await tx.query('set local session_replication_role = replica');
  await tx.query(`update public.customer set updated_at = '2026-01-01' where id = $1`, [customer]);
  await tx.query('set local session_replication_role = origin');
};

const touched = async (tx: Tx, customer: string) =>
  (
    await tx.query<{ t: boolean }>(
      `select updated_at > '2026-01-02' as t from public.customer where id = $1`,
      [customer],
    )
  ).rows[0]!.t;

describe('facturas (HU-CLI-08)', () => {
  it('CA-1 / R1 / R2 / R5: nace con su foto, fecha de hoy y sin N.º; mueve la última modificación', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const invoice = randomUUID();
      expect(await create(tx, owner, owner, invoice, randomUUID(), customer)).toMatchObject({ ok: true });
      expect(await invoiceRow(tx, invoice)).toMatchObject({
        number: null,
        today: true,
        deleted: false,
        photos: 1,
      });
      expect(await touched(tx, customer)).toBe(true);
      await tx.query('set constraints all immediate');
    }));

  it('reintentar la creación con los mismos ids no duplica; otro cliente con el mismo id → CONFLICT', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const [invoice, photo] = [randomUUID(), randomUUID()];
      await create(tx, owner, owner, invoice, photo, customer);
      expect(await create(tx, owner, owner, invoice, photo, customer)).toMatchObject({ ok: true });
      const n = await tx.query('select count(*)::int as n from public.photo where invoice_id = $1', [
        invoice,
      ]);
      expect(n.rows[0].n).toBe(1);
      const other = randomUUID();
      await tx.query(`insert into public.customer (id, owner_id, name) values ($1, $2, 'Otro')`, [
        other,
        owner,
      ]);
      expect(await create(tx, owner, owner, invoice, photo, other)).toMatchObject({ code: 'CONFLICT' });
      expect(await create(tx, owner, owner, invoice, randomUUID(), customer)).toMatchObject({
        code: 'CONFLICT',
      });
    }));

  it('CA-2 / CA-5 / R2 / R3: N.º "0123" en dos facturas sin error; fecha editable, vaciable y validada', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const [a, b] = [randomUUID(), randomUUID()];
      await create(tx, owner, owner, a, randomUUID(), customer);
      await create(tx, owner, owner, b, randomUUID(), customer);
      await resetTouched(tx, customer);
      expect(await update(tx, owner, a, { number: ' 0123 ' })).toMatchObject({ ok: true });
      expect(await touched(tx, customer)).toBe(true);
      expect(await update(tx, owner, b, { number: '0123', date: '2026-10-30' })).toMatchObject({ ok: true });
      expect(await invoiceRow(tx, a)).toMatchObject({ number: '0123' });
      expect(await invoiceRow(tx, b)).toMatchObject({ number: '0123', date: '2026-10-30' });
      // Clave ausente no cambia; null vacía; N.º vacío = null.
      expect(await update(tx, owner, b, { date: null })).toMatchObject({ ok: true });
      expect(await invoiceRow(tx, b)).toMatchObject({ number: '0123', date: null });
      expect(await update(tx, owner, b, { number: '  ' })).toMatchObject({ ok: true });
      expect(await invoiceRow(tx, b)).toMatchObject({ number: null });
      for (const bad of ['2026-02-30', '30/10/2026', 5])
        expect(await update(tx, owner, b, { date: bad })).toMatchObject({
          code: 'VALIDATION',
          detail: 'date',
        });
      expect(await update(tx, owner, b, { number: 123 })).toMatchObject({
        code: 'VALIDATION',
        detail: 'number',
      });
      expect(await update(tx, owner, b, [])).toMatchObject({ code: 'VALIDATION', detail: 'patch' });
    }));

  it('CA-3 / CA-4 / R4: con 2 fotos borrar una deja la factura; borrar la última la borra', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const [invoice, first, second] = [randomUUID(), randomUUID(), randomUUID()];
      await create(tx, owner, owner, invoice, first, customer);
      expect(await addPhoto(tx, owner, invoice, second)).toMatchObject({ ok: true });
      expect(await addPhoto(tx, owner, invoice, second)).toMatchObject({ ok: true }); // reintento
      expect(await invoiceRow(tx, invoice)).toMatchObject({ photos: 2 });
      await resetTouched(tx, customer);
      expect(await deletePhoto(tx, owner, first)).toEqual({ ok: true, value: false });
      expect(await touched(tx, customer)).toBe(true);
      expect(await deletePhoto(tx, owner, second)).toEqual({ ok: true, value: true });
      expect(await deletePhoto(tx, owner, second)).toEqual({ ok: true, value: true }); // reintento
      expect(await invoiceRow(tx, invoice)).toMatchObject({ deleted: true, photos: 0 });
      expect(await addPhoto(tx, owner, invoice, randomUUID())).toMatchObject({ code: 'NOT_FOUND' });
      expect(await update(tx, owner, invoice, { number: '1' })).toMatchObject({ code: 'NOT_FOUND' });
      await tx.query('set constraints all immediate');
    }));

  it('CA-6: la API no inserta facturas ni maneja fotos de factura directo', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const [invoice, photo] = [randomUUID(), randomUUID()];
      await asUser(tx, owner, async () => {
        expect(
          await expectError(
            tx,
            `insert into public.customer_invoice (id, owner_id, customer_id) values ($1, $2, $3)`,
            [randomUUID(), owner, customer],
          ),
        ).toBe(INSUFFICIENT_PRIVILEGE);
      });
      await create(tx, owner, owner, invoice, photo, customer);
      const direct = await call(
        tx,
        owner,
        `insert into public.photo (id, owner_id, kind, path, bytes, customer_id, invoice_id)
         values ($1, $2, 'customer_invoice', $3, 1, $4, $5)`,
        [randomUUID(), owner, path(owner, 'x'), customer, invoice],
      );
      expect(direct).toMatchObject({ code: 'INVALID_TRANSITION' });
      const softDelete = await call(tx, owner, `update public.photo set deleted_at = now() where id = $1`, [
        photo,
      ]);
      expect(softDelete).toMatchObject({ code: 'INVALID_TRANSITION' });
      await asUser(tx, owner, async () => {
        expect(await expectError(tx, `update public.customer_invoice set invoice_number = 'x'`)).toBe(
          INSUFFICIENT_PRIVILEGE,
        );
      });
    }));

  it('R1 (diferido): una factura activa sin fotos o una foto en factura borrada no pasan al confirmar', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const [invoice, photo] = [randomUUID(), randomUUID()];
      await create(tx, owner, owner, invoice, photo, customer);
      await tx.query('savepoint c');
      await tx.query(`update public.photo set deleted_at = now() where id = $1`, [photo]);
      await expect(tx.query('set constraints all immediate')).rejects.toMatchObject({
        message: expect.stringContaining('INVOICE_WITHOUT_PHOTO'),
      });
      await tx.query('rollback to savepoint c');
      await tx.query(`update public.customer_invoice set deleted_at = now() where id = $1`, [invoice]);
      await expect(tx.query('set constraints all immediate')).rejects.toMatchObject({
        message: expect.stringContaining('INVALID_TRANSITION'),
      });
    }));

  it('archivado: no recibe facturas, fotos ni cambios; borrar fotos sí. Seguridad A/B, inactivo y anon', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const [invoice, photo] = [randomUUID(), randomUUID()];
      await create(tx, owner, owner, invoice, photo, customer);
      const intruder = await createUser(tx);
      expect(await create(tx, intruder, intruder, randomUUID(), randomUUID(), customer)).toMatchObject({
        code: 'NOT_FOUND',
      });
      expect(await addPhoto(tx, intruder, invoice, randomUUID())).toMatchObject({ code: 'NOT_FOUND' });
      expect(await update(tx, intruder, invoice, { number: '1' })).toMatchObject({ code: 'NOT_FOUND' });
      expect(await deletePhoto(tx, intruder, photo)).toMatchObject({ code: 'NOT_FOUND' });
      const seen = await asUser(tx, intruder, () =>
        tx.query('select id from public.customer_invoice where id = $1', [invoice]),
      );
      expect(seen.rowCount).toBe(0);
      expect(await create(tx, null, owner, randomUUID(), randomUUID(), customer)).toMatchObject({
        pgCode: INSUFFICIENT_PRIVILEGE,
      });

      await tx.query(`update public.customer set archived_at = now() where id = $1`, [customer]);
      expect(await create(tx, owner, owner, randomUUID(), randomUUID(), customer)).toMatchObject({
        code: 'CUSTOMER_ARCHIVED',
      });
      expect(await addPhoto(tx, owner, invoice, randomUUID())).toMatchObject({ code: 'CUSTOMER_ARCHIVED' });
      expect(await update(tx, owner, invoice, { number: '1' })).toMatchObject({ code: 'CUSTOMER_ARCHIVED' });
      expect(await deletePhoto(tx, owner, photo)).toEqual({ ok: true, value: true });

      await tx.query('update public.profile set is_active = false where id = $1', [owner]);
      expect(await create(tx, owner, owner, randomUUID(), randomUUID(), customer)).toMatchObject({
        code: 'FORBIDDEN',
      });
    }));
});
