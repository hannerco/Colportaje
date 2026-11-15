// HU-DIN-04 · Nuevo Abibono precargado y borradores contra Supabase local (base y Storage), por el camino de la app.
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
import { recalcProposal } from '@/domain/deposit-draft';
import { localDate, type LocalDate } from '@/domain/time';
import {
  addDepositReceipt,
  deleteDepositDraft,
  deleteDepositReceipt,
  loadDeposit,
  newDepositProposalFrom,
  saveDepositDraft,
} from '@/features/money/use-cases/deposit-draft';
import { loadMoneySummaryData } from '@/features/money/use-cases/money-summary';
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
  const email = uniqueEmail('hu-din-04');
  owner = (await createUser(admin, { email, fullName: 'Nuevo Abibono', password })).userId;
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

const proposal = async () => {
  const data = await loadMoneySummaryData(deps());
  if (!data.ok) throw new Error(data.error.code);
  return newDepositProposalFrom(data.value, randomUUID(), today);
};

const depositCount = async () =>
  (
    await pool.query<{ n: number }>(
      'select count(*)::int as n from public.leader_deposit where owner_id = $1',
      [owner],
    )
  ).rows[0]!.n;

const linkedTo = async (depositId: string) =>
  (
    await pool.query<{ id: string; status: string }>(
      'select id, status from public.payment where leader_deposit_id = $1 order by id',
      [depositId],
    )
  ).rows;

const storedFiles = async () =>
  ((await admin.storage.from(USER_PHOTOS_BUCKET).list(`${owner}/deposit_receipt`)).data ?? []).map(
    (f) => f.name,
  );

describe('Nuevo Abibono y borradores contra Supabase local (HU-DIN-04)', () => {
  const ids: Record<string, string> = {};

  it('CA-1 a CA-6 por el camino de la app', async () => {
    const customer = randomUUID();
    await pool.query(`insert into public.customer (id, owner_id, name) values ($1, $2, 'Ana')`, [
      customer,
      owner,
    ]);
    const amounts: [string, number, 'cash' | 'transfer'][] = [
      ['e40', 40_000, 'cash'],
      ['t60', 60_000, 'transfer'],
      ['e85', 85_000, 'cash'],
      ['e105', 105_000, 'cash'],
      ['t45', 45_000, 'transfer'],
      ['e50', 50_000, 'cash'],
    ];
    for (const [key, amount, method] of amounts) {
      ids[key] = randomUUID();
      await pool.query(
        `insert into public.payment (id, owner_id, customer_id, kind, status, paid_at, paid_amount, method)
         values ($1, $2, $3, 'extra', 'collected', public.today_bogota(), $4, $5)`,
        [ids[key], owner, customer, amount, method],
      );
    }
    // El de 50.000 ya está en otro borrador.
    const other = randomUUID();
    const otherSaved = await saveDepositDraft(deps(), {
      depositId: other,
      title: null,
      depositDate: today,
      paymentIds: [ids.e50!],
      cash: 50_000,
      transfer: 0,
      note: null,
      stagedReceipts: [],
    });
    expect(otherSaved).toEqual({ ok: true, value: { depositId: other } });

    // CA-1: la propuesta trae los 5 libres marcados, «Abibono (1)», y no crea nada.
    const p = await proposal();
    expect(p).toMatchObject({
      displayTitle: 'Abibono (1)',
      depositDate: today,
      cash: 230_000,
      transfer: 105_000,
      expected: 335_000,
    });
    expect([...p.selectedIds].sort()).toEqual(
      [ids.e40, ids.t60, ids.e85, ids.e105, ids.t45].map(String).sort(),
    );
    expect(await depositCount()).toBe(1);

    // CA-2: desmarcar el de 60.000 (T).
    const selected = p.available.filter((x) => x.paymentId !== ids.t60);
    expect(recalcProposal(selected)).toEqual({ cash: 230_000, transfer: 45_000, expected: 275_000 });

    // R7: un recibo subido a la propuesta solo sube el archivo, sin filas.
    const staged = await addDepositReceipt(deps(), {
      depositId: p.depositId,
      photoId: randomUUID(),
      file: photoLikeJpeg(1600, 1200),
    });
    if (!staged.ok || !staged.value.staged) throw new Error('debía quedar pendiente');
    expect(await depositCount()).toBe(1);
    expect((await pool.query('select 1 from public.photo where owner_id = $1', [owner])).rowCount).toBe(0);

    // CA-3: guardar como borrador; CA-4: efectivo escrito a mano distinto de lo calculado.
    const saved = await saveDepositDraft(deps(), {
      depositId: p.depositId,
      title: null,
      depositDate: today,
      paymentIds: selected.map((x) => x.paymentId),
      cash: 225_000,
      transfer: 45_000,
      note: 'Me faltaron $5.000',
      stagedReceipts: [staged.value.staged],
    });
    expect(saved).toEqual({ ok: true, value: { depositId: p.depositId } });
    const linked = await linkedTo(p.depositId);
    expect(linked).toHaveLength(4);
    expect(linked.every((x) => x.status === 'collected')).toBe(true);

    const view = await loadDeposit(deps(), p.depositId);
    if (!view.ok) throw new Error(view.error.code);
    expect(view.value).toMatchObject({
      status: 'draft',
      displayTitle: 'Abibono (1)',
      cash: 225_000,
      transfer: 45_000,
      calculated: { cash: 230_000, transfer: 45_000 },
      summary: { total: 270_000, expected: 275_000, difference: -5_000 },
      blockers: [],
      can: { edit: true, confirm: true, reopen: false, delete: true },
    });
    expect(view.value.payments).toHaveLength(4);
    expect(view.value.receipts).toHaveLength(1);
    expect((await fetch(view.value.receipts[0]!.thumbUrl)).ok).toBe(true);

    // Con el Abibono ya guardado, el recibo crea su fila de inmediato; se puede borrar (lógico).
    const second = randomUUID();
    expect(
      await addDepositReceipt(deps(), {
        depositId: p.depositId,
        photoId: second,
        file: photoLikeJpeg(800, 600),
      }),
    ).toEqual({ ok: true, value: { staged: null } });
    expect(await deleteDepositReceipt(deps(), second)).toEqual({ ok: true, value: undefined });
    const afterDelete = await loadDeposit(deps(), p.depositId);
    expect(afterDelete.ok && afterDelete.value.receipts).toHaveLength(1);

    // CA-6: el de 50.000 está en otro Abibono → PAYMENT_NOT_AVAILABLE y nada cambia.
    const conflict = await saveDepositDraft(deps(), {
      depositId: p.depositId,
      title: 'Otro nombre',
      depositDate: today,
      paymentIds: [...selected.map((x) => x.paymentId), ids.e50!],
      cash: 1,
      transfer: 1,
      note: null,
      stagedReceipts: [],
    });
    expect(conflict).toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'PAYMENT_NOT_AVAILABLE', details: { paymentIds: [ids.e50] } }),
    });
    const unchanged = await loadDeposit(deps(), p.depositId);
    expect(unchanged.ok && [unchanged.value.title, unchanged.value.cash]).toEqual([null, 225_000]);
    expect(await linkedTo(p.depositId)).toEqual(linked);

    // CA-5: borrar el borrador → desaparece, sus abonos vuelven a la propuesta y sus fotos no existen.
    expect((await storedFiles()).length).toBe(4);
    expect(await deleteDepositDraft(deps(), p.depositId)).toEqual({ ok: true, value: undefined });
    expect(await loadDeposit(deps(), p.depositId)).toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'NOT_FOUND' }),
    });
    expect((await pool.query('select 1 from public.photo where owner_id = $1', [owner])).rowCount).toBe(0);
    expect(await storedFiles()).toEqual([]);
    const again = await proposal();
    expect(again.selectedIds).toHaveLength(5);
    expect(again.expected).toBe(335_000);
  });

  it('un Abibono confirmado: no se guarda como borrador ni se borra, y sus recibos no se borran', async () => {
    const id = randomUUID();
    const photo = randomUUID();
    expect(
      await saveDepositDraft(deps(), {
        depositId: id,
        title: 'Donación',
        depositDate: today,
        paymentIds: [],
        cash: 20_000,
        transfer: 0,
        note: 'Donación',
        stagedReceipts: [],
      }),
    ).toEqual({ ok: true, value: { depositId: id } });
    expect(
      await addDepositReceipt(deps(), { depositId: id, photoId: photo, file: photoLikeJpeg(800, 600) }),
    ).toEqual({ ok: true, value: { staged: null } });
    await pool.query(
      `update public.leader_deposit set status = 'confirmed', confirmed_at = now() where id = $1`,
      [id],
    );

    const input = {
      depositId: id,
      title: null,
      depositDate: today,
      paymentIds: [],
      cash: 1,
      transfer: 0,
      note: null,
      stagedReceipts: [],
    };
    expect(await saveDepositDraft(deps(), input)).toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'DEPOSIT_NOT_DRAFT' }),
    });
    expect(await deleteDepositDraft(deps(), id)).toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'DEPOSIT_NOT_DRAFT' }),
    });
    expect(await deleteDepositReceipt(deps(), photo)).toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'RECEIPT_LOCKED' }),
    });
    const view = await loadDeposit(deps(), id);
    expect(view.ok && view.value).toMatchObject({
      displayTitle: 'Donación',
      depositNumber: 1,
      can: { edit: false, confirm: false, reopen: true, delete: false },
    });
    // La siguiente propuesta ya sugiere «Abibono (2)».
    expect((await proposal()).displayTitle).toBe('Abibono (2)');
  });

  it('sin conexión, guardar y borrar devuelven OFFLINE sin tocar la base', async () => {
    const offline = { ...deps(), connectivity: fakeConnectivity(false) };
    const before = await depositCount();
    expect(
      await saveDepositDraft(offline, {
        depositId: randomUUID(),
        title: null,
        depositDate: today,
        paymentIds: [],
        cash: 0,
        transfer: 0,
        note: null,
        stagedReceipts: [],
      }),
    ).toEqual({ ok: false, error: expect.objectContaining({ code: 'OFFLINE' }) });
    expect(await deleteDepositDraft(offline, randomUUID())).toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'OFFLINE' }),
    });
    expect(await depositCount()).toBe(before);
  });
});
