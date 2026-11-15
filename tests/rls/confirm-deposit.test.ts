// HU-DIN-05 · confirm_leader_deposit y update_deposit_note: bloqueos con prioridad, todo o nada, número
// consecutivo, reabierto conserva su número, nota en confirmado, errores y A/B.
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

const confirm = (tx: Tx, user: string | null, deposit: Record<string, unknown>) =>
  call(tx, user, 'select public.confirm_leader_deposit($1::jsonb) as id', [JSON.stringify(deposit)]);
const save = (tx: Tx, user: string, deposit: Record<string, unknown>) =>
  call(tx, user, 'select public.save_deposit_draft($1::jsonb) as id', [JSON.stringify(deposit)]);
const note = (tx: Tx, user: string | null, id: string, text: string | null) =>
  call(tx, user, 'select public.update_deposit_note($1, $2)', [id, text]);

const receipt = (owner: string) => {
  const photoId = randomUUID();
  return {
    photoId,
    path: `${owner}/deposit_receipt/${photoId}.webp`,
    thumbPath: `${owner}/deposit_receipt/${photoId}.thumb.webp`,
    bytes: 10,
  };
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

/** Usuario con abonos cobrados de 60.000 (efectivo) y 40.000 (transferencia): esperado 100.000. */
const setup = async (tx: Tx) => {
  const owner = await createUser(tx);
  const customer = randomUUID();
  await tx.query(`insert into public.customer (id, owner_id, name) values ($1, $2, 'Ana')`, [
    customer,
    owner,
  ]);
  const payments: string[] = [];
  for (const [amount, method] of [
    [60_000, 'cash'],
    [40_000, 'transfer'],
  ] as const) {
    const id = randomUUID();
    await tx.query(
      `insert into public.payment (id, owner_id, customer_id, kind, status, paid_at, paid_amount, method)
       values ($1, $2, $3, 'extra', 'collected', public.today_bogota(), $4, $5)`,
      [id, owner, customer, amount, method],
    );
    payments.push(id);
  }
  return { owner, payments };
};

/** Todo lo que confirmar podría tocar, para comprobar el "todo o nada". */
const snapshot = async (tx: Tx, owner: string) =>
  (
    await tx.query(
      `select
         (select json_agg(d order by d.id) from public.leader_deposit d where d.owner_id = $1) as deposits,
         (select json_agg(p order by p.id) from public.payment p where p.owner_id = $1) as payments,
         (select count(*) from public.photo ph where ph.owner_id = $1) as photos,
         (select count(*) from public.leader_deposit_event e where e.owner_id = $1) as events,
         (select last_number from public.leader_deposit_counter c where c.owner_id = $1) as counter`,
      [owner],
    )
  ).rows[0];

describe('confirm_leader_deposit (HU-DIN-05)', () => {
  it('R1 / R6 / CA-7: desde la propuesta crea, confirma con número 1, entrega los abonos y deja el evento', () =>
    inTransaction(async (tx) => {
      const { owner, payments } = await setup(tx);
      const id = randomUUID();
      const r = receipt(owner);
      const result = await confirm(
        tx,
        owner,
        draft(id, { paymentIds: payments, cash: 95_000, note: 'Me faltaron $5.000', stagedReceipts: [r] }),
      );
      expect(result).toEqual({ ok: true, rows: [{ id }] });
      const { rows } = await tx.query(
        'select status, deposit_number, confirmed_at is not null as at, cash_amount from public.leader_deposit where owner_id = $1',
        [owner],
      );
      expect(rows).toEqual([{ status: 'confirmed', deposit_number: 1, at: true, cash_amount: 95_000 }]);
      const statuses = await tx.query('select status from public.payment where leader_deposit_id = $1', [id]);
      expect(statuses.rows.map((p) => p.status)).toEqual(['delivered', 'delivered']);
      const events = await tx.query(
        'select type from public.leader_deposit_event where leader_deposit_id = $1',
        [id],
      );
      expect(events.rows).toEqual([{ type: 'confirmed' }]);
      expect((await tx.query('select 1 from public.photo where id = $1', [r.photoId])).rowCount).toBe(1);
    }));

  it('R2 / CA-1 / CA-2 / CA-5: prioridad TOTAL_ZERO > NOTE_REQUIRED > NO_RECEIPT, con todos en el detalle; nada cambia', () =>
    inTransaction(async (tx) => {
      const { owner, payments } = await setup(tx);
      const before = await snapshot(tx, owner);
      const id = randomUUID();
      expect(await confirm(tx, owner, draft(id, { paymentIds: payments }))).toEqual({
        ok: false,
        code: 'TOTAL_ZERO',
        detail: '["TOTAL_ZERO", "NOTE_REQUIRED", "NO_RECEIPT"]',
      });
      expect(await confirm(tx, owner, draft(id, { paymentIds: payments, cash: 95_000 }))).toEqual({
        ok: false,
        code: 'NOTE_REQUIRED',
        detail: '["NOTE_REQUIRED", "NO_RECEIPT"]',
      });
      expect(
        await confirm(
          tx,
          owner,
          draft(id, { paymentIds: payments, cash: 95_000, note: 'Me faltaron $5.000' }),
        ),
      ).toEqual({ ok: false, code: 'NO_RECEIPT', detail: '["NO_RECEIPT"]' });
      // Sin diferencia no hace falta nota; un recibo pendiente sí cuenta, pero el total en 0 no.
      expect(
        await confirm(
          tx,
          owner,
          draft(id, { cash: 0, transfer: 0, note: 'x', stagedReceipts: [receipt(owner)] }),
        ),
      ).toEqual({ ok: false, code: 'TOTAL_ZERO', detail: '["TOTAL_ZERO"]' });
      expect(await snapshot(tx, owner)).toEqual(before);
    }));

  it('R4: un recibo borrado no cuenta', () =>
    inTransaction(async (tx) => {
      const { owner, payments } = await setup(tx);
      const id = randomUUID();
      const r = receipt(owner);
      await save(
        tx,
        owner,
        draft(id, { paymentIds: payments, cash: 60_000, transfer: 40_000, stagedReceipts: [r] }),
      );
      await tx.query('update public.photo set deleted_at = now() where id = $1', [r.photoId]);
      expect(
        await confirm(tx, owner, draft(id, { paymentIds: payments, cash: 60_000, transfer: 40_000 })),
      ).toMatchObject({ ok: false, code: 'NO_RECEIPT' });
    }));

  it('CA-4: una donación sin abonos, con nota y recibo, se confirma (esperado 0)', () =>
    inTransaction(async (tx) => {
      const { owner } = await setup(tx);
      const id = randomUUID();
      expect(
        (
          await confirm(
            tx,
            owner,
            draft(id, { cash: 20_000, note: 'Donación', stagedReceipts: [receipt(owner)] }),
          )
        ).ok,
      ).toBe(true);
      const diff = await tx.query('select public.deposit_difference($1) as d', [id]);
      expect(Number(diff.rows[0]!.d)).toBe(20_000);
    }));

  it('confirmar dos veces → DEPOSIT_NOT_DRAFT sin efectos; un abono ya entregado no está disponible', () =>
    inTransaction(async (tx) => {
      const { owner, payments } = await setup(tx);
      const id = randomUUID();
      const full = { paymentIds: payments, cash: 60_000, transfer: 40_000, stagedReceipts: [receipt(owner)] };
      await confirm(tx, owner, draft(id, full));
      const before = await snapshot(tx, owner);
      expect(await confirm(tx, owner, draft(id, full))).toEqual({ ok: false, code: 'DEPOSIT_NOT_DRAFT' });
      const other = await confirm(
        tx,
        owner,
        draft(randomUUID(), { ...full, stagedReceipts: [receipt(owner)] }),
      );
      expect(other).toMatchObject({ ok: false, code: 'PAYMENT_NOT_AVAILABLE' });
      expect(await snapshot(tx, owner)).toEqual(before);
    }));

  it('R6 / CA-10: los números siguen sin huecos aunque una confirmación falle; un reabierto conserva el suyo', () =>
    inTransaction(async (tx) => {
      const { owner } = await setup(tx);
      const ok = (cash: number) => ({ cash, note: 'x', stagedReceipts: [receipt(owner)] });
      const [a, b, c] = [randomUUID(), randomUUID(), randomUUID()];
      await confirm(tx, owner, draft(a, ok(1_000)));
      expect((await confirm(tx, owner, draft(b, { cash: 1_000, note: 'x' }))).ok).toBe(false);
      await confirm(tx, owner, draft(b, ok(2_000)));
      // Reabrir (como lo hará HU-DIN-07) y volver a confirmar: conserva el 1; el siguiente nuevo es el 3.
      await tx.query(`select set_config('colportor.deposit_event', '{"reason":"Corregir"}', true)`);
      await tx.query(`update public.leader_deposit set status = 'draft', confirmed_at = null where id = $1`, [
        a,
      ]);
      await confirm(tx, owner, draft(a, ok(1_500)));
      await confirm(tx, owner, draft(c, ok(3_000)));
      const { rows } = await tx.query(
        'select id, deposit_number from public.leader_deposit where owner_id = $1 order by deposit_number',
        [owner],
      );
      expect(rows).toEqual([
        { id: a, deposit_number: 1 },
        { id: b, deposit_number: 2 },
        { id: c, deposit_number: 3 },
      ]);
    }));

  it('CA-9: un título propio se conserva y recibe su número', () =>
    inTransaction(async (tx) => {
      const { owner } = await setup(tx);
      const id = randomUUID();
      await confirm(
        tx,
        owner,
        draft(id, { title: 'Entrega de Navidad', cash: 1_000, note: 'x', stagedReceipts: [receipt(owner)] }),
      );
      const { rows } = await tx.query(
        'select title, deposit_number from public.leader_deposit where id = $1',
        [id],
      );
      expect(rows[0]).toEqual({ title: 'Entrega de Navidad', deposit_number: 1 });
    }));

  it('A/B: B no confirma con el id de A (CONFLICT) ni con sus abonos; anónimo e inactivo no pueden', () =>
    inTransaction(async (tx) => {
      const { owner, payments } = await setup(tx);
      const id = randomUUID();
      await save(tx, owner, draft(id, { cash: 1_000 }));
      const b = await createUser(tx);
      const full = (over: Record<string, unknown>) =>
        draft(randomUUID(), { cash: 100_000, note: 'x', stagedReceipts: [receipt(b)], ...over });
      expect(await confirm(tx, b, { ...full({}), id })).toEqual({ ok: false, code: 'CONFLICT' });
      expect(await confirm(tx, b, full({ paymentIds: payments }))).toMatchObject({
        ok: false,
        code: 'PAYMENT_NOT_AVAILABLE',
      });
      expect((await confirm(tx, null, full({}))).ok).toBe(false);
      const inactive = await createUser(tx, { isActive: false });
      expect(await confirm(tx, inactive, full({}))).toMatchObject({ ok: false, code: 'FORBIDDEN' });
      const { rows } = await tx.query('select status from public.leader_deposit where id = $1', [id]);
      expect(rows[0]!.status).toBe('draft');
    }));
});

describe('update_deposit_note (HU-DIN-05)', () => {
  it('CA-6 / I-27: en un confirmado con diferencia la nota cambia pero no queda vacía; sin diferencia, sí', () =>
    inTransaction(async (tx) => {
      const { owner, payments } = await setup(tx);
      const [withDiff, exact] = [randomUUID(), randomUUID()];
      await confirm(
        tx,
        owner,
        draft(withDiff, {
          paymentIds: [payments[0]],
          cash: 55_000,
          note: 'Faltan',
          stagedReceipts: [receipt(owner)],
        }),
      );
      await confirm(
        tx,
        owner,
        draft(exact, {
          paymentIds: [payments[1]],
          transfer: 40_000,
          note: 'Ok',
          stagedReceipts: [receipt(owner)],
        }),
      );
      expect((await note(tx, owner, withDiff, '  Me faltaron $5.000 ')).ok).toBe(true);
      expect(await note(tx, owner, withDiff, '   ')).toEqual({ ok: false, code: 'NOTE_REQUIRED' });
      expect((await note(tx, owner, exact, null)).ok).toBe(true);
      const { rows } = await tx.query(
        'select id, note from public.leader_deposit where owner_id = $1 order by deposit_number',
        [owner],
      );
      expect(rows).toEqual([
        { id: withDiff, note: 'Me faltaron $5.000' },
        { id: exact, note: null },
      ]);
    }));

  it('en un borrador la nota puede quedar vacía; inexistente o ajeno → NOT_FOUND; anónimo no puede', () =>
    inTransaction(async (tx) => {
      const { owner } = await setup(tx);
      const id = randomUUID();
      await save(tx, owner, draft(id, { cash: 5_000, note: 'algo' }));
      expect((await note(tx, owner, id, '')).ok).toBe(true);
      expect(await note(tx, owner, randomUUID(), 'x')).toEqual({ ok: false, code: 'NOT_FOUND' });
      const b = await createUser(tx);
      expect(await note(tx, b, id, 'de B')).toEqual({ ok: false, code: 'NOT_FOUND' });
      expect((await note(tx, null, id, 'x')).ok).toBe(false);
      const { rows } = await tx.query('select note from public.leader_deposit where id = $1', [id]);
      expect(rows[0]!.note).toBeNull();
    }));
});
