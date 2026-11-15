// HU-CLI-03 · customer_discard_summary y discard_new_customer: resumen, efecto, bloqueo por Abibono, todo o
// nada, errores y A/B.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  asAnon,
  asUser,
  assertDatabaseReachable,
  createUser,
  inTransaction,
  pool,
  type Tx,
} from './helpers/db';

const CORAZON = '00000000-0000-4000-8000-000000000201'; // seed

beforeAll(assertDatabaseReachable);
afterAll(() => pool.end());

type Outcome = { ok: true; rows: Record<string, unknown>[] } | { ok: false; code: string; pgCode?: string };

const call = (tx: Tx, user: string | null, sql: string, params: unknown[]) => {
  const run = async (): Promise<Outcome> => {
    await tx.query('savepoint fn');
    try {
      const { rows } = await tx.query(sql, params);
      await tx.query('release savepoint fn');
      return { ok: true, rows };
    } catch (error) {
      await tx.query('rollback to savepoint fn');
      const e = error as { message: string; code?: string };
      return { ok: false, code: e.message.split(':')[0]!, pgCode: e.code };
    }
  };
  return user === null ? asAnon(tx, run) : asUser(tx, user, run);
};

const summary = (tx: Tx, user: string | null, customer: string) =>
  call(tx, user, 'select * from public.customer_discard_summary($1)', [customer]);
const discard = (tx: Tx, user: string | null, customer: string) =>
  call(tx, user, 'select public.discard_new_customer($1)', [customer]);

const newCustomer = async (tx: Tx, owner: string) => {
  const id = randomUUID();
  await tx.query(`insert into public.customer (id, owner_id, name) values ($1, $2, 'Natalia')`, [id, owner]);
  return id;
};

/** Ejemplar recibido el 30/10 y vendido al cliente (como lo deja assign_copy_to_customer). */
const soldCopy = async (tx: Tx, owner: string, customer: string, number: number) => {
  const id = randomUUID();
  await tx.query(
    `insert into public.copy (id, owner_id, title_id, number, public_price_snapshot, colportor_price_snapshot, received_at)
     values ($1, $2, $3, $4, 95000, 1000, '2026-10-30')`,
    [id, owner, CORAZON, number],
  );
  await tx.query(
    `update public.copy set status = 'sold', customer_id = $2, agreed_price = 95000, sold_at = now() where id = $1`,
    [id, customer],
  );
  return id;
};

const downPayment = async (tx: Tx, owner: string, customer: string) => {
  const id = randomUUID();
  await tx.query(
    `insert into public.payment (id, owner_id, customer_id, kind, status, paid_at, due_date, original_due_date,
                                 paid_amount, method)
     values ($1, $2, $3, 'down_payment', 'collected', public.today_bogota(), public.today_bogota(),
             public.today_bogota(), 40000, 'cash')`,
    [id, owner, customer],
  );
  return id;
};

const scheduledPayment = async (tx: Tx, owner: string, customer: string, status = 'scheduled') => {
  const id = randomUUID();
  await tx.query(
    `insert into public.payment (id, owner_id, customer_id, kind, status, agreed_amount, due_date, original_due_date)
     values ($1, $2, $3, 'scheduled', 'scheduled', 50000, public.today_bogota() + 10, public.today_bogota() + 10)`,
    [id, owner, customer],
  );
  if (status === 'canceled')
    await tx.query(
      `update public.payment set status = 'canceled', canceled_at = now(), cancel_reason = 'manual' where id = $1`,
      [id],
    );
  return id;
};

const infoPhoto = async (tx: Tx, owner: string, customer: string) => {
  const id = randomUUID();
  await tx.query(
    `insert into public.photo (id, owner_id, kind, path, bytes, customer_id)
     values ($1, $2, 'customer_info', $3, 100, $4)`,
    [id, owner, `${owner}/customer_info/${id}.webp`, customer],
  );
  return id;
};

/** Factura con una foto (como la deja create_invoice_with_photo). */
const invoice = async (tx: Tx, owner: string, customer: string) => {
  const [id, photo] = [randomUUID(), randomUUID()];
  await tx.query(`insert into public.customer_invoice (id, owner_id, customer_id) values ($1, $2, $3)`, [
    id,
    owner,
    customer,
  ]);
  await tx.query(
    `insert into public.photo (id, owner_id, kind, path, bytes, customer_id, invoice_id)
     values ($1, $2, 'customer_invoice', $3, 100, $4, $5)`,
    [photo, owner, `${owner}/customer_invoice/${photo}.webp`, customer, id],
  );
  return { id, photo };
};

/** Cliente de CA-1: 2 libros, 1 cuota inicial y 1 foto. */
const setup = async (tx: Tx) => {
  const owner = await createUser(tx);
  const customer = await newCustomer(tx, owner);
  const copies = [await soldCopy(tx, owner, customer, 0), await soldCopy(tx, owner, customer, 1)];
  const payment = await downPayment(tx, owner, customer);
  const photo = await infoPhoto(tx, owner, customer);
  return { owner, customer, copies, payment, photo };
};

/** Todo lo que el descarte podría tocar, para comprobar que nada cambió. */
const snapshot = async (tx: Tx, owner: string) =>
  (
    await tx.query(
      `select
         (select json_agg(c order by c.id) from public.customer c where c.owner_id = $1) as customers,
         (select json_agg(cp order by cp.id) from public.copy cp where cp.owner_id = $1) as copies,
         (select count(*) from public.copy_event e where e.owner_id = $1) as copy_events,
         (select json_agg(p order by p.id) from public.payment p where p.owner_id = $1) as payments,
         (select json_agg(ph order by ph.id) from public.photo ph where ph.owner_id = $1) as photos,
         (select json_agg(i order by i.id) from public.customer_invoice i where i.owner_id = $1) as invoices`,
      [owner],
    )
  ).rows[0];

const deleted = async (tx: Tx, table: string, id: string) =>
  (await tx.query(`select deleted_at is not null as d from public.${table} where id = $1`, [id])).rows[0].d;

describe('customer_discard_summary (HU-CLI-03)', () => {
  it('CA-1: 2 libros, 1 cuota inicial y 1 foto → { 2, 1, 0, 1, false }', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      expect(await summary(tx, owner, customer)).toEqual({
        ok: true,
        rows: [{ books: 2, payments: 1, invoices: 0, photos: 1, blocked_by_deposit: false }],
      });
    }));

  it('cuenta las facturas (sus fotos van dentro) y no cuenta abonos cancelados ni borrados', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      await invoice(tx, owner, customer);
      await scheduledPayment(tx, owner, customer, 'canceled');
      const gone = await scheduledPayment(tx, owner, customer);
      await tx.query('update public.payment set deleted_at = now() where id = $1', [gone]);
      expect(await summary(tx, owner, customer)).toMatchObject({
        ok: true,
        rows: [{ books: 2, payments: 1, invoices: 1, photos: 1, blocked_by_deposit: false }],
      });
    }));

  it('CA-4: un cliente solo con nombre → todo en 0', () =>
    inTransaction(async (tx) => {
      const owner = await createUser(tx);
      const customer = await newCustomer(tx, owner);
      expect(await summary(tx, owner, customer)).toEqual({
        ok: true,
        rows: [{ books: 0, payments: 0, invoices: 0, photos: 0, blocked_by_deposit: false }],
      });
    }));
});

describe('discard_new_customer (HU-CLI-03)', () => {
  it('CA-2 / R2 / R4: libros a físico (received_at intacto, wrong_registration); todo lo demás borrado', () =>
    inTransaction(async (tx) => {
      const { owner, customer, copies, payment, photo } = await setup(tx);
      const inv = await invoice(tx, owner, customer);
      const scheduled = await scheduledPayment(tx, owner, customer);
      const canceled = await scheduledPayment(tx, owner, customer, 'canceled');

      expect(await discard(tx, owner, customer)).toMatchObject({ ok: true });

      const rows = await tx.query(
        `select status, customer_id, agreed_price, sold_at, received_at::text as received
         from public.copy where id = any($1) order by number`,
        [copies],
      );
      expect(rows.rows).toEqual([
        { status: 'in_stock', customer_id: null, agreed_price: null, sold_at: null, received: '2026-10-30' },
        { status: 'in_stock', customer_id: null, agreed_price: null, sold_at: null, received: '2026-10-30' },
      ]);
      const events = await tx.query(
        `select distinct on (copy_id) type, data from public.copy_event where copy_id = any($1)
         order by copy_id, seq desc`,
        [copies],
      );
      expect(events.rows).toEqual([
        { type: 'returned', data: { reason: 'wrong_registration' } },
        { type: 'returned', data: { reason: 'wrong_registration' } },
      ]);
      for (const id of [payment, scheduled, canceled]) expect(await deleted(tx, 'payment', id)).toBe(true);
      for (const id of [photo, inv.photo]) expect(await deleted(tx, 'photo', id)).toBe(true);
      expect(await deleted(tx, 'customer_invoice', inv.id)).toBe(true);
      expect(await deleted(tx, 'customer', customer)).toBe(true);
      // La verificación diferida de facturas (HU-CLI-08) queda cumplida.
      await tx.query('set constraints all immediate');
      // R3: el usuario ya no lo ve (las lecturas filtran deleted_at).
      const visible = await asUser(tx, owner, () =>
        tx.query(
          `select (select count(*)::int from public.customer where deleted_at is null) as customers,
                  (select count(*)::int from public.payment where deleted_at is null) as payments`,
        ),
      );
      expect(visible.rows[0]).toEqual({ customers: 0, payments: 0 });
    }));

  it('CA-3 / R1: con la cuota en un Abibono borrador → CUSTOMER_DISCARD_BLOCKED y nada cambia', () =>
    inTransaction(async (tx) => {
      const { owner, customer, payment } = await setup(tx);
      const deposit = randomUUID();
      await tx.query(`insert into public.leader_deposit (id, owner_id, cash_amount) values ($1, $2, 40000)`, [
        deposit,
        owner,
      ]);
      await tx.query('update public.payment set leader_deposit_id = $2 where id = $1', [payment, deposit]);
      expect(await summary(tx, owner, customer)).toMatchObject({ rows: [{ blocked_by_deposit: true }] });
      const before = await snapshot(tx, owner);
      expect(await discard(tx, owner, customer)).toEqual({
        ok: false,
        code: 'CUSTOMER_DISCARD_BLOCKED',
        pgCode: 'P0001',
      });
      expect(await snapshot(tx, owner)).toEqual(before);
    }));

  it('R1: también con un Abibono confirmado (abono entregado)', () =>
    inTransaction(async (tx) => {
      const { owner, customer, payment } = await setup(tx);
      const deposit = randomUUID();
      await tx.query('set local session_replication_role = replica');
      await tx.query(
        `insert into public.leader_deposit (id, owner_id, cash_amount, status, confirmed_at, deposit_number)
         values ($1, $2, 40000, 'confirmed', now(), 1)`,
        [deposit, owner],
      );
      await tx.query(`update public.payment set leader_deposit_id = $2, status = 'delivered' where id = $1`, [
        payment,
        deposit,
      ]);
      await tx.query('set local session_replication_role = origin');
      expect(await discard(tx, owner, customer)).toMatchObject({
        ok: false,
        code: 'CUSTOMER_DISCARD_BLOCKED',
      });
      expect(await deleted(tx, 'customer', customer)).toBe(false);
    }));

  it('CA-4: un cliente solo con nombre desaparece', () =>
    inTransaction(async (tx) => {
      const owner = await createUser(tx);
      const customer = await newCustomer(tx, owner);
      expect(await discard(tx, owner, customer)).toMatchObject({ ok: true });
      expect(await deleted(tx, 'customer', customer)).toBe(true);
    }));

  it('CA-5: un fallo a mitad (el último paso) no deja nada cambiado', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      await invoice(tx, owner, customer);
      // Fallo simulado al borrar el cliente, que es lo último que hace la función.
      await tx.query(`
        create function pg_temp.fail_discard() returns trigger language plpgsql as $$
        begin
          if new.deleted_at is not null then raise exception 'SIMULATED: fallo a mitad'; end if;
          return new;
        end $$`);
      await tx.query(
        `create trigger fail_discard before update on public.customer for each row
         execute function pg_temp.fail_discard()`,
      );
      const before = await snapshot(tx, owner);
      expect(await discard(tx, owner, customer)).toMatchObject({ ok: false, code: 'SIMULATED' });
      expect(await snapshot(tx, owner)).toEqual(before);
    }));

  it('descartar dos veces → NOT_FOUND; el resumen de un descartado también', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      expect(await discard(tx, owner, customer)).toMatchObject({ ok: true });
      expect(await discard(tx, owner, customer)).toMatchObject({ ok: false, code: 'NOT_FOUND' });
      expect(await summary(tx, owner, customer)).toMatchObject({ ok: false, code: 'NOT_FOUND' });
    }));

  it('un cliente archivado no se descarta (CUSTOMER_ARCHIVED)', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      await tx.query('update public.customer set archived_at = now() where id = $1', [customer]);
      expect(await discard(tx, owner, customer)).toMatchObject({ ok: false, code: 'CUSTOMER_ARCHIVED' });
      expect(await deleted(tx, 'customer', customer)).toBe(false);
    }));

  it('fuera del descarte, un abono cancelado sigue sin poder borrarse', () =>
    inTransaction(async (tx) => {
      const owner = await createUser(tx);
      const customer = await newCustomer(tx, owner);
      const canceled = await scheduledPayment(tx, owner, customer, 'canceled');
      await expect(
        tx.query('update public.payment set deleted_at = now() where id = $1', [canceled]),
      ).rejects.toThrow(/INVALID_TRANSITION/);
    }));

  it('seguridad: otro usuario → NOT_FOUND sin tocar nada; inactivo → FORBIDDEN; anónimo sin permiso', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const other = await createUser(tx);
      const inactive = await createUser(tx, { isActive: false });
      const before = await snapshot(tx, owner);
      expect(await discard(tx, other, customer)).toMatchObject({ ok: false, code: 'NOT_FOUND' });
      expect(await summary(tx, other, customer)).toMatchObject({ ok: false, code: 'NOT_FOUND' });
      expect(await discard(tx, inactive, customer)).toMatchObject({ ok: false, code: 'FORBIDDEN' });
      expect(await discard(tx, null, customer)).toMatchObject({ ok: false, pgCode: '42501' });
      expect(await summary(tx, null, customer)).toMatchObject({ ok: false, pgCode: '42501' });
      expect(await snapshot(tx, owner)).toEqual(before);
    }));
});
