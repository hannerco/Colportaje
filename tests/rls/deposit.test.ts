// HU-DIN-01 · Abibono: número, bloqueos, vínculos, recibos, historial y RLS.
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

const RAISED = 'P0001';
const CHECK_VIOLATION = '23514';
const FK_VIOLATION = '23503';
const INSUFFICIENT_PRIVILEGE = '42501';

beforeAll(assertDatabaseReachable);
afterAll(() => pool.end());

const setup = async (tx: Tx) => {
  const owner = await createUser(tx);
  const customer = randomUUID();
  await tx.query(`insert into public.customer (id, owner_id, name) values ($1, $2, 'Clienta')`, [
    customer,
    owner,
  ]);
  return { owner, customer };
};

const collected = async (tx: Tx, owner: string, customer: string, amount = 40_000, method = 'cash') => {
  const id = randomUUID();
  await tx.query(
    `insert into public.payment (id, owner_id, customer_id, kind, status, paid_amount, paid_at, method)
     values ($1, $2, $3, 'extra', 'collected', $4, public.today_bogota(), $5)`,
    [id, owner, customer, amount, method],
  );
  return id;
};

const draft = async (tx: Tx, owner: string, overrides: Record<string, unknown> = {}) => {
  const values: Record<string, unknown> = {
    id: randomUUID(),
    owner_id: owner,
    cash_amount: 40_000,
    ...overrides,
  };
  const keys = Object.keys(values);
  await tx.query(
    `insert into public.leader_deposit (${keys.join(', ')}) values (${keys.map((_, i) => `$${i + 1}`).join(', ')})`,
    Object.values(values),
  );
  return values.id as string;
};

const link = (tx: Tx, payment: string, deposit: string | null) =>
  tx.query('update public.payment set leader_deposit_id = $2 where id = $1', [payment, deposit]);

/** Lo que hará la función de confirmar (HU-DIN-05): Abibono confirmado y sus abonos entregados. */
const confirm = async (tx: Tx, deposit: string) => {
  await tx.query(
    `update public.leader_deposit set status = 'confirmed', confirmed_at = now() where id = $1`,
    [deposit],
  );
  await tx.query(`update public.payment set status = 'delivered' where leader_deposit_id = $1`, [deposit]);
  await tx.query('set constraints all immediate');
  await tx.query('set constraints all deferred');
};

/** Lo que hará la función de reabrir (HU-DIN-07). */
const reopen = async (tx: Tx, deposit: string, reason: string | null = 'Faltó un recibo') => {
  await tx.query(`select set_config('colportor.deposit_event', $1, true)`, [JSON.stringify({ reason })]);
  await tx.query(`update public.payment set status = 'collected' where leader_deposit_id = $1`, [deposit]);
  await tx.query(`update public.leader_deposit set status = 'draft', confirmed_at = null where id = $1`, [
    deposit,
  ]);
  await tx.query(`select set_config('colportor.deposit_event', '', true)`);
  await tx.query('set constraints all immediate');
  await tx.query('set constraints all deferred');
};

const numberOf = async (tx: Tx, deposit: string) =>
  (
    await tx.query<{ n: number | null }>(
      'select deposit_number as n from public.leader_deposit where id = $1',
      [deposit],
    )
  ).rows[0]!.n;

const receipt = async (tx: Tx, owner: string, deposit: string | null, kind = 'deposit_receipt') => {
  const id = randomUUID();
  await tx.query(
    `insert into public.photo (id, owner_id, kind, path, bytes, leader_deposit_id) values ($1, $2, $3, $4, 100, $5)`,
    [id, owner, kind, `${owner}/${kind}/${id}.webp`, deposit],
  );
  return id;
};

describe('Abibono: número consecutivo (R7, BR-DEP-02)', () => {
  it('se asigna solo al confirmar; los borradores no consumen número; reabrir y reconfirmar lo conserva', () =>
    inTransaction(async (tx) => {
      const { owner } = await setup(tx);
      const first = await draft(tx, owner);
      const second = await draft(tx, owner);
      const third = await draft(tx, owner);
      expect(await numberOf(tx, first)).toBeNull();

      await confirm(tx, second);
      await confirm(tx, first);
      expect([await numberOf(tx, second), await numberOf(tx, first), await numberOf(tx, third)]).toEqual([
        1,
        2,
        null,
      ]);

      // CA-3b: renombrar no afecta la secuencia.
      await tx.query(`update public.leader_deposit set note = 'x' where id = $1`, [first]);
      await reopen(tx, first);
      await tx.query(`update public.leader_deposit set title = 'Entrega de octubre' where id = $1`, [first]);
      await confirm(tx, first);
      expect(await numberOf(tx, first)).toBe(2);
      await confirm(tx, third);
      expect(await numberOf(tx, third)).toBe(3);
    }));

  it('el número no se escribe a mano ni cambia; nace borrador sin número', () =>
    inTransaction(async (tx) => {
      const { owner } = await setup(tx);
      expect(
        await expectError(
          tx,
          'insert into public.leader_deposit (id, owner_id, deposit_number) values ($1, $2, 5)',
          [randomUUID(), owner],
        ),
      ).toBe(RAISED);
      expect(
        await expectError(
          tx,
          `insert into public.leader_deposit (id, owner_id, status, confirmed_at, deposit_number) values ($1, $2, 'confirmed', now(), 1)`,
          [randomUUID(), owner],
        ),
      ).toBe(RAISED);
      const d = await draft(tx, owner);
      expect(
        await expectError(tx, 'update public.leader_deposit set deposit_number = 9 where id = $1', [d]),
      ).toBe(RAISED);
      await confirm(tx, d);
      expect(
        await expectError(tx, 'update public.leader_deposit set deposit_number = 9 where id = $1', [d]),
      ).toBe(RAISED);
    }));

  it('es único por colportor y cada colportor numera aparte', () =>
    inTransaction(async (tx) => {
      const a = await setup(tx);
      const b = await setup(tx);
      const da = await draft(tx, a.owner);
      const db = await draft(tx, b.owner);
      await confirm(tx, da);
      await confirm(tx, db);
      expect([await numberOf(tx, da), await numberOf(tx, db)]).toEqual([1, 1]);
      const { rows } = await tx.query(
        `select indexdef from pg_indexes where indexname = 'leader_deposit_owner_number_uq'`,
      );
      expect(rows[0].indexdef).toContain('(owner_id, deposit_number)');
    }));

  it('solo se borra un borrador que nunca se confirmó (su número nunca se pierde)', () =>
    inTransaction(async (tx) => {
      const { owner } = await setup(tx);
      const never = await draft(tx, owner);
      await tx.query('delete from public.leader_deposit where id = $1', [never]);
      const reopened = await draft(tx, owner);
      await confirm(tx, reopened);
      expect(await expectError(tx, 'delete from public.leader_deposit where id = $1', [reopened])).toBe(
        RAISED,
      );
      await reopen(tx, reopened);
      expect(await expectError(tx, 'delete from public.leader_deposit where id = $1', [reopened])).toBe(
        RAISED,
      );
    }));
});

describe('Abibono confirmado: bloqueos (R4, BR-DEP-12)', () => {
  it('CA-5: cambiar el efectivo se rechaza; cambiar la nota se guarda', () =>
    inTransaction(async (tx) => {
      const { owner } = await setup(tx);
      const d = await draft(tx, owner);
      await confirm(tx, d);
      expect(
        await expectError(tx, 'update public.leader_deposit set cash_amount = 1 where id = $1', [d]),
      ).toBe(RAISED);
      await tx.query(`update public.leader_deposit set note = 'Me faltaron $5.000' where id = $1`, [d]);
      const { rows } = await tx.query('select note from public.leader_deposit where id = $1', [d]);
      expect(rows[0].note).toBe('Me faltaron $5.000');
    }));

  it.each([
    ['título', `title = 'Otro'`],
    ['fecha', 'deposit_date = deposit_date - 1'],
    ['transferencia', 'transfer_amount = 1'],
    ['fecha de confirmación', `confirmed_at = now() - interval '1 day'`],
  ])('no cambia su %s', (_, set) =>
    inTransaction(async (tx) => {
      const { owner } = await setup(tx);
      const d = await draft(tx, owner);
      await confirm(tx, d);
      expect(await expectError(tx, `update public.leader_deposit set ${set} where id = $1`, [d])).toBe(
        RAISED,
      );
    }),
  );

  it('no se borra (ni lógico) y un borrador sí se edita', () =>
    inTransaction(async (tx) => {
      const { owner } = await setup(tx);
      const d = await draft(tx, owner);
      await tx.query(`update public.leader_deposit set cash_amount = 1, title = 'Borrador' where id = $1`, [
        d,
      ]);
      await confirm(tx, d);
      expect(
        await expectError(tx, 'update public.leader_deposit set deleted_at = now() where id = $1', [d]),
      ).toBe(CHECK_VIOLATION);
    }));

  it('confirmar y reabrir dejan su evento; reabrir exige motivo', () =>
    inTransaction(async (tx) => {
      const { owner } = await setup(tx);
      const d = await draft(tx, owner);
      await confirm(tx, d);
      await reopen(tx, d, 'Faltó un recibo');
      const events = await tx.query(
        'select type, reason from public.leader_deposit_event where leader_deposit_id = $1 order by seq',
        [d],
      );
      expect(events.rows).toEqual([
        { type: 'confirmed', reason: null },
        { type: 'reopened', reason: 'Faltó un recibo' },
      ]);
      await confirm(tx, d);
      await tx.query(`select set_config('colportor.deposit_event', '', true)`);
      expect(
        await expectError(
          tx,
          `update public.leader_deposit set status = 'draft', confirmed_at = null where id = $1`,
          [d],
        ),
      ).toBe(CHECK_VIOLATION);
    }));
});

describe('Abonos y Abibono (R2, R3, R6, BR-DEP-08, BR-PAY-09/10)', () => {
  it('CA-4: un abono entregado no cambia su valor ni nada más, ni se borra', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const p = await collected(tx, owner, customer);
      const d = await draft(tx, owner);
      await link(tx, p, d);
      await confirm(tx, d);
      for (const set of [
        'paid_amount = 1',
        `method = 'transfer'`,
        'paid_at = paid_at - 1',
        'deleted_at = now()',
        'leader_deposit_id = null',
      ]) {
        expect(await expectError(tx, `update public.payment set ${set} where id = $1`, [p])).toMatch(
          /P0001|23514/,
        );
      }
      expect(await expectError(tx, 'update public.payment set paid_amount = 1 where id = $1', [p])).toBe(
        RAISED,
      );
    }));

  it('CA-4 (API): el usuario no puede editar abonos por la API', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const p = await collected(tx, owner, customer);
      const code = await asUser(tx, owner, () =>
        expectError(tx, 'update public.payment set paid_amount = 1 where id = $1', [p]),
      );
      expect(code).toBe(INSUFFICIENT_PRIVILEGE);
    }));

  it('CA-6: un abono vinculado a un Abibono no se vincula a otro', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const p = await collected(tx, owner, customer);
      const first = await draft(tx, owner);
      const second = await draft(tx, owner);
      await link(tx, p, first);
      expect(
        await expectError(tx, 'update public.payment set leader_deposit_id = $2 where id = $1', [p, second]),
      ).toBe(RAISED);
      // Quitarlo del borrador y ponerlo en otro sí (en dos pasos).
      await link(tx, p, null);
      await link(tx, p, second);
    }));

  it('R2 / BR-PAY-09: solo un abono cobrado se vincula', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const d = await draft(tx, owner);
      const scheduled = randomUUID();
      await tx.query(
        `insert into public.payment (id, owner_id, customer_id, kind, status, agreed_amount, due_date, original_due_date)
         values ($1, $2, $3, 'scheduled', 'scheduled', 10000, public.today_bogota() + 5, public.today_bogota() + 5)`,
        [scheduled, owner, customer],
      );
      expect(
        await expectError(tx, 'update public.payment set leader_deposit_id = $2 where id = $1', [
          scheduled,
          d,
        ]),
      ).toBe(CHECK_VIOLATION);
    }));

  it('BR-PAY-11: borrar un abono cobrado lo quita de su borrador (no se borra vinculado)', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const p = await collected(tx, owner, customer);
      const d = await draft(tx, owner);
      await link(tx, p, d);
      expect(await expectError(tx, 'update public.payment set deleted_at = now() where id = $1', [p])).toBe(
        CHECK_VIOLATION,
      );
      await tx.query('update public.payment set deleted_at = now(), leader_deposit_id = null where id = $1', [
        p,
      ]);
    }));

  it('R6: entregado sin Abibono confirmado, o cobrado en un confirmado, no se puede guardar', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const loose = await collected(tx, owner, customer);
      await tx.query(`update public.payment set status = 'delivered' where id = $1`, [loose]);
      expect(await expectError(tx, 'set constraints all immediate')).toBe(RAISED);
    }));

  it('R6: confirmar el Abibono sin entregar sus abonos no se puede guardar', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const p = await collected(tx, owner, customer);
      const d = await draft(tx, owner);
      await link(tx, p, d);
      // El vínculo ya quedó verificado: lo único pendiente es el cambio del Abibono.
      await tx.query('set constraints all immediate');
      await tx.query('set constraints all deferred');
      await tx.query(
        `update public.leader_deposit set status = 'confirmed', confirmed_at = now() where id = $1`,
        [d],
      );
      expect(await expectError(tx, 'set constraints all immediate')).toBe(RAISED);
    }));

  it('R6: entregar un abono de un borrador no se puede guardar; reabrir deja todo cobrado y en borrador', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx);
      const p = await collected(tx, owner, customer);
      const q = await collected(tx, owner, customer, 60_000, 'transfer');
      const d = await draft(tx, owner);
      await link(tx, p, d);
      await link(tx, q, d);
      await tx.query(`update public.payment set status = 'delivered' where id = $1`, [p]);
      expect(await expectError(tx, 'set constraints all immediate')).toBe(RAISED);

      await tx.query(`update public.payment set status = 'collected' where id = $1`, [p]);
      await confirm(tx, d);
      await reopen(tx, d);
      const { rows } = await tx.query('select status from public.payment where leader_deposit_id = $1', [d]);
      expect(rows.map((r) => r.status)).toEqual(['collected', 'collected']);
    }));

  it('un abono solo se vincula a un Abibono del mismo colportor', () =>
    inTransaction(async (tx) => {
      const a = await setup(tx);
      const b = await setup(tx);
      const p = await collected(tx, a.owner, a.customer);
      const foreign = await draft(tx, b.owner);
      expect(
        await expectError(tx, 'update public.payment set leader_deposit_id = $2 where id = $1', [p, foreign]),
      ).toBe(FK_VIOLATION);
    }));
});

describe('Recibos (R5, BR-PHO-03)', () => {
  it('un recibo exige Abibono y solo los recibos se vinculan', () =>
    inTransaction(async (tx) => {
      const { owner } = await setup(tx);
      const d = await draft(tx, owner);
      const insert = `insert into public.photo (id, owner_id, kind, path, bytes, leader_deposit_id)
                      values ($1, $2, $3, $4, 1, $5)`;
      const path = (kind: string) => `${owner}/${kind}/${randomUUID()}.webp`;
      expect(
        await expectError(tx, insert, [
          randomUUID(),
          owner,
          'deposit_receipt',
          path('deposit_receipt'),
          null,
        ]),
      ).toBe(CHECK_VIOLATION);
      expect(
        await expectError(tx, insert, [randomUUID(), owner, 'customer_info', path('customer_info'), d]),
      ).toBe(CHECK_VIOLATION);
    }));

  it('en un borrador el recibo se borra; en un confirmado no, pero sí se agregan fotos', () =>
    inTransaction(async (tx) => {
      const { owner } = await setup(tx);
      const d = await draft(tx, owner);
      const inDraft = await receipt(tx, owner, d);
      const kept = await receipt(tx, owner, d);
      await tx.query('update public.photo set deleted_at = now() where id = $1', [inDraft]);
      await confirm(tx, d);
      expect(await expectError(tx, 'update public.photo set deleted_at = now() where id = $1', [kept])).toBe(
        RAISED,
      );
      await receipt(tx, owner, d); // R4: agregar fotos se permite
      const other = await draft(tx, owner);
      expect(
        await expectError(tx, 'update public.photo set leader_deposit_id = $2 where id = $1', [kept, other]),
      ).toBe(RAISED);
    }));

  it('el usuario sube su recibo por la API a su Abibono, no al de otro', () =>
    inTransaction(async (tx) => {
      const a = await setup(tx);
      const b = await setup(tx);
      const mine = await draft(tx, a.owner);
      const theirs = await draft(tx, b.owner);
      await asUser(tx, a.owner, () => receipt(tx, a.owner, mine));
      const code = await asUser(tx, a.owner, () =>
        expectError(
          tx,
          `insert into public.photo (id, owner_id, kind, path, bytes, leader_deposit_id)
           values ($1, $2, 'deposit_receipt', $3, 1, $4)`,
          [randomUUID(), a.owner, `${a.owner}/deposit_receipt/x.webp`, theirs],
        ),
      );
      expect(code).toBe(FK_VIOLATION);
    }));
});

describe('Abibono: RLS', () => {
  it('A/B: cada usuario lee solo sus Abibonos, eventos y contador; nadie escribe por la API', () =>
    inTransaction(async (tx) => {
      const a = await setup(tx);
      const b = await setup(tx);
      const da = await draft(tx, a.owner);
      await confirm(tx, da);
      await draft(tx, b.owner);

      const seenByB = await asUser(tx, b.owner, async () => ({
        deposits: (await tx.query('select id from public.leader_deposit')).rowCount,
        events: (await tx.query('select id from public.leader_deposit_event')).rowCount,
        counters: (await tx.query('select owner_id from public.leader_deposit_counter')).rowCount,
      }));
      expect(seenByB).toEqual({ deposits: 1, events: 0, counters: 0 });
      const seenByA = await asUser(
        tx,
        a.owner,
        async () => (await tx.query('select id from public.leader_deposit')).rows,
      );
      expect(seenByA).toEqual([{ id: da }]);

      for (const sql of [
        `insert into public.leader_deposit (id) values ('${randomUUID()}')`,
        `update public.leader_deposit set note = 'x'`,
        `delete from public.leader_deposit`,
        `insert into public.leader_deposit_event (owner_id, leader_deposit_id, type) values ('${a.owner}', '${da}', 'confirmed')`,
      ]) {
        expect(await asUser(tx, a.owner, () => expectError(tx, sql))).toBe(INSUFFICIENT_PRIVILEGE);
      }
    }));

  it('un usuario inactivo no lee sus Abibonos', () =>
    inTransaction(async (tx) => {
      const { owner } = await setup(tx);
      await draft(tx, owner);
      await tx.query('update public.profile set is_active = false where id = $1', [owner]);
      const seen = await asUser(tx, owner, () => tx.query('select id from public.leader_deposit'));
      expect(seen.rowCount).toBe(0);
    }));
});
