import { describe, expect, it } from 'vitest';
import type { LeaderDeposit } from './deposit';
import { buildDepositView } from './deposit-draft';
import { validateReopenReason, type DepositEvent } from './deposit-reopen';
import { localDate } from './time';

describe('validateReopenReason (HU-DIN-07)', () => {
  it('R1 / CA-3: vacío o solo espacios → REASON_REQUIRED; si no, el motivo recortado', () => {
    for (const reason of [null, '', '   '])
      expect(validateReopenReason(reason)).toEqual({
        ok: false,
        error: expect.objectContaining({ code: 'REASON_REQUIRED' }),
      });
    expect(validateReopenReason('  Incluí por error el abono de Óscar Iván Mejía ')).toEqual({
      ok: true,
      value: 'Incluí por error el abono de Óscar Iván Mejía',
    });
  });
});

describe('historial en buildDepositView (HU-DIN-07)', () => {
  const deposit: LeaderDeposit = {
    id: 'd1',
    title: null,
    depositNumber: 4,
    depositDate: localDate('2026-10-25'),
    cashAmount: 380_000,
    transferAmount: 0,
    note: null,
    status: 'draft',
    confirmedAt: null,
  };

  it('CA-5: trae el historial tal cual (confirmado, reabierto con motivo, …); sin historial, lista vacía', () => {
    const history: DepositEvent[] = [
      { type: 'confirmed', reason: null, at: new Date('2026-10-25T20:00:00Z') },
      {
        type: 'reopened',
        reason: 'Incluí por error el abono de Óscar',
        at: new Date('2026-10-26T14:00:00Z'),
      },
    ];
    const reopened = buildDepositView({ deposit, payments: [], receipts: [], nextNumber: 5, history });
    expect(reopened.history).toEqual(history);
    // Reabierto: borrador que conserva su número y no se puede borrar.
    expect([reopened.displayTitle, reopened.can]).toEqual([
      'Abibono (4)',
      { edit: true, confirm: false, reopen: false, delete: false },
    ]);
    expect(buildDepositView({ deposit, payments: [], receipts: [], nextNumber: 5 }).history).toEqual([]);
  });
});
