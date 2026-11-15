// HU-DIN-05 · Confirmar un Abibono contra Supabase local (base y Storage), por el camino de la app.
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createSupabaseAuthRepository } from '@/adapters/supabase/auth-repository';
import type { AppSupabaseClient } from '@/adapters/supabase/client';
import { createSupabaseCustomerRepository } from '@/adapters/supabase/customer-repository';
import { createSupabaseMoneyRepository } from '@/adapters/supabase/money-repository';
import { createSupabasePhotoRepository } from '@/adapters/supabase/photo-repository';
import { createSupabaseStorageRepository, USER_PHOTOS_BUCKET } from '@/adapters/supabase/storage-repository';
import { createSupabaseTitleRepository } from '@/adapters/supabase/title-repository';
import type { DepositDraftInput, StagedReceipt } from '@/domain/deposit-draft';
import { DEFAULT_DEPOSITS_LIST_PARAMS } from '@/domain/deposits-list';
import { DEFAULT_PAYMENTS_LIST_PARAMS } from '@/domain/payments-list';
import { localDate, type LocalDate } from '@/domain/time';
import { confirmDeposit, updateDepositNote } from '@/features/money/use-cases/confirm-deposit';
import {
  addDepositReceipt,
  deleteDepositReceipt,
  loadDeposit,
  newDepositProposalFrom,
  saveDepositDraft,
} from '@/features/money/use-cases/deposit-draft';
import { depositsListFrom } from '@/features/money/use-cases/deposits-list';
import { loadMoneySummaryData } from '@/features/money/use-cases/money-summary';
import { paymentsListFrom } from '@/features/money/use-cases/payments-list';
import { createUser } from '../../scripts/lib/create-user';
import { fakeConnectivity } from '../support/fake-connectivity';
import { napiImageCodec, photoLikeJpeg } from '../support/napi-image-codec';
import { adminClient, anonClient, uniqueEmail } from './helpers/local-supabase';

const DB_URL = process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const pool = new pg.Pool({ connectionString: DB_URL, max: 2 });
const admin = adminClient();
const password = 'clave-local-123';
let owner: string;
let client: AppSupabaseClient;
let today: LocalDate;

beforeAll(async () => {
  const email = uniqueEmail('hu-din-05');
  owner = (await createUser(admin, { email, fullName: 'Confirmar Abibono', password })).userId;
  client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  today = localDate((await pool.query<{ d: string }>('select public.today_bogota()::text as d')).rows[0]!.d);
});

afterAll(async () => {
  const { data } = await admin.storage.from(USER_PHOTOS_BUCKET).list(`${owner}/deposit_receipt`);
  const paths = (data ?? []).map((f) => `${owner}/deposit_receipt/${f.name}`);
  if (paths.length > 0) await admin.storage.from(USER_PHOTOS_BUCKET).remove(paths);
  await pool.query(
    `begin; set local session_replication_role = replica;
     delete from public.photo where owner_id = '${owner}';
     delete from public.payment_event where owner_id = '${owner}';
     delete from public.payment where owner_id = '${owner}';
     delete from public.leader_deposit_event where owner_id = '${owner}';
     delete from public.leader_deposit where owner_id = '${owner}';
     delete from public.leader_deposit_counter where owner_id = '${owner}'; commit;`,
  );
  await pool.query('delete from public.customer where owner_id = $1', [owner]);
  await admin.auth.admin.deleteUser(owner);
  await pool.end();
});

const deps = () => ({
  connectivity: fakeConnectivity(),
  auth: createSupabaseAuthRepository(() => client),
  imageCodec: napiImageCodec,
  storage: createSupabaseStorageRepository(() => client),
  photos: createSupabasePhotoRepository(() => client),
  money: createSupabaseMoneyRepository(() => client),
  customers: createSupabaseCustomerRepository(() => client),
  titles: createSupabaseTitleRepository(() => client),
});

const moneyData = async () => {
  const data = await loadMoneySummaryData(deps());
  if (!data.ok) throw new Error(data.error.code);
  return data.value;
};

/** Sube un recibo a un Abibono que aún no existe: queda pendiente para enviarlo al confirmar. */
const stagedReceipt = async (depositId: string): Promise<StagedReceipt> => {
  const r = await addDepositReceipt(deps(), {
    depositId,
    photoId: randomUUID(),
    file: photoLikeJpeg(800, 600),
  });
  if (!r.ok || !r.value.staged) throw new Error('debía quedar pendiente');
  return r.value.staged;
};

const input = (depositId: string, over: Partial<DepositDraftInput> = {}): DepositDraftInput => ({
  depositId,
  title: null,
  depositDate: today,
  paymentIds: [],
  cash: 0,
  transfer: 0,
  note: null,
  stagedReceipts: [],
  ...over,
});

const depositCount = async () =>
  (
    await pool.query<{ n: number }>(
      'select count(*)::int as n from public.leader_deposit where owner_id = $1',
      [owner],
    )
  ).rows[0]!.n;

const failure = (code: string) => ({ ok: false, error: expect.objectContaining({ code }) });

describe('confirmar un Abibono contra Supabase local (HU-DIN-05)', () => {
  it('CA-1, CA-2, CA-10, CA-7, CA-3 y CA-6 desde la propuesta', async () => {
    const customer = randomUUID();
    await pool.query(`insert into public.customer (id, owner_id, name) values ($1, $2, 'Ana')`, [
      customer,
      owner,
    ]);
    for (const [amount, method] of [
      [60_000, 'cash'],
      [40_000, 'cash'],
    ] as const)
      await pool.query(
        `insert into public.payment (id, owner_id, customer_id, kind, status, paid_at, paid_amount, method)
         values ($1, $2, $3, 'extra', 'collected', public.today_bogota(), $4, $5)`,
        [randomUUID(), owner, customer, amount, method],
      );
    const proposal = newDepositProposalFrom(await moneyData(), randomUUID(), today);
    expect(proposal.expected).toBe(100_000);
    const base = input(proposal.depositId, { paymentIds: [...proposal.selectedIds], cash: 95_000 });

    // CA-1: entregado 95.000 sin nota → NOTE_REQUIRED (también falta el recibo); no se crea nada.
    expect(await confirmDeposit(deps(), base)).toEqual({
      ok: false,
      error: expect.objectContaining({
        code: 'NOTE_REQUIRED',
        details: { blockers: ['NOTE_REQUIRED', 'NO_RECEIPT'] },
      }),
    });
    // CA-2: con nota y sin foto → NO_RECEIPT.
    const withNote = { ...base, note: 'Me faltaron $5.000' };
    expect(await confirmDeposit(deps(), withNote)).toEqual(failure('NO_RECEIPT'));
    expect(await depositCount()).toBe(0);

    // CA-7 / CA-3 / CA-10: con la foto ya subida, se confirma directamente: un solo Abibono, número 1.
    const receipt = await stagedReceipt(proposal.depositId);
    expect(await confirmDeposit(deps(), { ...withNote, stagedReceipts: [receipt] })).toEqual({
      ok: true,
      value: { depositId: proposal.depositId },
    });
    expect(await depositCount()).toBe(1);
    const view = await loadDeposit(deps(), proposal.depositId);
    if (!view.ok) throw new Error(view.error.code);
    expect(view.value).toMatchObject({
      status: 'confirmed',
      depositNumber: 1,
      displayTitle: 'Abibono (1)',
      summary: { total: 95_000, expected: 100_000, difference: -5_000 },
      can: { edit: false, confirm: false, reopen: true, delete: false },
    });
    // Los abonos quedan entregados, dejan de estar "por entregar" y están bloqueados.
    const list = paymentsListFrom(await moneyData(), DEFAULT_PAYMENTS_LIST_PARAMS, today);
    expect([list.counts.toDeliver, list.counts.delivered]).toEqual([0, 2]);
    await expect(
      pool.query('update public.payment set paid_amount = 1 where id = $1', [proposal.selectedIds[0]]),
    ).rejects.toThrow(/PAYMENT_LOCKED/);

    // Confirmar dos veces → DEPOSIT_NOT_DRAFT sin efectos.
    expect(await confirmDeposit(deps(), { ...withNote, stagedReceipts: [receipt] })).toEqual(
      failure('DEPOSIT_NOT_DRAFT'),
    );

    // CA-6: en el confirmado se agrega otra foto y se cambia la nota; no se borra un recibo ni se vacía la nota.
    const second = randomUUID();
    expect(
      await addDepositReceipt(deps(), {
        depositId: proposal.depositId,
        photoId: second,
        file: photoLikeJpeg(800, 600),
      }),
    ).toEqual({ ok: true, value: { staged: null } });
    expect(
      await updateDepositNote(deps(), proposal.depositId, 'Me faltaron $5.000; los entrego el lunes'),
    ).toEqual({
      ok: true,
      value: undefined,
    });
    expect(await updateDepositNote(deps(), proposal.depositId, '  ')).toEqual(failure('NOTE_REQUIRED'));
    expect(await deleteDepositReceipt(deps(), second)).toEqual(failure('RECEIPT_LOCKED'));
    const after = await loadDeposit(deps(), proposal.depositId);
    expect(after.ok && [after.value.note, after.value.receipts.length]).toEqual([
      'Me faltaron $5.000; los entrego el lunes',
      2,
    ]);
  });

  it('CA-4 y CA-5: una donación sin abonos se confirma; con total 0, TOTAL_ZERO', async () => {
    const id = randomUUID();
    expect(await confirmDeposit(deps(), input(id, { note: 'Nada' }))).toEqual(failure('TOTAL_ZERO'));
    const receipt = await stagedReceipt(id);
    expect(
      await confirmDeposit(
        deps(),
        input(id, { cash: 20_000, note: 'Donación de $20.000', stagedReceipts: [receipt] }),
      ),
    ).toEqual({ ok: true, value: { depositId: id } });
    const view = await loadDeposit(deps(), id);
    expect(view.ok && view.value).toMatchObject({
      depositNumber: 2,
      summary: { total: 20_000, expected: 0, difference: 20_000 },
    });
  });

  it('CA-9 y CA-8: el título propio se conserva; dos borradores «Abibono (n)» toman números en orden de confirmación', async () => {
    // CA-9: «Entrega de Navidad» se confirma como el tercero; el siguiente nuevo se muestra como «Abibono (4)».
    const christmas = randomUUID();
    await saveDepositDraft(
      deps(),
      input(christmas, { title: 'Entrega de Navidad', cash: 10_000, note: 'x' }),
    );
    expect(
      await addDepositReceipt(deps(), {
        depositId: christmas,
        photoId: randomUUID(),
        file: photoLikeJpeg(800, 600),
      }),
    ).toEqual({ ok: true, value: { staged: null } });
    expect(
      await confirmDeposit(
        deps(),
        input(christmas, { title: 'Entrega de Navidad', cash: 10_000, note: 'x' }),
      ),
    ).toMatchObject({ ok: true });
    const named = await loadDeposit(deps(), christmas);
    expect(named.ok && [named.value.displayTitle, named.value.depositNumber]).toEqual([
      'Entrega de Navidad',
      3,
    ]);
    expect(newDepositProposalFrom(await moneyData(), randomUUID(), today).displayTitle).toBe('Abibono (4)');

    // CA-8: A y B sin título se muestran ambos como «Abibono (4)»; se confirma B y después A.
    const [a, b] = [randomUUID(), randomUUID()];
    for (const id of [a, b]) await saveDepositDraft(deps(), input(id, { cash: 1_000, note: 'x' }));
    const drafts = depositsListFrom(await moneyData(), DEFAULT_DEPOSITS_LIST_PARAMS).rows.filter(
      (r) => r.status === 'draft',
    );
    expect(drafts.map((r) => r.title)).toEqual(['Abibono (4)', 'Abibono (4)']);
    for (const id of [b, a]) {
      // Ya son borradores: el recibo crea su fila de inmediato.
      await addDepositReceipt(deps(), {
        depositId: id,
        photoId: randomUUID(),
        file: photoLikeJpeg(800, 600),
      });
      expect(await confirmDeposit(deps(), input(id, { cash: 1_000, note: 'x' }))).toMatchObject({ ok: true });
    }
    const titles = depositsListFrom(await moneyData(), DEFAULT_DEPOSITS_LIST_PARAMS).rows;
    expect(titles.find((r) => r.depositId === b)!.title).toBe('Abibono (4)');
    expect(titles.find((r) => r.depositId === a)!.title).toBe('Abibono (5)');
  });

  it('R6: dos confirmaciones simultáneas obtienen números distintos y consecutivos', async () => {
    const ids = [randomUUID(), randomUUID()];
    const inputs = await Promise.all(
      ids.map(async (id) => input(id, { cash: 1_000, note: 'x', stagedReceipts: [await stagedReceipt(id)] })),
    );
    const results = await Promise.all(inputs.map((i) => confirmDeposit(deps(), i)));
    expect(results.every((r) => r.ok)).toBe(true);
    const { rows } = await pool.query<{ deposit_number: number }>(
      'select deposit_number from public.leader_deposit where id = any($1) order by deposit_number',
      [ids],
    );
    expect(rows.map((r) => r.deposit_number)).toEqual([6, 7]);
  });
});
