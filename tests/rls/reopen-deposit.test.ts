// HU-DIN-07 · reopen_leader_deposit: a borrador con su número, abonos a cobrados (siguen vinculados), eventos con
// el motivo, errores sin efectos y A/B.
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

type Outcome = { ok: true } | { ok: false; code: string };

const call = (tx: Tx, user: string | null, sql: string, params: unknown[]) => {
  const run = async (): Promise<Outcome> => {
    await tx.query('savepoint fn');
    try {
      await tx.query(sql, params);
      await tx.query('release savepoint fn');
      return { ok: true };
    } catch (error) {
      await tx.query('rollback to savepoint fn');
      return { ok: false, code: (error as Error).message.split(':')[0]! };
    }
  };
  return user === null ? asAnon(tx, run) : asUser(tx, user, run);
};

const reopen = (tx: Tx, user: string | null, id: string, reason: string | null) =>
  call(tx, user, 'select public.reopen_leader_deposit($1, $2)', [id, reason]);
const confirm = (tx: Tx, user: string, deposit: Record<string, unknown>) =>
  call(tx, user, 'select public.confirm_leader_deposit($1::jsonb)', [JSON.stringify(deposit)]);

const receipt = (owner: string) => {
  const photoId = randomUUID();
  return { photoId, path: `${owner}/deposit_receipt/${photoId}.webp`, thumbPath: null, bytes: 10 };
};

/** Un Abibono confirmado con dos abonos (60.000 + 40.000 en efectivo). */
const setup = async (tx: Tx) => {
  const owner = await createUser(tx);
  const customer = randomUUID();
  await tx.query(`insert into public.customer (id, owner_id, name) values ($1, $2, 'Ana')`, [
    customer,
    owner,
  ]);
  const payments: string[] = [];
  for (const amount of [60_000, 40_000]) {
    const id = randomUUID();
    await tx.query(
      `insert into public.payment (id, owner_id, customer_id, kind, status, paid_at, paid_amount, method)
       values ($1, $2, $3, 'extra', 'collected', public.today_bogota(), $4, 'cash')`,
      [id, owner, customer, amount],
    );
    payments.push(id);
  }
  const deposit = randomUUID();
  const full = {
    id: deposit,
    title: null,
    depositDate: '2026-10-25',
    paymentIds: payments,
    cash: 100_000,
    transfer: 0,
    note: null,
    stagedReceipts: [receipt(owner)],
  };
  expect(await confirm(tx, owner, full)).toEqual({ ok: true });
  return { owner, payments, deposit, full };
};

const state = async (tx: Tx, owner: string) =>
  (
    await tx.query(
      `select
         (select json_agg(json_build_object('status', d.status, 'number', d.deposit_number,
                                            'confirmed', d.confirmed_at is not null) order by d.id)
            from public.leader_deposit d where d.owner_id = $1) as deposits,
         (select json_agg(json_build_object('status', p.status, 'deposit', p.leader_deposit_id) order by p.id)
            from public.payment p where p.owner_id = $1) as payments,
         (select json_agg(json_build_object('type', e.type, 'reason', e.reason) order by e.seq)
            from public.leader_deposit_event e where e.owner_id = $1) as events,
         (select json_agg(json_build_object('type', e.type, 'data', e.data) order by e.payment_id)
            from public.payment_event e where e.owner_id = $1) as payment_events,
         (select count(*)::int from public.photo ph where ph.owner_id = $1 and ph.deleted_at is null) as photos`,
      [owner],
    )
  ).rows[0];

describe('reopen_leader_deposit (HU-DIN-07)', () => {
  it('R2 / R4 / R5 / CA-1: borrador con su número, abonos cobrados y vinculados, eventos con el motivo, fotos intactas', () =>
    inTransaction(async (tx) => {
      const { owner, payments, deposit } = await setup(tx);
      const reason = '  Incluí por error el abono de Óscar Iván Mejía ';
      expect(await reopen(tx, owner, deposit, reason)).toEqual({ ok: true });
      const s = await state(tx, owner);
      expect(s.deposits).toEqual([{ status: 'draft', number: 1, confirmed: false }]);
      expect(s.payments).toEqual([...payments].sort().map(() => ({ status: 'collected', deposit })));
      expect(s.events).toEqual([
        { type: 'confirmed', reason: null },
        { type: 'reopened', reason: 'Incluí por error el abono de Óscar Iván Mejía' },
      ]);
      expect(s.payment_events).toEqual(
        payments.map(() => ({
          type: 'reopened',
          data: { reason: 'Incluí por error el abono de Óscar Iván Mejía', depositId: deposit },
        })),
      );
      expect(s.photos).toBe(1);
      // El contexto no queda puesto para otros cambios de la misma transacción.
      const ctx = await tx.query(`select current_setting('colportor.deposit_event', true) as d,
                                         current_setting('colportor.payment_event', true) as p`);
      expect(ctx.rows[0]).toEqual({ d: '', p: '' });
    }));

  it('CA-2 / CA-5 / CA-6: se corrige, se confirma de nuevo conservando el número; historial en orden', () =>
    inTransaction(async (tx) => {
      const { owner, payments, deposit, full } = await setup(tx);
      // Mientras tanto se confirma otro: toma el 2.
      const other = randomUUID();
      expect(
        await confirm(tx, owner, {
          ...full,
          id: other,
          paymentIds: [],
          cash: 5_000,
          note: 'x',
          stagedReceipts: [receipt(owner)],
        }),
      ).toEqual({ ok: true });
      await reopen(tx, owner, deposit, 'Incluí por error el abono de Óscar');
      // Se desmarca el de 40.000 y se confirma con nota por la diferencia (la foto anterior sigue contando).
      expect(
        await confirm(tx, owner, {
          ...full,
          paymentIds: [payments[0]],
          note: 'Sobran $40.000',
          stagedReceipts: [],
        }),
      ).toEqual({ ok: true });
      const { rows } = await tx.query(
        'select id, deposit_number, status from public.leader_deposit where owner_id = $1 order by deposit_number',
        [owner],
      );
      expect(rows).toEqual([
        { id: deposit, deposit_number: 1, status: 'confirmed' },
        { id: other, deposit_number: 2, status: 'confirmed' },
      ]);
      const freed = await tx.query('select status, leader_deposit_id from public.payment where id = $1', [
        payments[1],
      ]);
      expect(freed.rows[0]).toEqual({ status: 'collected', leader_deposit_id: null });
      const events = await tx.query(
        'select type, reason from public.leader_deposit_event where leader_deposit_id = $1 order by seq',
        [deposit],
      );
      expect(events.rows).toEqual([
        { type: 'confirmed', reason: null },
        { type: 'reopened', reason: 'Incluí por error el abono de Óscar' },
        { type: 'confirmed', reason: null },
      ]);
    }));

  it('CA-3 / CA-4 / R1 / R3: motivo vacío, borrador, reabrir dos veces, inexistente → error y nada cambia', () =>
    inTransaction(async (tx) => {
      const { owner, deposit } = await setup(tx);
      const before = await state(tx, owner);
      for (const reason of [null, '', '   '])
        expect(await reopen(tx, owner, deposit, reason)).toEqual({ ok: false, code: 'REASON_REQUIRED' });
      expect(await reopen(tx, owner, randomUUID(), 'x')).toEqual({ ok: false, code: 'NOT_FOUND' });
      expect(await state(tx, owner)).toEqual(before);

      await reopen(tx, owner, deposit, 'Primera vez');
      const reopened = await state(tx, owner);
      expect(await reopen(tx, owner, deposit, 'Segunda vez')).toEqual({
        ok: false,
        code: 'DEPOSIT_NOT_CONFIRMED',
      });
      expect(await state(tx, owner)).toEqual(reopened);
    }));

  it('A/B: B no reabre el Abibono de A (para B no existe); anónimo e inactivo no pueden', () =>
    inTransaction(async (tx) => {
      const { owner, deposit } = await setup(tx);
      const before = await state(tx, owner);
      const b = await createUser(tx);
      expect(await reopen(tx, b, deposit, 'de B')).toEqual({ ok: false, code: 'NOT_FOUND' });
      expect((await reopen(tx, null, deposit, 'anónimo')).ok).toBe(false);
      const inactive = await createUser(tx, { isActive: false });
      expect(await reopen(tx, inactive, deposit, 'inactivo')).toEqual({ ok: false, code: 'FORBIDDEN' });
      expect(await state(tx, owner)).toEqual(before);
    }));
});
