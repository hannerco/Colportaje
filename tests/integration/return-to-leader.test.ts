// HU-INV-09 · Devolver al líder y deshacer contra Supabase local, por el mismo camino que la app.
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AppSupabaseClient } from '@/adapters/supabase/client';
import { createSupabaseCopyRepository } from '@/adapters/supabase/copy-repository';
import { createSupabaseCustomerRepository } from '@/adapters/supabase/customer-repository';
import { createSupabaseTitleRepository } from '@/adapters/supabase/title-repository';
import { returnSelectionSummary } from '@/domain/return-to-leader';
import { assignCopyToCustomer } from '@/features/customers/use-cases/customer-books';
import {
  loadReturnCandidatesData,
  returnCandidatesFrom,
  returnCopiesToLeader,
  undoReturnToLeader,
} from '@/features/inventory/use-cases/return-to-leader';
import { createUser } from '../../scripts/lib/create-user';
import { fakeConnectivity } from '../support/fake-connectivity';
import { adminClient, anonClient, uniqueEmail } from './helpers/local-supabase';

const DB_URL = process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const CULTURAL = '00000000-0000-4000-8000-000000000101'; // seed
const RELIGIOSO = '00000000-0000-4000-8000-000000000201'; // seed
const MINI = '00000000-0000-4000-8000-000000000301'; // seed
const NOTE = 'Fin de campaña, entregados en la oficina';
const pool = new pg.Pool({ connectionString: DB_URL, max: 2 });
const admin = adminClient();
const password = 'clave-local-123';
const users: { id: string; client: AppSupabaseClient }[] = [];

const newUser = async (label: string) => {
  const email = uniqueEmail(label);
  const { userId } = await createUser(admin, { email, fullName: label, password });
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  users.push({ id: userId, client });
};

beforeAll(async () => {
  await newUser('hu-inv-09-a');
  await newUser('hu-inv-09-b');
});

afterAll(async () => {
  for (const { id } of users) {
    await pool.query('delete from public.copy_event where owner_id = $1', [id]);
    await pool.query('delete from public.copy where owner_id = $1', [id]);
    await pool.query('delete from public.copy_counter where owner_id = $1', [id]);
    await pool.query('delete from public.customer where owner_id = $1', [id]);
    await admin.auth.admin.deleteUser(id);
  }
  await pool.end();
});

const a = () => users[0]!;
const deps = (client = a().client) => ({
  copies: createSupabaseCopyRepository(() => client),
  titles: createSupabaseTitleRepository(() => client),
  customers: createSupabaseCustomerRepository(() => client),
  connectivity: fakeConnectivity(),
  clock: { now: () => new Date() },
});

/** Un ejemplar en físico del título, recibido en `receivedAt` (el número lo asigna la base). */
const newCopy = async (titleId: string, receivedAt = '2026-10-01', owner = a().id) => {
  const id = randomUUID();
  await pool.query(
    `insert into public.copy (id, owner_id, title_id, number, public_price_snapshot, colportor_price_snapshot, received_at)
     values ($1, $2, $3, 0, $4, 1000, $5)`,
    [id, owner, titleId, titleId === MINI ? null : 50_000, receivedAt],
  );
  return { id };
};

const statusOf = async (ids: string[]) =>
  (await pool.query('select id, status from public.copy where id = any($1) order by id', [ids])).rows.map(
    (r) => r.status,
  );

const miniInStock = async () =>
  (
    await pool.query(
      `select count(*)::int as n from public.copy where owner_id = $1 and title_id = $2 and status = 'in_stock' and deleted_at is null`,
      [a().id, MINI],
    )
  ).rows[0].n;

describe('devolver al líder contra Supabase local (HU-INV-09)', () => {
  it('CA-1: tres libros (1 cultural, 2 religiosos) quedan devueltos; el resumen fue 3; eventos con nota y opId', async () => {
    const copies = [await newCopy(CULTURAL), await newCopy(RELIGIOSO), await newCopy(RELIGIOSO)];
    const ids = copies.map((c) => c.id);
    const data = await loadReturnCandidatesData(deps());
    if (!data.ok) throw new Error(data.error.code);
    expect(
      returnSelectionSummary({ copyIds: ids, minibookLines: [] }, returnCandidatesFrom(data.value)),
    ).toMatchObject({
      total: 3,
      byCategory: { cultural: 1, religious: 2, minibook: 0 },
    });

    const opId = randomUUID();
    const result = await returnCopiesToLeader(deps(), { opId, copyIds: ids, minibookLines: [], note: NOTE });
    expect(result.ok && [...result.value.returnedCopyIds].sort()).toEqual([...ids].sort());
    expect(await statusOf(ids)).toEqual(['returned_to_leader', 'returned_to_leader', 'returned_to_leader']);
    const events = await pool.query(
      `select note, data from public.copy_event where copy_id = any($1) and type = 'returned_to_leader'`,
      [ids],
    );
    expect(events.rows).toHaveLength(3);
    for (const e of events.rows) expect(e).toEqual({ note: NOTE, data: { opId } });
    // Ya no son candidatos.
    const after = await loadReturnCandidatesData(deps());
    const returned = new Set<string>(ids);
    expect(after.ok && returnCandidatesFrom(after.value).books.some((b) => returned.has(b.copyId))).toBe(
      false,
    );

    // R6: reintentar con el mismo opId devuelve los mismos ids y no devuelve más.
    const extra = await newCopy(CULTURAL);
    const retry = await returnCopiesToLeader(deps(), {
      opId,
      copyIds: [extra.id],
      minibookLines: [],
      note: NOTE,
    });
    expect(retry.ok && [...retry.value.returnedCopyIds].sort()).toEqual([...ids].sort());
    expect(await statusOf([extra.id])).toEqual(['in_stock']);
  });

  it('CA-2 / R3: de 24 minibooks devuelve los 2 de recibido más antiguo y quedan 22', async () => {
    const minis = [];
    for (let i = 0; i < 24; i++)
      minis.push(await newCopy(MINI, `2026-10-${String(24 - i).padStart(2, '0')}`));
    const before = await miniInStock();
    const result = await returnCopiesToLeader(deps(), {
      opId: randomUUID(),
      copyIds: [],
      minibookLines: [{ titleId: MINI, quantity: 2 }],
      note: NOTE,
    });
    // Los dos más antiguos: recibidos el 01/10 y el 02/10 (los últimos creados).
    const oldest = [minis[23]!.id, minis[22]!.id].sort();
    expect(result.ok && [...result.value.returnedCopyIds].sort()).toEqual(oldest);
    expect(await miniInStock()).toBe(before - 2);
  });

  it('R6: dos envíos simultáneos con el mismo opId devuelven los mismos ejemplares una sola vez', async () => {
    for (let i = 0; i < 4; i++) await newCopy(MINI, '2026-09-0' + (i + 1));
    const before = await miniInStock();
    const input = {
      opId: randomUUID(),
      copyIds: [],
      minibookLines: [{ titleId: MINI, quantity: 2 }],
      note: NOTE,
    };
    const [first, second] = await Promise.all([
      returnCopiesToLeader(deps(), input),
      returnCopiesToLeader(deps(), input),
    ]);
    expect(first.ok && second.ok).toBe(true);
    expect(first.ok && [...first.value.returnedCopyIds].sort()).toEqual(
      second.ok && [...second.value.returnedCopyIds].sort(),
    );
    expect(await miniInStock()).toBe(before - 2);
  });

  it('CA-3: sin nota → NOTE_REQUIRED y nada cambia; la base también la exige', async () => {
    const copy = await newCopy(CULTURAL);
    expect(
      await returnCopiesToLeader(deps(), {
        opId: randomUUID(),
        copyIds: [copy.id],
        minibookLines: [],
        note: '  ',
      }),
    ).toEqual({ ok: false, error: { code: 'NOTE_REQUIRED', retryable: false } });
    expect(
      await createSupabaseCopyRepository(() => a().client).returnToLeader({
        opId: randomUUID(),
        copyIds: [copy.id],
        minibookLines: [],
        note: '   ',
      }),
    ).toMatchObject({ ok: false, error: { code: 'NOTE_REQUIRED' } });
    expect(await statusOf([copy.id])).toEqual(['in_stock']);
  });

  it('CA-4 / R2: uno de la selección se vendió justo antes → COPY_NOT_IN_STOCK con su id y nada cambia', async () => {
    const [ok1, sold] = [await newCopy(CULTURAL), await newCopy(RELIGIOSO)];
    const customer = randomUUID();
    await pool.query('insert into public.customer (id, owner_id, name) values ($1, $2, $3)', [
      customer,
      a().id,
      'Natalia',
    ]);
    await assignCopyToCustomer(deps(), sold.id, customer);
    const minisBefore = await miniInStock();
    await newCopy(MINI);
    expect(
      await returnCopiesToLeader(deps(), {
        opId: randomUUID(),
        copyIds: [ok1.id, sold.id],
        minibookLines: [{ titleId: MINI, quantity: 1 }],
        note: NOTE,
      }),
    ).toEqual({
      ok: false,
      error: { code: 'COPY_NOT_IN_STOCK', retryable: false, details: { copyIds: [sold.id] } },
    });
    expect(await statusOf([ok1.id])).toEqual(['in_stock']);
    expect(await miniInStock()).toBe(minisBefore + 1);
  });

  it('CA-5 / R5: deshacer con nota vuelve a físico; el historial muestra ambos eventos con sus notas', async () => {
    const copy = await newCopy(RELIGIOSO);
    await returnCopiesToLeader(deps(), {
      opId: randomUUID(),
      copyIds: [copy.id],
      minibookLines: [],
      note: NOTE,
    });
    expect(await undoReturnToLeader(deps(), copy.id, 'Me equivoqué de libro')).toEqual({
      ok: true,
      value: undefined,
    });
    expect(await statusOf([copy.id])).toEqual(['in_stock']);
    const history = await deps().copies.getHistory(copy.id);
    expect(history.ok && history.value.slice(0, 2).map((e) => [e.type, e.note])).toEqual([
      ['undo_returned_to_leader', 'Me equivoqué de libro'],
      ['returned_to_leader', NOTE],
    ]);
    // Ya no está devuelto: deshacer otra vez no está disponible.
    expect(await undoReturnToLeader(deps(), copy.id, 'otra vez')).toMatchObject({
      ok: false,
      error: { code: 'UNDO_NOT_AVAILABLE' },
    });
  });

  it('CA-6: pedir más minibooks de los que hay → NOT_ENOUGH_STOCK con el título y nada cambia', async () => {
    const stock = await miniInStock();
    expect(
      await returnCopiesToLeader(deps(), {
        opId: randomUUID(),
        copyIds: [],
        minibookLines: [{ titleId: MINI, quantity: stock + 6 }],
        note: NOTE,
      }),
    ).toEqual({
      ok: false,
      error: { code: 'NOT_ENOUGH_STOCK', retryable: false, details: { titleId: MINI } },
    });
    expect(await miniInStock()).toBe(stock);
  });

  it('bordes: selección vacía, línea de un libro que no es minibook, ejemplar de otro usuario', async () => {
    expect(
      await createSupabaseCopyRepository(() => a().client).returnToLeader({
        opId: randomUUID(),
        copyIds: [],
        minibookLines: [],
        note: NOTE,
      }),
    ).toMatchObject({ ok: false, error: { code: 'SELECTION_EMPTY' } });
    expect(
      await returnCopiesToLeader(deps(), {
        opId: randomUUID(),
        copyIds: [],
        minibookLines: [{ titleId: CULTURAL, quantity: 1 }],
        note: NOTE,
      }),
    ).toMatchObject({ ok: false, error: { code: 'VALIDATION', details: { field: 'minibookLines' } } });
    const others = await newCopy(CULTURAL, '2026-10-01', users[1]!.id);
    expect(
      await returnCopiesToLeader(deps(), {
        opId: randomUUID(),
        copyIds: [others.id],
        minibookLines: [],
        note: NOTE,
      }),
    ).toMatchObject({ ok: false, error: { code: 'COPY_NOT_IN_STOCK', details: { copyIds: [others.id] } } });
    expect(await statusOf([others.id])).toEqual(['in_stock']);
  });
});
