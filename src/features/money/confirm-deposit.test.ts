import { describe, expect, it, vi } from 'vitest';
import { appError } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import { fakeConnectivity } from '../../../tests/support/fake-connectivity';
import { fakeMoneyRepository } from '../../../tests/support/fake-repositories';
import { confirmDeposit, reopenDeposit, updateDepositNote } from './use-cases/confirm-deposit';

const input = {
  depositId: 'd1',
  title: ' ',
  depositDate: '2026-11-05',
  paymentIds: ['p1'],
  cash: 95_000,
  transfer: 0,
  note: ' Me faltaron $5.000 ',
  stagedReceipts: [],
};

describe('confirmDeposit (HU-DIN-05)', () => {
  it('valida, normaliza y confirma; los bloqueos de la base pasan tal cual', async () => {
    const money = fakeMoneyRepository({ confirmDeposit: vi.fn(async () => ok({ depositId: 'd1' })) });
    expect(await confirmDeposit({ money, connectivity: fakeConnectivity(true) }, input)).toEqual(
      ok({ depositId: 'd1' }),
    );
    expect(money.confirmDeposit).toHaveBeenCalledWith(
      expect.objectContaining({ title: null, note: 'Me faltaron $5.000' }),
    );

    const blocked = err(appError('NOTE_REQUIRED', { blockers: ['NOTE_REQUIRED', 'NO_RECEIPT'] }));
    vi.mocked(money.confirmDeposit).mockResolvedValueOnce(blocked);
    expect(await confirmDeposit({ money, connectivity: fakeConnectivity(true) }, input)).toEqual(blocked);
  });

  it('montos inválidos → VALIDATION; sin conexión → OFFLINE; ninguno llega a la base', async () => {
    const money = fakeMoneyRepository();
    expect(
      await confirmDeposit({ money, connectivity: fakeConnectivity(true) }, { ...input, cash: -5 }),
    ).toEqual(err(appError('VALIDATION', { field: 'cash' })));
    expect(await confirmDeposit({ money, connectivity: fakeConnectivity(false) }, input)).toEqual(
      err(appError('OFFLINE')),
    );
    expect(money.confirmDeposit).not.toHaveBeenCalled();
  });
});

describe('updateDepositNote (HU-DIN-05)', () => {
  it('recorta la nota; vacía o null = sin nota; NOTE_REQUIRED pasa tal cual', async () => {
    const money = fakeMoneyRepository({ updateDepositNote: vi.fn(async () => ok(undefined)) });
    const deps = { money, connectivity: fakeConnectivity(true) };
    expect(await updateDepositNote(deps, 'd1', '  Me faltaron $5.000 ')).toEqual(ok(undefined));
    await updateDepositNote(deps, 'd1', '   ');
    await updateDepositNote(deps, 'd1', null);
    expect(vi.mocked(money.updateDepositNote).mock.calls).toEqual([
      ['d1', 'Me faltaron $5.000'],
      ['d1', null],
      ['d1', null],
    ]);
    vi.mocked(money.updateDepositNote).mockResolvedValueOnce(err(appError('NOTE_REQUIRED')));
    expect(await updateDepositNote(deps, 'd1', '')).toEqual(err(appError('NOTE_REQUIRED')));
    expect(await updateDepositNote({ money, connectivity: fakeConnectivity(false) }, 'd1', 'x')).toEqual(
      err(appError('OFFLINE')),
    );
  });
});

describe('reopenDeposit (HU-DIN-07)', () => {
  it('valida el motivo antes de ir a la base; los errores de la base pasan tal cual', async () => {
    const money = fakeMoneyRepository({ reopenDeposit: vi.fn(async () => ok(undefined)) });
    const deps = { money, connectivity: fakeConnectivity(true) };
    expect(await reopenDeposit(deps, 'd1', '  Incluí un abono de otro cliente ')).toEqual(ok(undefined));
    expect(money.reopenDeposit).toHaveBeenCalledWith('d1', 'Incluí un abono de otro cliente');

    expect(await reopenDeposit(deps, 'd1', '   ')).toEqual(err(appError('REASON_REQUIRED')));
    expect(money.reopenDeposit).toHaveBeenCalledTimes(1);

    vi.mocked(money.reopenDeposit).mockResolvedValueOnce(err(appError('DEPOSIT_NOT_CONFIRMED')));
    expect(await reopenDeposit(deps, 'd1', 'otra vez')).toEqual(err(appError('DEPOSIT_NOT_CONFIRMED')));
    expect(await reopenDeposit({ money, connectivity: fakeConnectivity(false) }, 'd1', 'x')).toEqual(
      err(appError('OFFLINE')),
    );
  });
});
