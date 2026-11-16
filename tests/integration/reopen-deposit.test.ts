// HU-DIN-07 · Reabrir un Abibono contra Supabase local, por el camino de la app: reabrir, corregir y confirmar.
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
import type { DepositDraftInput } from '@/domain/deposit-draft';
import { localDate, type LocalDate } from '@/domain/time';
import { confirmDeposit, reopenDeposit } from '@/features/money/use-cases/confirm-deposit';
import {
  addDepositReceipt,
  loadDeposit,
  newDepositProposalFrom,
} from '@/features/money/use-cases/deposit-draft';
import { loadMoneySummaryData, moneySummaryFrom } from '@/features/money/use-cases/money-summary';
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
  const email = uniqueEmail('hu-din-07');
  owner = (await createUser(admin, { email, fullName: 'Reabrir Abibono', password })).userId;
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

const toDeliver = async () => moneySummaryFrom(await moneyData(), today).toDeliver.total;

const failure = (code: string) => ({ ok: false, error: expect.objectContaining({ code }) });

describe('reabrir un Abibono contra Supabase local (HU-DIN-07)', () => {
  it('CA-1 a CA-6: reabrir, desmarcar a Óscar y confirmar de nuevo', async () => {
    const [ana, oscar] = [randomUUID(), randomUUID()];
    await pool.query(
      `insert into public.customer (id, owner_id, name) values ($1, $3, 'Ana'), ($2, $3, 'Óscar Iván Mejía')`,
      [ana, oscar, owner],
    );
    // Cinco abonos por 380.000; el último es de Óscar.
    const payments: string[] = [];
    for (const [customer, amount] of [
      [ana, 100_000],
      [ana, 80_000],
      [ana, 70_000],
      [ana, 60_000],
      [oscar, 70_000],
    ] as const) {
      const id = randomUUID();
      await pool.query(
        `insert into public.payment (id, owner_id, customer_id, kind, status, paid_at, paid_amount, method)
         values ($1, $2, $3, 'extra', 'collected', public.today_bogota(), $4, 'cash')`,
        [id, owner, customer, amount],
      );
      payments.push(id);
    }
    const oscarPayment = payments[4]!;

    // «Abibono (1)» confirmado con los 5 abonos.
    const proposal = newDepositProposalFrom(await moneyData(), randomUUID(), today);
    const receipt = await addDepositReceipt(deps(), {
      depositId: proposal.depositId,
      photoId: randomUUID(),
      file: photoLikeJpeg(800, 600),
    });
    if (!receipt.ok || !receipt.value.staged) throw new Error('debía quedar pendiente');
    const base: DepositDraftInput = {
      depositId: proposal.depositId,
      title: null,
      depositDate: today,
      paymentIds: payments,
      cash: 380_000,
      transfer: 0,
      note: null,
      stagedReceipts: [receipt.value.staged],
    };
    expect(await confirmDeposit(deps(), base)).toMatchObject({ ok: true });
    expect(await toDeliver()).toBe(0);

    // CA-3: motivo vacío → REASON_REQUIRED y nada cambia.
    expect(await reopenDeposit(deps(), proposal.depositId, '   ')).toEqual(failure('REASON_REQUIRED'));

    // CA-1: reabrir → borrador, abonos cobrados que vuelven a contar en "Por entregar".
    const reason = 'Incluí por error el abono de Óscar Iván Mejía';
    expect(await reopenDeposit(deps(), proposal.depositId, reason)).toEqual({ ok: true, value: undefined });
    const reopened = await loadDeposit(deps(), proposal.depositId);
    if (!reopened.ok) throw new Error(reopened.error.code);
    expect(reopened.value).toMatchObject({
      status: 'draft',
      depositNumber: 1,
      displayTitle: 'Abibono (1)',
      can: { edit: true, reopen: false, delete: false },
    });
    expect(reopened.value.payments).toHaveLength(5);
    expect(reopened.value.receipts).toHaveLength(1);
    expect(await toDeliver()).toBe(380_000);

    // CA-4 y reabrir dos veces: un borrador no se reabre.
    expect(await reopenDeposit(deps(), proposal.depositId, 'otra vez')).toEqual(
      failure('DEPOSIT_NOT_CONFIRMED'),
    );

    // CA-6: mientras tanto se confirma una donación: toma el número 2.
    const donation = randomUUID();
    const donationReceipt = await addDepositReceipt(deps(), {
      depositId: donation,
      photoId: randomUUID(),
      file: photoLikeJpeg(800, 600),
    });
    if (!donationReceipt.ok || !donationReceipt.value.staged) throw new Error('debía quedar pendiente');
    expect(
      await confirmDeposit(deps(), {
        ...base,
        depositId: donation,
        paymentIds: [],
        cash: 10_000,
        note: 'Donación',
        stagedReceipts: [donationReceipt.value.staged],
      }),
    ).toMatchObject({ ok: true });

    // CA-2: se desmarca el de Óscar y se confirma de nuevo con la foto que ya tenía y nota por la diferencia.
    expect(
      await confirmDeposit(deps(), {
        ...base,
        paymentIds: payments.slice(0, 4),
        note: 'Sobran $70.000: el abono de Óscar va en otro Abibono',
        stagedReceipts: [],
      }),
    ).toMatchObject({ ok: true });
    const final = await loadDeposit(deps(), proposal.depositId);
    if (!final.ok) throw new Error(final.error.code);
    expect(final.value).toMatchObject({ status: 'confirmed', depositNumber: 1, displayTitle: 'Abibono (1)' });
    expect(final.value.payments.map((p) => p.paymentId)).not.toContain(oscarPayment);
    const oscarRow = await pool.query('select status, leader_deposit_id from public.payment where id = $1', [
      oscarPayment,
    ]);
    expect(oscarRow.rows[0]).toEqual({ status: 'collected', leader_deposit_id: null });
    expect(await toDeliver()).toBe(70_000);

    // CA-5: historial en orden: confirmado, reabierto (con el motivo), confirmado.
    expect(final.value.history.map((e) => [e.type, e.reason])).toEqual([
      ['confirmed', null],
      ['reopened', reason],
      ['confirmed', null],
    ]);
    // CA-6: el siguiente nuevo se muestra como «Abibono (3)».
    expect(newDepositProposalFrom(await moneyData(), randomUUID(), today).displayTitle).toBe('Abibono (3)');
  });
});
