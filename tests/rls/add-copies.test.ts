// HU-INV-02 · add_copies: todo o nada, numeración, precios copiados, idempotencia y seguridad.
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

const CORAZON = '00000000-0000-4000-8000-000000000101'; // seed: cultural, público 75.000, colportor 37.500
const BEBIDAS = '00000000-0000-4000-8000-000000000102'; // seed: cultural, público 68.000, colportor 34.000
const MINI = '00000000-0000-4000-8000-000000000301'; // seed: minibook sin precio público, colportor 1.500
const INACTIVE = '00000000-0000-4000-8000-000000000108'; // seed: desactivado

beforeAll(assertDatabaseReachable);
afterAll(() => pool.end());

type Line = { titleId: string; copyIds: string[] };
type Created = { copy_id: string; title_id: string; number: number };
type Outcome = { ok: true; rows: Created[] } | { ok: false; code: string; detail?: string; pgCode?: string };

const ids = (n: number) => Array.from({ length: n }, () => randomUUID());

/** Llama a add_copies como `user` (o como anónimo si es null), sin abortar la transacción de la prueba. */
async function addCopies(
  tx: Tx,
  user: string | null,
  lines: unknown,
  receivedAt: string | null = null,
  batchId: string = randomUUID(),
): Promise<Outcome> {
  const date = receivedAt ?? (await today(tx));
  // El savepoint va DENTRO del cambio de rol: así el error no deja la transacción abortada.
  const call = async (): Promise<Outcome> => {
    await tx.query('savepoint add_copies');
    try {
      const { rows } = await tx.query<Created>('select * from public.add_copies($1, $2, $3::jsonb)', [
        batchId,
        date,
        JSON.stringify(lines),
      ]);
      await tx.query('release savepoint add_copies');
      return { ok: true, rows };
    } catch (error) {
      await tx.query('rollback to savepoint add_copies');
      const e = error as { message: string; detail?: string; code?: string };
      return { ok: false, code: e.message.split(':')[0]!, detail: e.detail, pgCode: e.code };
    }
  };
  return user === null ? asAnon(tx, call) : asUser(tx, user, call);
}

const today = async (tx: Tx) =>
  (await tx.query<{ d: string }>(`select public.today_bogota()::text as d`)).rows[0]!.d;
const daysFromToday = async (tx: Tx, days: number) =>
  (await tx.query<{ d: string }>(`select (public.today_bogota() + $1::int)::text as d`, [days])).rows[0]!.d;

const copiesOf = async (tx: Tx, owner: string) =>
  (
    await tx.query<{
      id: string;
      title_id: string;
      number: number;
      status: string;
      received_at: string;
      public_price_snapshot: number | null;
      colportor_price_snapshot: number;
    }>(
      `select id, title_id, number, status, received_at::text, public_price_snapshot, colportor_price_snapshot
       from public.copy where owner_id = $1 order by title_id, number`,
      [owner],
    )
  ).rows;

describe('add_copies (HU-INV-02)', () => {
  it('CA-2: 2 "Corazón" y 1 "Bebidas" con fecha de hoy → #1, #2 y #1, en físico, con los precios del título', () =>
    inTransaction(async (tx) => {
      const user = await createUser(tx);
      const [c1, c2] = ids(2);
      const [b1] = ids(1);
      const batchId = randomUUID();
      const result = await addCopies(
        tx,
        user,
        [
          { titleId: CORAZON, copyIds: [c1, c2] },
          { titleId: BEBIDAS, copyIds: [b1] },
        ],
        null,
        batchId,
      );
      expect(result).toEqual({
        ok: true,
        rows: [
          { copy_id: c1, title_id: CORAZON, number: 1 },
          { copy_id: c2, title_id: CORAZON, number: 2 },
          { copy_id: b1, title_id: BEBIDAS, number: 1 },
        ],
      });

      const day = await today(tx);
      expect(await copiesOf(tx, user)).toEqual([
        expect.objectContaining({
          id: c1,
          number: 1,
          status: 'in_stock',
          received_at: day,
          public_price_snapshot: 75_000,
          colportor_price_snapshot: 37_500,
        }),
        expect.objectContaining({
          id: c2,
          number: 2,
          status: 'in_stock',
          received_at: day,
          public_price_snapshot: 75_000,
          colportor_price_snapshot: 37_500,
        }),
        expect.objectContaining({
          id: b1,
          number: 1,
          status: 'in_stock',
          received_at: day,
          public_price_snapshot: 68_000,
          colportor_price_snapshot: 34_000,
        }),
      ]);

      // R3: cada ejemplar deja su evento "received", con la fecha y el lote.
      const events = await tx.query<{ copy_id: string; type: string; data: Record<string, unknown> }>(
        `select copy_id, type, data from public.copy_event where owner_id = $1 order by seq`,
        [user],
      );
      expect(events.rows).toEqual(
        [c1, c2, b1].map((copyId) => ({
          copy_id: copyId,
          type: 'received',
          data: { receivedAt: day, batchId },
        })),
      );
      // El contexto del lote no queda para otras escrituras de la misma transacción.
      expect((await tx.query(`select current_setting('colportor.copy_event', true) as v`)).rows[0].v).toBe(
        '',
      );
    }));

  it('BR-MBK-01: los minibooks se agregan igual (sin precio público copian null) y la numeración sigue sin reutilizar', () =>
    inTransaction(async (tx) => {
      const user = await createUser(tx);
      await addCopies(tx, user, [{ titleId: MINI, copyIds: ids(2) }]);
      const second = await addCopies(tx, user, [{ titleId: MINI, copyIds: ids(3) }]);
      expect(second.ok && second.rows.map((r) => r.number)).toEqual([3, 4, 5]);
      const copies = await copiesOf(tx, user);
      expect(
        copies.every((c) => c.public_price_snapshot === null && c.colportor_price_snapshot === 1_500),
      ).toBe(true);
    }));

  it('AF-50: una fecha pasada se acepta y queda como recibido', () =>
    inTransaction(async (tx) => {
      const user = await createUser(tx);
      const anteayer = await daysFromToday(tx, -2);
      expect((await addCopies(tx, user, [{ titleId: CORAZON, copyIds: ids(1) }], anteayer)).ok).toBe(true);
      expect((await copiesOf(tx, user))[0]?.received_at).toBe(anteayer);
    }));

  it('CA-5 / R4: una fecha futura → DATE_IN_FUTURE y no crea nada', () =>
    inTransaction(async (tx) => {
      const user = await createUser(tx);
      const tomorrow = await daysFromToday(tx, 1);
      expect(await addCopies(tx, user, [{ titleId: CORAZON, copyIds: ids(1) }], tomorrow)).toMatchObject({
        ok: false,
        code: 'DATE_IN_FUTURE',
      });
      expect(await copiesOf(tx, user)).toEqual([]);
    }));

  it('CA-4 / R5: un título desactivado justo antes de confirmar → TITLE_INACTIVE con sus ids y no crea ninguno', () =>
    inTransaction(async (tx) => {
      const user = await createUser(tx);
      await tx.query(`update public.title set is_active = false where id = $1`, [BEBIDAS]);
      const result = await addCopies(tx, user, [
        { titleId: CORAZON, copyIds: ids(2) },
        { titleId: BEBIDAS, copyIds: ids(1) },
        { titleId: INACTIVE, copyIds: ids(1) },
      ]);
      expect(result).toMatchObject({ ok: false, code: 'TITLE_INACTIVE' });
      expect(!result.ok && JSON.parse(result.detail!)).toEqual([BEBIDAS, INACTIVE].sort());
      expect(await copiesOf(tx, user)).toEqual([]);
      // R2: tampoco avanzó el contador (los números no se "gastan").
      const counter = await tx.query(`select 1 from public.copy_counter where owner_id = $1`, [user]);
      expect(counter.rowCount).toBe(0);
    }));

  it('un título que no existe cuenta como no disponible (TITLE_INACTIVE)', () =>
    inTransaction(async (tx) => {
      const user = await createUser(tx);
      const missing = randomUUID();
      const result = await addCopies(tx, user, [{ titleId: missing, copyIds: ids(1) }]);
      expect(result).toMatchObject({ ok: false, code: 'TITLE_INACTIVE', detail: JSON.stringify([missing]) });
    }));

  it('CA-6 / R6: reintentar con los mismos copyIds devuelve los ya creados: siguen siendo 3, no 6', () =>
    inTransaction(async (tx) => {
      const user = await createUser(tx);
      const lines = [
        { titleId: CORAZON, copyIds: ids(2) },
        { titleId: BEBIDAS, copyIds: ids(1) },
      ];
      const first = await addCopies(tx, user, lines);
      const retry = await addCopies(tx, user, lines);
      expect(retry).toEqual(first);
      expect(await copiesOf(tx, user)).toHaveLength(3);
      const events = await tx.query(`select 1 from public.copy_event where owner_id = $1`, [user]);
      expect(events.rowCount).toBe(3);
      // El siguiente lote sigue en #3: el reintento no gastó números.
      const next = await addCopies(tx, user, [{ titleId: CORAZON, copyIds: ids(1) }]);
      expect(next.ok && next.rows[0]?.number).toBe(3);
    }));

  it('R2: si una parte del lote choca con ejemplares que ya existen → CONFLICT y no crea ninguno', () =>
    inTransaction(async (tx) => {
      const user = await createUser(tx);
      const [taken] = ids(1);
      await addCopies(tx, user, [{ titleId: CORAZON, copyIds: [taken] }]);
      // Mismos ids pero mezclados con nuevos, o con otro título: no es un reintento.
      expect(await addCopies(tx, user, [{ titleId: CORAZON, copyIds: [taken, randomUUID()] }])).toMatchObject(
        {
          ok: false,
          code: 'CONFLICT',
        },
      );
      expect(await addCopies(tx, user, [{ titleId: BEBIDAS, copyIds: [taken] }])).toMatchObject({
        ok: false,
        code: 'CONFLICT',
      });
      expect(await copiesOf(tx, user)).toHaveLength(1);
    }));

  it('R2: un fallo a mitad de la inserción deshace todo el lote', () =>
    inTransaction(async (tx) => {
      const user = await createUser(tx);
      // Un trigger de prueba falla en el tercer ejemplar: los dos primeros no deben quedar.
      await tx.query(`
        create function pg_temp.fail_third() returns trigger language plpgsql as $$
        begin
          if new.number = 3 then raise exception 'fallo simulado'; end if;
          return new;
        end $$;
        create trigger zz_fail_third before insert on public.copy
          for each row execute function pg_temp.fail_third();
      `);
      const result = await addCopies(tx, user, [{ titleId: CORAZON, copyIds: ids(3) }]);
      expect(result.ok).toBe(false);
      await tx.query('drop trigger zz_fail_third on public.copy');
      expect(await copiesOf(tx, user)).toEqual([]);
      expect((await tx.query(`select 1 from public.copy_event where owner_id = $1`, [user])).rowCount).toBe(
        0,
      );
    }));

  it('CA-8 / BR-TIT-07: cambiar el precio del título después no altera el ejemplar ya agregado', () =>
    inTransaction(async (tx) => {
      const user = await createUser(tx);
      await addCopies(tx, user, [{ titleId: CORAZON, copyIds: ids(1) }]);
      await tx.query(`update public.title set public_price = 80000, colportor_price = 40000 where id = $1`, [
        CORAZON,
      ]);
      const [copy] = await copiesOf(tx, user);
      expect(copy).toMatchObject({ public_price_snapshot: 75_000, colportor_price_snapshot: 37_500 });
      // El siguiente lote ya copia el precio nuevo.
      await addCopies(tx, user, [{ titleId: CORAZON, copyIds: ids(1) }]);
      expect((await copiesOf(tx, user))[1]).toMatchObject({
        public_price_snapshot: 80_000,
        colportor_price_snapshot: 40_000,
      });
    }));

  it.each([
    ['sin líneas', []],
    ['líneas sin ejemplares', [{ titleId: CORAZON, copyIds: [] }]],
  ])('BATCH_EMPTY: %s', (_, lines) =>
    inTransaction(async (tx) => {
      const user = await createUser(tx);
      expect(await addCopies(tx, user, lines)).toMatchObject({ ok: false, code: 'BATCH_EMPTY' });
    }),
  );

  it.each([
    ['no es un arreglo', { titleId: CORAZON }],
    ['línea que no es objeto', ['x']],
    ['titleId que no es UUID', [{ titleId: 'corazon', copyIds: [randomUUID()] }]],
    ['copyIds que no es arreglo', [{ titleId: CORAZON, copyIds: randomUUID() }]],
    ['copyId que no es UUID', [{ titleId: CORAZON, copyIds: ['uno'] }]],
    ['copyId que no es texto', [{ titleId: CORAZON, copyIds: [1] }]],
  ])('VALIDATION: %s', (_, lines) =>
    inTransaction(async (tx) => {
      const user = await createUser(tx);
      expect(await addCopies(tx, user, lines)).toMatchObject({ ok: false, code: 'VALIDATION' });
    }),
  );

  it('VALIDATION: copyIds repetidos en el lote', () =>
    inTransaction(async (tx) => {
      const user = await createUser(tx);
      const [id] = ids(1);
      const lines: Line[] = [
        { titleId: CORAZON, copyIds: [id!] },
        { titleId: BEBIDAS, copyIds: [id!] },
      ];
      expect(await addCopies(tx, user, lines)).toMatchObject({ ok: false, code: 'VALIDATION' });
    }));
});

describe('add_copies: seguridad', () => {
  it('A/B: los ejemplares quedan de quien llama; B no los ve ni puede "reintentar" con los ids de A', () =>
    inTransaction(async (tx) => {
      const a = await createUser(tx);
      const b = await createUser(tx);
      const lines = [{ titleId: CORAZON, copyIds: ids(2) }];
      await addCopies(tx, a, lines);
      expect(await copiesOf(tx, a)).toHaveLength(2);

      expect(await addCopies(tx, b, lines)).toMatchObject({ ok: false, code: 'CONFLICT' });
      const seenByB = await asUser(tx, b, () => tx.query(`select 1 from public.copy`));
      expect(seenByB.rowCount).toBe(0);
      // B numera aparte: su primer "Corazón" es #1.
      const own = await addCopies(tx, b, [{ titleId: CORAZON, copyIds: ids(1) }]);
      expect(own.ok && own.rows[0]?.number).toBe(1);
    }));

  it('un usuario inactivo no agrega nada (FORBIDDEN)', () =>
    inTransaction(async (tx) => {
      const user = await createUser(tx, { isActive: false });
      expect(await addCopies(tx, user, [{ titleId: CORAZON, copyIds: ids(1) }])).toMatchObject({
        ok: false,
        code: 'FORBIDDEN',
      });
      expect(await copiesOf(tx, user)).toEqual([]);
    }));

  it('anon no puede ejecutar la función', () =>
    inTransaction(async (tx) => {
      expect(await addCopies(tx, null, [{ titleId: CORAZON, copyIds: ids(1) }], '2026-01-01')).toMatchObject({
        ok: false,
        pgCode: '42501',
      });
    }));

  it('el usuario sigue sin poder insertar ejemplares directo en la tabla (solo por la función)', () =>
    inTransaction(async (tx) => {
      const user = await createUser(tx);
      const result = await asUser(tx, user, async () => {
        await tx.query('savepoint direct');
        try {
          await tx.query(
            `insert into public.copy (id, title_id, number, colportor_price_snapshot) values ($1, $2, 1, 1)`,
            [randomUUID(), CORAZON],
          );
          return 'ok';
        } catch (error) {
          await tx.query('rollback to savepoint direct');
          return (error as { code: string }).code;
        }
      });
      expect(result).toBe('42501');
    }));
});
