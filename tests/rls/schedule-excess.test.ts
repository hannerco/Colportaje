// HU-ABO-07 · resolve_schedule_excess: recálculo en el servidor, recorte, cancelar marcados, dejar, seguridad.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { EXCESS_TRIGGER_LIST, EXCESS_TRIGGERS, type ExcessTrigger } from '@/domain/schedule-excess';
import {
  asAnon,
  asUser,
  assertDatabaseReachable,
  createUser,
  inTransaction,
  pool,
  type Tx,
} from './helpers/db';

const TITLE = '00000000-0000-4000-8000-000000000101';

beforeAll(assertDatabaseReachable);
afterAll(() => pool.end());

type Outcome = { ok: true } | { ok: false; code: string; pgCode?: string };

const day = async (tx: Tx, offset: number) =>
  (await tx.query<{ d: string }>(`select (public.today_bogota() + $1::int)::text as d`, [offset])).rows[0]!.d;

/** Cliente con libros vendidos por `debt` y `paid` ya cobrado. */
const setup = async (tx: Tx, { debt, paid = 0 }: { debt: number; paid?: number }) => {
  const owner = await createUser(tx);
  const customer = randomUUID();
  await tx.query(
    `insert into public.customer (id, owner_id, name, updated_at) values ($1, $2, 'Clienta', '2026-01-01')`,
    [customer, owner],
  );
  if (debt > 0) {
    await tx.query(
      `insert into public.copy (id, owner_id, title_id, number, status, customer_id, agreed_price, sold_at,
                                public_price_snapshot, colportor_price_snapshot)
       values ($1, $2, $3, 0, 'sold', $4, $5, now(), 75000, 37500)`,
      [randomUUID(), owner, TITLE, customer, debt],
    );
  }
  if (paid > 0) {
    const today = await day(tx, 0);
    await tx.query(
      `insert into public.payment (id, owner_id, customer_id, kind, status, paid_amount, paid_at, method)
       values ($1, $2, $3, 'extra', 'collected', $4, $5, 'cash')`,
      [randomUUID(), owner, customer, paid, today],
    );
  }
  return { owner, customer };
};

/** Programa abonos de `amounts` a 10, 20, 30… días de hoy (o en las fechas dadas). */
const schedule = async (tx: Tx, owner: string, customer: string, amounts: number[], offsets?: number[]) => {
  const ids: string[] = [];
  for (const [i, amount] of amounts.entries()) {
    const due = await day(tx, offsets?.[i] ?? (i + 1) * 10);
    const id = randomUUID();
    await tx.query(
      `insert into public.payment (id, owner_id, customer_id, kind, status, agreed_amount, due_date,
                                   original_due_date, created_at)
       values ($1, $2, $3, 'scheduled', 'scheduled', $4, $5, $5, now() + make_interval(secs => $6))`,
      [id, owner, customer, amount, due, i],
    );
    ids.push(id);
  }
  return ids;
};

const resolve = (tx: Tx, user: string | null, customer: string, choice: unknown, trigger: string) => {
  const call = async (): Promise<Outcome> => {
    await tx.query('savepoint resolve');
    try {
      await tx.query('select public.resolve_schedule_excess($1, $2::jsonb, $3)', [
        customer,
        JSON.stringify(choice),
        trigger,
      ]);
      await tx.query('release savepoint resolve');
      return { ok: true };
    } catch (error) {
      await tx.query('rollback to savepoint resolve');
      const e = error as { message: string; code?: string };
      return { ok: false, code: e.message.split(':')[0]!, pgCode: e.code };
    }
  };
  return user === null ? asAnon(tx, call) : asUser(tx, user, call);
};

const paymentsOf = async (tx: Tx, customer: string) =>
  (
    await tx.query<{
      id: string;
      status: string;
      agreed_amount: number;
      cancel_reason: string | null;
      canceled_at: Date | null;
    }>(
      `select id, status, agreed_amount, cancel_reason, canceled_at from public.payment
       where customer_id = $1 and kind = 'scheduled' order by due_date, created_at`,
      [customer],
    )
  ).rows;

const eventsOf = async (tx: Tx, owner: string) =>
  (
    await tx.query<{ payment_id: string; type: string; data: Record<string, unknown> }>(
      `select payment_id, type, data from public.payment_event where owner_id = $1 order by seq`,
      [owner],
    )
  ).rows;

describe('resolve_schedule_excess (HU-ABO-07)', () => {
  it('CA-1 / AF-20: tras un abono extra, recortar desde el más próximo cancela los 2 más próximos con motivo overpaid', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx, { debt: 40_000, paid: 20_000 });
      const ids = await schedule(tx, owner, customer, [10_000, 10_000, 10_000, 10_000]);
      expect(
        await resolve(tx, owner, customer, { action: 'auto_trim', order: 'nearest' }, 'extra_payment'),
      ).toEqual({
        ok: true,
      });
      const rows = await paymentsOf(tx, customer);
      expect(rows.map((r) => [r.id, r.status, r.cancel_reason])).toEqual([
        [ids[0], 'canceled', 'overpaid'],
        [ids[1], 'canceled', 'overpaid'],
        [ids[2], 'scheduled', null],
        [ids[3], 'scheduled', null],
      ]);
      expect(rows[0]?.canceled_at).toBeInstanceOf(Date);
      expect(await eventsOf(tx, owner)).toEqual([
        {
          payment_id: ids[0],
          type: 'canceled',
          data: { trigger: 'extra_payment', reason: 'overpaid', agreedAmount: 10_000 },
        },
        {
          payment_id: ids[1],
          type: 'canceled',
          data: { trigger: 'extra_payment', reason: 'overpaid', agreedAmount: 10_000 },
        },
      ]);
    }));

  it('CA-2 / AF-05: tras una devolución, desde el más lejano con motivo book_returned', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx, { debt: 20_000 });
      const ids = await schedule(tx, owner, customer, [10_000, 10_000, 10_000, 10_000]);
      await resolve(tx, owner, customer, { action: 'auto_trim', order: 'farthest' }, 'return');
      expect((await paymentsOf(tx, customer)).map((r) => [r.id, r.status, r.cancel_reason])).toEqual([
        [ids[0], 'scheduled', null],
        [ids[1], 'scheduled', null],
        [ids[2], 'canceled', 'book_returned'],
        [ids[3], 'canceled', 'book_returned'],
      ]);
    }));

  it('CA-3: sobrante 15.000 → cancela uno completo y el siguiente baja de 10.000 a 5.000, con su payment_event', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx, { debt: 25_000 });
      const ids = await schedule(tx, owner, customer, [10_000, 10_000, 10_000, 10_000]);
      await resolve(tx, owner, customer, { action: 'auto_trim', order: 'nearest' }, 'review');
      expect((await paymentsOf(tx, customer)).map((r) => [r.status, r.agreed_amount])).toEqual([
        ['canceled', 10_000],
        ['scheduled', 5_000],
        ['scheduled', 10_000],
        ['scheduled', 10_000],
      ]);
      expect((await eventsOf(tx, owner)).at(-1)).toEqual({
        payment_id: ids[1],
        type: 'amount_reduced',
        data: { trigger: 'review', previousAmount: 10_000, newAmount: 5_000 },
      });
      // El contexto del evento no queda para otras escrituras de la transacción.
      expect((await tx.query(`select current_setting('colportor.payment_event', true) as v`)).rows[0].v).toBe(
        '',
      );
    }));

  it('CA-4 / AF-25 (ronda 38): saldo 0 con 2 programados → dejar como está se permite; recortar cancela los dos', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx, { debt: 30_000, paid: 30_000 });
      await schedule(tx, owner, customer, [10_000, 10_000]);
      expect(await resolve(tx, owner, customer, { action: 'leave' }, 'extra_payment')).toEqual({ ok: true });
      await resolve(tx, owner, customer, { action: 'auto_trim', order: 'nearest' }, 'extra_payment');
      expect((await paymentsOf(tx, customer)).map((r) => r.status)).toEqual(['canceled', 'canceled']);
    }));

  it('R5 (ronda 38): con saldo a favor también se puede dejar como está', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx, { debt: 30_000, paid: 40_000 });
      await schedule(tx, owner, customer, [10_000]);
      expect(await resolve(tx, owner, customer, { action: 'leave' }, 'review')).toEqual({ ok: true });
    }));

  it('CA-6: dejar como está con saldo 20.000 y programados 40.000 → nada cambia', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx, { debt: 20_000 });
      await schedule(tx, owner, customer, [10_000, 10_000, 10_000, 10_000]);
      const before = await paymentsOf(tx, customer);
      expect(await resolve(tx, owner, customer, { action: 'leave' }, 'review')).toEqual({ ok: true });
      expect(await paymentsOf(tx, customer)).toEqual(before);
      expect(await eventsOf(tx, owner)).toEqual([]);
      const { rows } = await tx.query(
        `select updated_at::date::text as d from public.customer where id = $1`,
        [customer],
      );
      expect(rows[0].d).toBe('2026-01-01');
    }));

  it('dejar como está sin sobrante → NO_EXCESS', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx, { debt: 30_000 });
      await schedule(tx, owner, customer, [10_000]);
      expect(await resolve(tx, owner, customer, { action: 'leave' }, 'review')).toMatchObject({
        code: 'NO_EXCESS',
      });
    }));

  it('CA-7: otro dispositivo cobró un programado entre la evaluación y el recorte → se recalcula sobre lo vigente', () =>
    inTransaction(async (tx) => {
      // Saldo 30.000 y 4 × 10.000: sobrante 10.000 al evaluar.
      const { owner, customer } = await setup(tx, { debt: 30_000 });
      const ids = await schedule(tx, owner, customer, [10_000, 10_000, 10_000, 10_000]);
      // Otro teléfono cobra el más próximo por 15.000: saldo 15.000, programado 30.000, sobrante 15.000.
      await tx.query(
        `update public.payment set status = 'collected', paid_amount = 15000, paid_at = public.today_bogota(),
                method = 'cash' where id = $1`,
        [ids[0]],
      );
      await resolve(tx, owner, customer, { action: 'auto_trim', order: 'nearest' }, 'review');
      expect((await paymentsOf(tx, customer)).map((r) => [r.status, r.agreed_amount])).toEqual([
        ['collected', 10_000],
        ['canceled', 10_000],
        ['scheduled', 5_000],
        ['scheduled', 10_000],
      ]);
    }));

  it('CA-7: si al aplicar ya no hay sobrante → CONFLICT y no cambia nada', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx, { debt: 30_000 });
      const ids = await schedule(tx, owner, customer, [10_000, 10_000, 10_000, 10_000]);
      // Otro teléfono canceló uno: ya no sobra nada.
      await tx.query(
        `update public.payment set status = 'canceled', canceled_at = now(), cancel_reason = 'manual' where id = $1`,
        [ids[3]],
      );
      const before = await paymentsOf(tx, customer);
      expect(
        await resolve(tx, owner, customer, { action: 'auto_trim', order: 'farthest' }, 'review'),
      ).toMatchObject({
        code: 'CONFLICT',
      });
      expect(
        await resolve(tx, owner, customer, { action: 'cancel_selected', paymentIds: [ids[0]] }, 'review'),
      ).toMatchObject({
        code: 'CONFLICT',
      });
      expect(await paymentsOf(tx, customer)).toEqual(before);
    }));

  it('R4: cancelar los que marque cancela solo esos, con el motivo del disparador; el sobrante que quede sigue', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx, { debt: 10_000 });
      const ids = await schedule(tx, owner, customer, [10_000, 10_000, 10_000, 10_000]);
      await resolve(
        tx,
        owner,
        customer,
        { action: 'cancel_selected', paymentIds: [ids[2], ids[2]] },
        'return',
      );
      expect((await paymentsOf(tx, customer)).map((r) => [r.status, r.cancel_reason])).toEqual([
        ['scheduled', null],
        ['scheduled', null],
        ['canceled', 'book_returned'],
        ['scheduled', null],
      ]);
      // Aún sobran 20.000: "Revisar" vuelve a dejar elegir.
      expect(await resolve(tx, owner, customer, { action: 'leave' }, 'review')).toEqual({ ok: true });
    }));

  it('R4: un abono marcado que ya no está por cobrar (o es de otro cliente) → CONFLICT sin cancelar ninguno', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx, { debt: 10_000 });
      const ids = await schedule(tx, owner, customer, [10_000, 10_000, 10_000]);
      const other = randomUUID();
      await tx.query(`insert into public.customer (id, owner_id, name) values ($1, $2, 'Otra')`, [
        other,
        owner,
      ]);
      const [foreign] = await schedule(tx, owner, other, [10_000]);
      expect(
        await resolve(
          tx,
          owner,
          customer,
          { action: 'cancel_selected', paymentIds: [ids[0], foreign] },
          'review',
        ),
      ).toMatchObject({ code: 'CONFLICT' });
      expect(
        await resolve(
          tx,
          owner,
          customer,
          { action: 'cancel_selected', paymentIds: [ids[0], randomUUID()] },
          'review',
        ),
      ).toMatchObject({ code: 'CONFLICT' });
      // Otro teléfono cobró el marcado (por 1.000: sigue habiendo sobrante).
      await tx.query(
        `update public.payment set status = 'collected', paid_amount = 1000, paid_at = public.today_bogota(),
                method = 'cash' where id = $1`,
        [ids[2]],
      );
      expect(
        await resolve(
          tx,
          owner,
          customer,
          { action: 'cancel_selected', paymentIds: [ids[0], ids[2]] },
          'review',
        ),
      ).toMatchObject({ code: 'CONFLICT' });
      expect((await paymentsOf(tx, customer)).map((r) => r.status)).toEqual([
        'scheduled',
        'scheduled',
        'collected',
      ]);
    }));

  it('OQ-30: con la misma fecha se recorta primero el más antiguo por creación', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx, { debt: 10_000 });
      const ids = await schedule(tx, owner, customer, [10_000, 10_000], [15, 15]);
      await resolve(tx, owner, customer, { action: 'auto_trim', order: 'farthest' }, 'review');
      const rows = await tx.query<{ id: string; status: string }>(
        `select id, status from public.payment where customer_id = $1`,
        [customer],
      );
      expect(Object.fromEntries(rows.rows.map((r) => [r.id, r.status]))).toEqual({
        [ids[0]!]: 'canceled',
        [ids[1]!]: 'scheduled',
      });
    }));

  it('BR-CUS-16: recortar o cancelar actualiza la "última modificación" del cliente', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx, { debt: 10_000 });
      await schedule(tx, owner, customer, [10_000, 10_000]);
      await resolve(tx, owner, customer, { action: 'auto_trim', order: 'nearest' }, 'review');
      const { rows } = await tx.query(
        `select updated_at > '2026-01-02' as changed from public.customer where id = $1`,
        [customer],
      );
      expect(rows[0].changed).toBe(true);
    }));

  it.each(EXCESS_TRIGGER_LIST)(
    'paridad con el dominio: el disparador %s cancela con su motivo',
    (trigger: ExcessTrigger) =>
      inTransaction(async (tx) => {
        const { owner, customer } = await setup(tx, { debt: 0 });
        const [id] = await schedule(tx, owner, customer, [10_000]);
        await resolve(tx, owner, customer, { action: 'cancel_selected', paymentIds: [id] }, trigger);
        expect((await paymentsOf(tx, customer))[0]?.cancel_reason).toBe(
          EXCESS_TRIGGERS[trigger].cancelReason,
        );
      }),
  );

  it.each([
    ['disparador desconocido', { action: 'leave' }, 'archive'],
    ['opción que no es objeto', 'leave', 'review'],
    ['acción desconocida', { action: 'trim' }, 'review'],
    ['orden inválido', { action: 'auto_trim', order: 'random' }, 'review'],
    ['sin paymentIds', { action: 'cancel_selected' }, 'review'],
    ['paymentIds vacío', { action: 'cancel_selected', paymentIds: [] }, 'review'],
    ['paymentId que no es UUID', { action: 'cancel_selected', paymentIds: ['uno'] }, 'review'],
  ])('VALIDATION: %s', (_, choice, trigger) =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx, { debt: 10_000 });
      await schedule(tx, owner, customer, [20_000]);
      expect(await resolve(tx, owner, customer, choice, trigger)).toMatchObject({ code: 'VALIDATION' });
    }),
  );
});

describe('resolve_schedule_excess: seguridad', () => {
  it('A/B: B no puede resolver el cliente de A (NOT_FOUND) y nada cambia', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx, { debt: 10_000 });
      await schedule(tx, owner, customer, [10_000, 10_000]);
      const intruder = await createUser(tx);
      expect(
        await resolve(tx, intruder, customer, { action: 'auto_trim', order: 'nearest' }, 'review'),
      ).toMatchObject({ code: 'NOT_FOUND' });
      expect((await paymentsOf(tx, customer)).every((r) => r.status === 'scheduled')).toBe(true);
    }));

  it('un cliente borrado no se resuelve (NOT_FOUND)', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx, { debt: 10_000 });
      await tx.query(`update public.customer set deleted_at = now() where id = $1`, [customer]);
      expect(await resolve(tx, owner, customer, { action: 'leave' }, 'review')).toMatchObject({
        code: 'NOT_FOUND',
      });
    }));

  it('un usuario inactivo → FORBIDDEN; anon no puede ejecutar la función', () =>
    inTransaction(async (tx) => {
      const { owner, customer } = await setup(tx, { debt: 10_000 });
      await tx.query(`update public.profile set is_active = false where id = $1`, [owner]);
      expect(await resolve(tx, owner, customer, { action: 'leave' }, 'review')).toMatchObject({
        code: 'FORBIDDEN',
      });
      expect(await resolve(tx, null, customer, { action: 'leave' }, 'review')).toMatchObject({
        pgCode: '42501',
      });
    }));
});
