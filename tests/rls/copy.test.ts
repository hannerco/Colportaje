import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { COPY_ACTIONS, COPY_TRANSITIONS, type CopyStatus } from '@/domain/copy';
import {
  asUser,
  assertDatabaseReachable,
  createUser,
  expectError,
  inTransaction,
  pool,
  type Tx,
} from './helpers/db';

const TITLE = '00000000-0000-4000-8000-000000000101'; // seed: cultural, público 75.000, colportor 37.500
const OTHER_TITLE = '00000000-0000-4000-8000-000000000102';
const INVALID_TRANSITION = 'P0001';
const CHECK_VIOLATION = '23514';
const FK_VIOLATION = '23503';
const UNIQUE_VIOLATION = '23505';
const INSUFFICIENT_PRIVILEGE = '42501';
const STATUSES: CopyStatus[] = ['in_stock', 'sold', 'flagged', 'lost', 'returned_to_leader'];

beforeAll(assertDatabaseReachable);
afterAll(() => pool.end());

const newCustomer = async (tx: Tx, owner: string) => {
  const id = randomUUID();
  await tx.query(`insert into public.customer (id, owner_id, name) values ($1, $2, 'Clienta')`, [id, owner]);
  return id;
};

/** Inserta un ejemplar como lo hará la función de HU-INV-02 (el número lo pone la base). */
const insertCopy = async (
  tx: Tx,
  owner: string,
  options: { title?: string; status?: CopyStatus; customer?: string | null; number?: number } = {},
) => {
  const id = randomUUID();
  const sold = options.status === 'sold';
  await tx.query(
    `insert into public.copy (id, owner_id, title_id, number, status, customer_id, agreed_price, sold_at,
                              public_price_snapshot, colportor_price_snapshot, received_at)
     values ($1, $2, $3, coalesce($4, 999), $5, $6, $7, $8, 75000, 37500, '2026-10-01')`,
    [
      id,
      owner,
      options.title ?? TITLE,
      options.number ?? null,
      options.status ?? 'in_stock',
      sold ? (options.customer ?? null) : null,
      sold ? 70_000 : null,
      sold ? '2026-10-03T15:00:00Z' : null,
    ],
  );
  return id;
};

const numbersOf = async (tx: Tx, owner: string, title = TITLE) =>
  (
    await tx.query<{ number: number }>(
      'select number from public.copy where owner_id = $1 and title_id = $2 order by number',
      [owner, title],
    )
  ).rows.map((r) => r.number);

const eventsOf = async (tx: Tx, copyId: string) =>
  (
    await tx.query<{ type: string; note: string | null; data: Record<string, unknown> }>(
      'select type, note, data from public.copy_event where copy_id = $1 order by seq',
      [copyId],
    )
  ).rows;

describe('numeración de ejemplares (HU-INV-01 R1, BR-COPY-05)', () => {
  it('CA-1: un título sin ejemplares recibe 1, 2 y 3 (aunque el cliente envíe otro número)', async () => {
    await inTransaction(async (tx) => {
      const owner = await createUser(tx);
      for (let i = 0; i < 3; i++) await insertCopy(tx, owner, { number: 500 });
      expect(await numbersOf(tx, owner)).toEqual([1, 2, 3]);
    });
  });

  it('CA-2: si se elimina el #2 y se crea otro, el nuevo es #4 (el número no se reutiliza)', async () => {
    await inTransaction(async (tx) => {
      const owner = await createUser(tx);
      await insertCopy(tx, owner);
      const second = await insertCopy(tx, owner);
      await insertCopy(tx, owner);
      await tx.query('update public.copy set deleted_at = now() where id = $1', [second]);
      const fourth = await insertCopy(tx, owner);
      const { rows } = await tx.query('select number from public.copy where id = $1', [fourth]);
      expect(rows).toEqual([{ number: 4 }]);
    });
  });

  it('CA-4: dos usuarios con el mismo título empiezan cada uno en #1; otro título también empieza en #1', async () => {
    await inTransaction(async (tx) => {
      const a = await createUser(tx);
      const b = await createUser(tx);
      await insertCopy(tx, a);
      await insertCopy(tx, b);
      await insertCopy(tx, a, { title: OTHER_TITLE });
      expect(await numbersOf(tx, a)).toEqual([1]);
      expect(await numbersOf(tx, b)).toEqual([1]);
      expect(await numbersOf(tx, a, OTHER_TITLE)).toEqual([1]);
    });
  });

  it('nadie puede llamar next_copy_number por la API', async () => {
    await inTransaction(async (tx) => {
      const a = await createUser(tx);
      await asUser(tx, a, async () => {
        expect(await expectError(tx, 'select public.next_copy_number($1, $2)', [a, TITLE])).toBe(
          INSUFFICIENT_PRIVILEGE,
        );
      });
    });
  });
});

describe('checks de copy (HU-INV-01 R2)', () => {
  it('CA-5: un ejemplar en físico con cliente se rechaza', async () => {
    await inTransaction(async (tx) => {
      const owner = await createUser(tx);
      const customer = await newCustomer(tx, owner);
      const copy = await insertCopy(tx, owner);
      expect(
        await expectError(tx, 'update public.copy set customer_id = $1 where id = $2', [customer, copy]),
      ).toBe(CHECK_VIOLATION);
    });
  });

  it.each([
    ['precio acordado sin vender', 'agreed_price = 50000'],
    ['fecha de venta sin vender', 'sold_at = now()'],
  ])('R2: %s se rechaza', async (_label, set) => {
    await inTransaction(async (tx) => {
      const owner = await createUser(tx);
      const copy = await insertCopy(tx, owner);
      expect(await expectError(tx, `update public.copy set ${set} where id = $1`, [copy])).toBe(
        CHECK_VIOLATION,
      );
    });
  });

  it('un ejemplar no puede venderse al cliente de otro usuario', async () => {
    await inTransaction(async (tx) => {
      const a = await createUser(tx);
      const b = await createUser(tx);
      const customerOfB = await newCustomer(tx, b);
      await tx.query('savepoint s');
      await expect(insertCopy(tx, a, { status: 'sold', customer: customerOfB })).rejects.toMatchObject({
        code: FK_VIOLATION,
      });
    });
  });

  it('BR-COPY-03/05: número, título y precios copiados no cambian', async () => {
    await inTransaction(async (tx) => {
      const owner = await createUser(tx);
      const copy = await insertCopy(tx, owner);
      for (const set of [
        'number = 7',
        `title_id = '${OTHER_TITLE}'`,
        'public_price_snapshot = 1',
        'colportor_price_snapshot = 1',
      ]) {
        expect(await expectError(tx, `update public.copy set ${set} where id = $1`, [copy])).toBe(
          INVALID_TRANSITION,
        );
      }
    });
  });
});

describe('transiciones: la base aplica la misma tabla que el dominio (HU-INV-01 R3)', () => {
  const domainAllows = (from: CopyStatus, to: CopyStatus) =>
    COPY_ACTIONS.some((a) => COPY_TRANSITIONS[a].from === from && COPY_TRANSITIONS[a].to === to);

  const pairs = STATUSES.flatMap((from) =>
    STATUSES.filter((to) => to !== from).map((to) => [from, to] as const),
  );

  it.each(pairs)('%s → %s', async (from, to) => {
    await inTransaction(async (tx) => {
      const owner = await createUser(tx);
      const customer = await newCustomer(tx, owner);
      const copy = await insertCopy(tx, owner, { status: from, customer });
      const set =
        to === 'sold'
          ? `status = 'sold', customer_id = '${customer}', agreed_price = 70000, sold_at = now()`
          : `status = '${to}', customer_id = null, agreed_price = null, sold_at = null`;
      const sql = `update public.copy set ${set} where id = $1`;
      if (domainAllows(from, to)) {
        await tx.query(sql, [copy]);
      } else {
        expect(await expectError(tx, sql, [copy])).toBe(INVALID_TRANSITION);
      }
    });
  });

  it.each(STATUSES)('eliminar desde %s', async (from) => {
    await inTransaction(async (tx) => {
      const owner = await createUser(tx);
      const customer = await newCustomer(tx, owner);
      const copy = await insertCopy(tx, owner, { status: from, customer });
      const allowed = COPY_ACTIONS.some(
        (a) => COPY_TRANSITIONS[a].from === from && COPY_TRANSITIONS[a].to === 'deleted',
      );
      const sql = 'update public.copy set deleted_at = now() where id = $1';
      if (allowed) await tx.query(sql, [copy]);
      else expect(await expectError(tx, sql, [copy])).toBe(INVALID_TRANSITION);
    });
  });

  it('CA-7 (base): vender un ejemplar perdido se rechaza', async () => {
    await inTransaction(async (tx) => {
      const owner = await createUser(tx);
      const customer = await newCustomer(tx, owner);
      const copy = await insertCopy(tx, owner, { status: 'lost' });
      expect(
        await expectError(
          tx,
          `update public.copy set status = 'sold', customer_id = $1, agreed_price = 1, sold_at = now() where id = $2`,
          [customer, copy],
        ),
      ).toBe(INVALID_TRANSITION);
    });
  });

  it('R5: un ejemplar eliminado solo admite deshacer la eliminación', async () => {
    await inTransaction(async (tx) => {
      const owner = await createUser(tx);
      const copy = await insertCopy(tx, owner);
      await tx.query('update public.copy set deleted_at = now() where id = $1', [copy]);
      expect(await expectError(tx, `update public.copy set status = 'flagged' where id = $1`, [copy])).toBe(
        INVALID_TRANSITION,
      );
      await tx.query('update public.copy set deleted_at = null where id = $1', [copy]);
    });
  });
});

describe('historial (HU-INV-01 R4, BR-AUD-01)', () => {
  it('cada cambio deja su evento en la misma transacción, con sus datos', async () => {
    await inTransaction(async (tx) => {
      const owner = await createUser(tx);
      const customer = await newCustomer(tx, owner);
      const copy = await insertCopy(tx, owner);

      await tx.query(`update public.copy set received_at = '2026-09-30' where id = $1`, [copy]);
      await tx.query(
        `update public.copy set status = 'sold', customer_id = $1, agreed_price = 70000, sold_at = now() where id = $2`,
        [customer, copy],
      );
      await tx.query('update public.copy set agreed_price = 65000 where id = $1', [copy]);
      await tx.query(
        `select set_config('colportor.copy_event', '{"reason":"customer_returned","note":"No le gustó"}', true)`,
      );
      await tx.query(
        `update public.copy set status = 'in_stock', customer_id = null, agreed_price = null, sold_at = null where id = $1`,
        [copy],
      );
      await tx.query(`select set_config('colportor.copy_event', '', true)`);

      expect(await eventsOf(tx, copy)).toEqual([
        { type: 'received', note: null, data: { receivedAt: '2026-10-01' } },
        { type: 'received_date_changed', note: null, data: { oldDate: '2026-10-01', newDate: '2026-09-30' } },
        { type: 'sold', note: null, data: { customerId: customer, agreedPrice: 70_000 } },
        { type: 'price_changed', note: null, data: { oldPrice: 70_000, newPrice: 65_000 } },
        { type: 'returned', note: 'No le gustó', data: { reason: 'customer_returned' } },
      ]);
    });
  });

  it('novedad, resolución, deshacer y eliminación quedan en el historial', async () => {
    await inTransaction(async (tx) => {
      const owner = await createUser(tx);
      const copy = await insertCopy(tx, owner);
      const step = async (set: string, ctx?: object) => {
        await tx.query(`select set_config('colportor.copy_event', $1, true)`, [
          ctx ? JSON.stringify(ctx) : '',
        ]);
        await tx.query(`update public.copy set ${set} where id = $1`, [copy]);
      };
      await step(`status = 'flagged'`, { note: 'El líder dice 4 y tengo 3' });
      await step(`status = 'in_stock'`); // Apareció
      await step(`status = 'flagged'`, { type: 'undo_resolved' }); // deshacer Apareció
      await step(`status = 'lost'`); // Perdido
      await step(`status = 'flagged'`); // deshacer Perdido
      await step('deleted_at = now()', { type: 'resolved', resolution: 'removed' }); // Eliminar desde la novedad
      await step('deleted_at = null'); // deshacer eliminar

      expect((await eventsOf(tx, copy)).map((e) => [e.type, e.data])).toEqual([
        ['received', { receivedAt: '2026-10-01' }],
        ['flagged', {}],
        ['resolved', { resolution: 'found' }],
        ['undo_resolved', {}],
        ['resolved', { resolution: 'lost' }],
        ['undo_resolved', {}],
        ['resolved', { resolution: 'removed', previousStatus: 'flagged' }],
        ['undo_deleted', { status: 'flagged' }],
      ]);
      expect((await eventsOf(tx, copy))[1]?.note).toBe('El líder dice 4 y tengo 3');
    });
  });

  it('devolver al líder y deshacer quedan en el historial', async () => {
    await inTransaction(async (tx) => {
      const owner = await createUser(tx);
      const copy = await insertCopy(tx, owner);
      await tx.query(`update public.copy set status = 'returned_to_leader' where id = $1`, [copy]);
      await tx.query(`update public.copy set status = 'in_stock' where id = $1`, [copy]);
      expect((await eventsOf(tx, copy)).map((e) => e.type)).toEqual([
        'received',
        'returned_to_leader',
        'undo_returned_to_leader',
      ]);
    });
  });
});

describe('copy_issue (HU-INV-01 R6)', () => {
  it('R6: como máximo una novedad abierta por ejemplar; resuelta la anterior, puede abrirse otra', async () => {
    await inTransaction(async (tx) => {
      const owner = await createUser(tx);
      const copy = await insertCopy(tx, owner);
      const open = (id = randomUUID()) =>
        tx.query(`insert into public.copy_issue (id, owner_id, copy_id, note) values ($1, $2, $3, 'Falta')`, [
          id,
          owner,
          copy,
        ]);
      const first = randomUUID();
      await open(first);
      await tx.query('savepoint s');
      await expect(open()).rejects.toMatchObject({ code: UNIQUE_VIOLATION });
      await tx.query('rollback to savepoint s');
      await tx.query(`update public.copy_issue set resolution = 'found', resolved_at = now() where id = $1`, [
        first,
      ]);
      await open();
    });
  });

  it('BR-COPY-10: la nota es obligatoria; resolución y fecha van juntas', async () => {
    await inTransaction(async (tx) => {
      const owner = await createUser(tx);
      const copy = await insertCopy(tx, owner);
      expect(
        await expectError(
          tx,
          `insert into public.copy_issue (id, owner_id, copy_id, note) values ($1, $2, $3, '  ')`,
          [randomUUID(), owner, copy],
        ),
      ).toBe(CHECK_VIOLATION);
      expect(
        await expectError(
          tx,
          `insert into public.copy_issue (id, owner_id, copy_id, note, resolution) values ($1, $2, $3, 'x', 'lost')`,
          [randomUUID(), owner, copy],
        ),
      ).toBe(CHECK_VIOLATION);
    });
  });
});

describe('RLS A/B de copy, copy_counter, copy_event y copy_issue', () => {
  it('A lee solo lo suyo y no escribe directamente en ninguna de las cuatro tablas', async () => {
    await inTransaction(async (tx) => {
      const a = await createUser(tx);
      const b = await createUser(tx);
      const copyA = await insertCopy(tx, a);
      const copyB = await insertCopy(tx, b);
      for (const [owner, copy] of [
        [a, copyA],
        [b, copyB],
      ] as const) {
        await tx.query(
          `insert into public.copy_issue (id, owner_id, copy_id, note) values ($1, $2, $3, 'x')`,
          [randomUUID(), owner, copy],
        );
      }
      await asUser(tx, a, async () => {
        for (const table of ['copy', 'copy_counter', 'copy_event', 'copy_issue']) {
          const { rows } = await tx.query<{ owner_id: string }>(`select owner_id from public.${table}`);
          expect(rows.length, table).toBeGreaterThan(0);
          expect(
            rows.every((r) => r.owner_id === a),
            table,
          ).toBe(true);
        }
        expect(
          await expectError(tx, `update public.copy set status = 'flagged' where id = $1`, [copyA]),
        ).toBe(INSUFFICIENT_PRIVILEGE);
        expect(await expectError(tx, `delete from public.copy_event`)).toBe(INSUFFICIENT_PRIVILEGE);
        expect(await expectError(tx, `update public.copy_counter set last_number = 0`)).toBe(
          INSUFFICIENT_PRIVILEGE,
        );
        expect(
          await expectError(tx, `insert into public.copy_issue (id, copy_id, note) values ($1, $2, 'x')`, [
            randomUUID(),
            copyA,
          ]),
        ).toBe(INSUFFICIENT_PRIVILEGE);
      });
    });
  });
});
