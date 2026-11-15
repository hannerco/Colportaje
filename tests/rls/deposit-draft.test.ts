// HU-DIN-04 · save_deposit_draft y delete_deposit_draft: vínculos en una transacción, idempotencia, montos tal
// cual, recibos pendientes, borrado físico, errores y A/B.
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

beforeAll(assertDatabaseReachable);
afterAll(() => pool.end());

type Outcome = { ok: true; rows: Record<string, unknown>[] } | { ok: false; code: string; detail?: string };

const call = (tx: Tx, user: string | null, sql: string, params: unknown[]) => {
  const run = async (): Promise<Outcome> => {
    await tx.query('savepoint fn');
    try {
      const { rows } = await tx.query(sql, params);
      await tx.query('release savepoint fn');
      return { ok: true, rows };
    } catch (error) {
      await tx.query('rollback to savepoint fn');
      const e = error as { message: string; detail?: string };
      return { ok: false, code: e.message.split(':')[0]!, ...(e.detail ? { detail: e.detail } : {}) };
    }
  };
  return user === null ? asAnon(tx, run) : asUser(tx, user, run);
};

const save = (tx: Tx, user: string | null, deposit: Record<string, unknown>) =>
  call(tx, user, 'select public.save_deposit_draft($1::jsonb) as id', [JSON.stringify(deposit)]);
const remove = (tx: Tx, user: string | null, id: string) =>
  call(tx, user, 'select public.delete_deposit_draft($1) as paths', [id]);

const newCustomer = async (tx: Tx, owner: string) => {
  const id = randomUUID();
  await tx.query(`insert into public.customer (id, owner_id, name) values ($1, $2, 'Ana')`, [id, owner]);
  return id;
};

const collected = async (tx: Tx, owner: string, customer: string, amount: number, method = 'cash') => {
  const id = randomUUID();
  await tx.query(
    `insert into public.payment (id, owner_id, customer_id, kind, status, paid_at, paid_amount, method)
     values ($1, $2, $3, 'extra', 'collected', public.today_bogota(), $4, $5)`,
    [id, owner, customer, amount, method],
  );
  return id;
};

const draft = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  title: null,
  depositDate: '2026-11-05',
  paymentIds: [],
  cash: 0,
  transfer: 0,
  note: null,
  stagedReceipts: [],
  ...over,
});

const links = async (tx: Tx, owner: string) =>
  (
    await tx.query<{ id: string; leader_deposit_id: string | null; status: string }>(
      'select id, leader_deposit_id, status from public.payment where owner_id = $1 order by id',
      [owner],
    )
  ).rows;

const setup = async (tx: Tx) => {
  const owner = await createUser(tx);
  const customer = await newCustomer(tx, owner);
  const payments = [
    await collected(tx, owner, customer, 40_000),
    await collected(tx, owner, customer, 60_000, 'transfer'),
    await collected(tx, owner, customer, 85_000),
  ];
  return { owner, customer, payments };
};

describe('save_deposit_draft (HU-DIN-04)', () => {
  it('CA-3 / R2 / R3 / R4: crea el borrador, vincula los marcados (siguen cobrados) y guarda lo escrito', () =>
    inTransaction(async (tx) => {
      const { owner, payments } = await setup(tx);
      const id = randomUUID();
      const saved = await save(
        tx,
        owner,
        draft(id, {
          title: '  Entrega de noviembre ',
          paymentIds: [payments[0], payments[1], payments[0]],
          cash: 39_000,
          transfer: 60_000,
          note: ' Me faltaron $1.000 ',
        }),
      );
      expect(saved).toEqual({ ok: true, rows: [{ id }] });
      const { rows } = await tx.query('select * from public.leader_deposit where id = $1', [id]);
      expect(rows[0]).toMatchObject({
        owner_id: owner,
        status: 'draft',
        deposit_number: null,
        title: 'Entrega de noviembre',
        cash_amount: 39_000,
        transfer_amount: 60_000,
        note: 'Me faltaron $1.000',
      });
      expect((await links(tx, owner)).filter((p) => p.leader_deposit_id === id).map((p) => p.status)).toEqual(
        ['collected', 'collected'],
      );
    }));

  it('idempotente; al guardar de nuevo desvincula los desmarcados y vincula los nuevos; título vacío = automático', () =>
    inTransaction(async (tx) => {
      const { owner, payments } = await setup(tx);
      const id = randomUUID();
      await save(tx, owner, draft(id, { title: 'X', paymentIds: [payments[0], payments[1]] }));
      expect(
        (await save(tx, owner, draft(id, { title: 'X', paymentIds: [payments[0], payments[1]] }))).ok,
      ).toBe(true);
      await save(
        tx,
        owner,
        draft(id, { title: '   ', paymentIds: [payments[1], payments[2]], depositDate: '2026-11-07' }),
      );
      const linked = (await links(tx, owner)).filter((p) => p.leader_deposit_id === id).map((p) => p.id);
      expect(linked.sort()).toEqual([payments[1], payments[2]].sort());
      const { rows } = await tx.query(
        'select title, deposit_date::text as d from public.leader_deposit where id = $1',
        [id],
      );
      expect(rows[0]).toEqual({ title: null, d: '2026-11-07' });
      expect(
        (await tx.query('select count(*)::int as n from public.leader_deposit where owner_id = $1', [owner]))
          .rows[0]!.n,
      ).toBe(1);
    }));

  it('borrador sin abonos (donación, BR-DEP-07)', () =>
    inTransaction(async (tx) => {
      const { owner } = await setup(tx);
      expect((await save(tx, owner, draft(randomUUID(), { cash: 20_000 }))).ok).toBe(true);
    }));

  it('CA-6: un abono en otro Abibono, entregado, por cobrar, borrado o ajeno → PAYMENT_NOT_AVAILABLE y nada cambia', () =>
    inTransaction(async (tx) => {
      const { owner, customer, payments } = await setup(tx);
      const [mine, other] = [randomUUID(), randomUUID()];
      await save(tx, owner, draft(mine, { title: 'Antes', paymentIds: [payments[0]] }));
      await save(tx, owner, draft(other, { paymentIds: [payments[1]] }));
      const deleted = await collected(tx, owner, customer, 5_000);
      await tx.query('update public.payment set deleted_at = now() where id = $1', [deleted]);
      const scheduled = randomUUID();
      await tx.query(
        `insert into public.payment (id, owner_id, customer_id, kind, status, agreed_amount, due_date, original_due_date)
         values ($1, $2, $3, 'scheduled', 'scheduled', 50000, public.today_bogota() + 3, public.today_bogota() + 3)`,
        [scheduled, owner, customer],
      );
      const stranger = await createUser(tx);
      const foreign = await collected(tx, stranger, await newCustomer(tx, stranger), 1_000);
      const before = await links(tx, owner);

      const result = await save(
        tx,
        owner,
        draft(mine, {
          title: 'Después',
          paymentIds: [payments[0], payments[1], deleted, scheduled, foreign],
        }),
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.code).toBe('PAYMENT_NOT_AVAILABLE');
      expect(JSON.parse(result.detail!)).toEqual([payments[1], deleted, scheduled, foreign].sort());
      expect(await links(tx, owner)).toEqual(before);
      const { rows } = await tx.query('select title from public.leader_deposit where id = $1', [mine]);
      expect(rows[0]!.title).toBe('Antes');
    }));

  it('R7: los recibos pendientes se crean al guardar, una sola vez; una ruta ajena se rechaza', () =>
    inTransaction(async (tx) => {
      const { owner } = await setup(tx);
      const [id, photo] = [randomUUID(), randomUUID()];
      const receipt = {
        photoId: photo,
        path: `${owner}/deposit_receipt/${photo}.webp`,
        thumbPath: `${owner}/deposit_receipt/${photo}.thumb.webp`,
        bytes: 1234,
      };
      await save(tx, owner, draft(id, { stagedReceipts: [receipt] }));
      await save(tx, owner, draft(id, { stagedReceipts: [receipt] }));
      const { rows } = await tx.query(
        'select kind, leader_deposit_id, bytes from public.photo where owner_id = $1',
        [owner],
      );
      expect(rows).toEqual([{ kind: 'deposit_receipt', leader_deposit_id: id, bytes: 1234 }]);

      const stranger = randomUUID();
      const bad = await save(
        tx,
        owner,
        draft(id, {
          stagedReceipts: [{ ...receipt, photoId: randomUUID(), path: `${stranger}/deposit_receipt/x.webp` }],
        }),
      );
      expect(bad).toEqual({ ok: false, code: 'VALIDATION', detail: 'stagedReceipts' });

      // Un photoId que ya es recibo de otro Abibono no se "mueve" ni se acepta en silencio.
      const other = randomUUID();
      expect(await save(tx, owner, draft(other, { stagedReceipts: [receipt] }))).toEqual({
        ok: false,
        code: 'VALIDATION',
        detail: 'stagedReceipts',
      });
      expect((await tx.query('select 1 from public.leader_deposit where id = $1', [other])).rowCount).toBe(0);
    }));

  it.each([
    [{ id: 'no-es-uuid' }, 'depositId'],
    [{ depositDate: '2026-02-30' }, 'depositDate'],
    [{ cash: -1 }, 'cash'],
    [{ cash: 1.5 }, 'cash'],
    [{ cash: '100' }, 'cash'],
    [{ transfer: 2_147_483_648 }, 'transfer'],
    [{ transfer: null }, 'transfer'],
    [{ title: 5 }, 'title'],
    [{ note: [] }, 'note'],
    [{ paymentIds: 'x' }, 'paymentIds'],
    [{ paymentIds: ['no-es-uuid'] }, 'paymentIds'],
    [{ stagedReceipts: {} }, 'stagedReceipts'],
    [{ stagedReceipts: [{ photoId: 'x' }] }, 'stagedReceipts'],
  ])('%o → VALIDATION en %s y no crea nada', (over, field) =>
    inTransaction(async (tx) => {
      const { owner } = await setup(tx);
      expect(await save(tx, owner, draft(randomUUID(), over))).toEqual({
        ok: false,
        code: 'VALIDATION',
        detail: field,
      });
      expect(
        (await tx.query('select count(*)::int as n from public.leader_deposit where owner_id = $1', [owner]))
          .rows[0]!.n,
      ).toBe(0);
    }),
  );

  it('datos que no son un objeto → VALIDATION', () =>
    inTransaction(async (tx) => {
      const { owner } = await setup(tx);
      expect(await call(tx, owner, `select public.save_deposit_draft('[]'::jsonb)`, [])).toEqual({
        ok: false,
        code: 'VALIDATION',
        detail: 'deposit',
      });
    }));

  it('un Abibono confirmado → DEPOSIT_NOT_DRAFT', () =>
    inTransaction(async (tx) => {
      const { owner } = await setup(tx);
      const id = randomUUID();
      await save(tx, owner, draft(id, { cash: 1_000 }));
      await tx.query(
        `update public.leader_deposit set status = 'confirmed', confirmed_at = now() where id = $1`,
        [id],
      );
      expect(await save(tx, owner, draft(id, { cash: 2_000 }))).toEqual({
        ok: false,
        code: 'DEPOSIT_NOT_DRAFT',
      });
    }));

  it('A/B: B no puede guardar con el id de un Abibono de A (CONFLICT); anónimo e inactivo no pueden', () =>
    inTransaction(async (tx) => {
      const { owner } = await setup(tx);
      const id = randomUUID();
      await save(tx, owner, draft(id, { title: 'De A' }));
      const b = await createUser(tx);
      expect(await save(tx, b, draft(id, { title: 'De B' }))).toEqual({ ok: false, code: 'CONFLICT' });
      expect((await save(tx, null, draft(randomUUID()))).ok).toBe(false);
      const inactive = await createUser(tx, { isActive: false });
      expect(await save(tx, inactive, draft(randomUUID()))).toMatchObject({ ok: false, code: 'FORBIDDEN' });
      const { rows } = await tx.query('select title from public.leader_deposit where id = $1', [id]);
      expect(rows[0]!.title).toBe('De A');
    }));
});

describe('delete_deposit_draft (HU-DIN-04)', () => {
  it('CA-5 / R5: borra físicamente el borrador y sus recibos (también los borrados) y libera los abonos', () =>
    inTransaction(async (tx) => {
      const { owner, payments } = await setup(tx);
      const [id, p1, p2] = [randomUUID(), randomUUID(), randomUUID()];
      const receipt = (photo: string) => ({
        photoId: photo,
        path: `${owner}/deposit_receipt/${photo}.webp`,
        thumbPath: `${owner}/deposit_receipt/${photo}.thumb.webp`,
        bytes: 10,
      });
      await save(tx, owner, draft(id, { paymentIds: payments, stagedReceipts: [receipt(p1), receipt(p2)] }));
      await tx.query('update public.photo set deleted_at = now() where id = $1', [p2]);

      const result = await remove(tx, owner, id);
      expect(result.ok && (result.rows[0]!.paths as string[]).length).toBe(4);
      expect(result.ok && result.rows[0]!.paths).toEqual(
        [receipt(p1).path, receipt(p1).thumbPath, receipt(p2).path, receipt(p2).thumbPath].sort(),
      );
      expect((await tx.query('select 1 from public.leader_deposit where id = $1', [id])).rowCount).toBe(0);
      expect((await tx.query('select 1 from public.photo where owner_id = $1', [owner])).rowCount).toBe(0);
      expect(
        (await links(tx, owner)).every((p) => p.leader_deposit_id === null && p.status === 'collected'),
      ).toBe(true);
      // Reintento: ya no existe → lista vacía, sin error.
      expect(await remove(tx, owner, id)).toEqual({ ok: true, rows: [{ paths: [] }] });
    }));

  it('confirmado o reabierto (con número) → DEPOSIT_NOT_DRAFT y no cambia nada', () =>
    inTransaction(async (tx) => {
      const { owner } = await setup(tx);
      const id = randomUUID();
      await save(tx, owner, draft(id, { cash: 1_000 }));
      await tx.query(
        `update public.leader_deposit set status = 'confirmed', confirmed_at = now() where id = $1`,
        [id],
      );
      expect(await remove(tx, owner, id)).toEqual({ ok: false, code: 'DEPOSIT_NOT_DRAFT' });
      await tx.query(`select set_config('colportor.deposit_event', '{"reason":"Corregir"}', true)`);
      await tx.query(`update public.leader_deposit set status = 'draft', confirmed_at = null where id = $1`, [
        id,
      ]);
      expect(await remove(tx, owner, id)).toEqual({ ok: false, code: 'DEPOSIT_NOT_DRAFT' });
      expect((await tx.query('select 1 from public.leader_deposit where id = $1', [id])).rowCount).toBe(1);
    }));

  it('A/B: B no borra el borrador de A (para B no existe); anónimo no puede', () =>
    inTransaction(async (tx) => {
      const { owner, payments } = await setup(tx);
      const id = randomUUID();
      await save(tx, owner, draft(id, { paymentIds: [payments[0]] }));
      const b = await createUser(tx);
      expect(await remove(tx, b, id)).toEqual({ ok: true, rows: [{ paths: [] }] });
      expect((await remove(tx, null, id)).ok).toBe(false);
      expect((await tx.query('select 1 from public.leader_deposit where id = $1', [id])).rowCount).toBe(1);
      expect((await links(tx, owner)).find((p) => p.id === payments[0])!.leader_deposit_id).toBe(id);
    }));
});
