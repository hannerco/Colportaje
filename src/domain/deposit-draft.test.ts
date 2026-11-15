import { describe, expect, it } from 'vitest';
import type { LeaderDeposit } from './deposit';
import {
  buildDepositView,
  buildNewDepositProposal,
  recalcProposal,
  toDepositPayment,
  validateDepositDraft,
  type DepositDraftInput,
  type DepositPayment,
} from './deposit-draft';
import type { ListPayment } from './payments-list';
import { localDate } from './time';

const TODAY = localDate('2026-11-05');

const collected = (
  id: string,
  paidAmount: number,
  method: 'cash' | 'transfer',
  over: Partial<ListPayment> = {},
): ListPayment => ({
  id,
  customerId: 'ana',
  kind: 'extra',
  status: 'collected',
  originalDueDate: null,
  dueDate: null,
  paidAt: localDate('2026-11-01'),
  agreedAmount: null,
  paidAmount,
  method,
  canceledAt: null,
  cancelReason: null,
  createdAt: new Date('2026-11-01T15:00:00Z'),
  depositId: null,
  ...over,
});

const customers = [
  { id: 'ana', name: 'Ana' },
  { id: 'beto', name: 'Beto' },
];

describe('recalcProposal (HU-DIN-04)', () => {
  const five = [
    { paymentId: 'a', paidAmount: 40_000, method: 'cash' as const },
    { paymentId: 'b', paidAmount: 60_000, method: 'transfer' as const },
    { paymentId: 'c', paidAmount: 85_000, method: 'cash' as const },
    { paymentId: 'd', paidAmount: 105_000, method: 'cash' as const },
    { paymentId: 'e', paidAmount: 45_000, method: 'transfer' as const },
  ];

  it('CA-1: efectivo 230.000, transferencia 105.000, esperado 335.000', () => {
    expect(recalcProposal(five)).toEqual({ cash: 230_000, transfer: 105_000, expected: 335_000 });
  });

  it('CA-2: al desmarcar el de 60.000 (T) → transferencia 45.000 y esperado 275.000', () => {
    expect(recalcProposal(five.filter((p) => p.paymentId !== 'b'))).toEqual({
      cash: 230_000,
      transfer: 45_000,
      expected: 275_000,
    });
  });

  it('sin marcados: todo en 0 (donación, BR-DEP-07)', () => {
    expect(recalcProposal([])).toEqual({ cash: 0, transfer: 0, expected: 0 });
  });
});

describe('buildNewDepositProposal (HU-DIN-04)', () => {
  it('CA-1 / R1: solo cobrados libres de clientes vivos, todos marcados, «Abibono (1)» y fecha de hoy', () => {
    const payments = [
      collected('p1', 40_000, 'cash', { paidAt: localDate('2026-10-20') }),
      collected('p2', 60_000, 'transfer', { paidAt: localDate('2026-11-03'), customerId: 'beto' }),
      collected('p3', 85_000, 'cash', { paidAt: localDate('2026-11-03') }),
      collected('p4', 105_000, 'cash', { paidAt: localDate('2026-10-28') }),
      collected('p5', 45_000, 'transfer', { paidAt: localDate('2026-11-04') }),
      // En otro borrador, entregado, por cobrar y de un cliente descartado: no entran.
      collected('p6', 50_000, 'cash', { depositId: 'otro-borrador' }),
      collected('p7', 70_000, 'cash', { status: 'delivered', depositId: 'conf' }),
      collected('p8', 0, 'cash', { status: 'scheduled', paidAt: null, paidAmount: null, method: null }),
      collected('p9', 10_000, 'cash', { customerId: 'descartado' }),
    ];
    const proposal = buildNewDepositProposal({
      depositId: 'nuevo',
      payments,
      customers,
      deposits: [{ depositNumber: null }],
      today: TODAY,
    });
    expect(proposal).toMatchObject({
      depositId: 'nuevo',
      title: null,
      displayTitle: 'Abibono (1)',
      depositDate: '2026-11-05',
      cash: 230_000,
      transfer: 105_000,
      expected: 335_000,
    });
    // Fecha real descendente; misma fecha: por cliente (Ana antes que Beto).
    expect(proposal.available.map((p) => [p.paymentId, p.customerName])).toEqual([
      ['p5', 'Ana'],
      ['p3', 'Ana'],
      ['p2', 'Beto'],
      ['p4', 'Ana'],
      ['p1', 'Ana'],
    ]);
    expect(proposal.selectedIds).toEqual(['p5', 'p3', 'p2', 'p4', 'p1']);
  });

  it('el nombre sugerido usa el siguiente número libre; mismo cliente y fecha: por id', () => {
    const proposal = buildNewDepositProposal({
      depositId: 'nuevo',
      payments: [collected('z', 1_000, 'cash'), collected('a', 2_000, 'cash')],
      customers,
      deposits: [{ depositNumber: 1 }, { depositNumber: 2 }, { depositNumber: null }],
      today: TODAY,
    });
    expect(proposal.displayTitle).toBe('Abibono (3)');
    expect(proposal.selectedIds).toEqual(['a', 'z']);
  });

  it('sin cobros libres: propuesta vacía', () => {
    expect(
      buildNewDepositProposal({ depositId: 'n', payments: [], customers, deposits: [], today: TODAY }),
    ).toMatchObject({ available: [], selectedIds: [], cash: 0, transfer: 0, expected: 0 });
  });
});

describe('toDepositPayment', () => {
  it('copia los datos del cobro; si faltaran (la base no lo permite) quedan neutros', () => {
    expect(toDepositPayment(collected('p', 5_000, 'transfer'), 'Ana')).toEqual({
      paymentId: 'p',
      customerName: 'Ana',
      paidAt: '2026-11-01',
      paidAmount: 5_000,
      method: 'transfer',
    });
    expect(toDepositPayment({ id: 'q', paidAt: null, paidAmount: null, method: null }, 'Beto')).toEqual({
      paymentId: 'q',
      customerName: 'Beto',
      paidAt: '',
      paidAmount: 0,
      method: 'cash',
    });
  });
});

describe('validateDepositDraft (R3, R4)', () => {
  const input: DepositDraftInput = {
    depositId: 'd1',
    title: '  Entrega de noviembre ',
    depositDate: '2026-11-05',
    paymentIds: ['p1', 'p2', 'p1'],
    cash: 231_000,
    transfer: 0,
    note: '   ',
    stagedReceipts: [],
  };

  it('normaliza título, nota y abonos repetidos', () => {
    expect(validateDepositDraft(input)).toEqual({
      ok: true,
      value: { ...input, title: 'Entrega de noviembre', note: null, paymentIds: ['p1', 'p2'] },
    });
    const auto = validateDepositDraft({ ...input, title: null, note: ' Me faltaron $5.000 ' });
    expect(auto.ok && [auto.value.title, auto.value.note]).toEqual([null, 'Me faltaron $5.000']);
  });

  it.each([
    [{ depositDate: '2026-02-30' }, 'depositDate'],
    [{ cash: -1 }, 'cash'],
    [{ cash: 1.5 }, 'cash'],
    [{ cash: 2_147_483_648 }, 'cash'],
    [{ transfer: Number.NaN }, 'transfer'],
  ])('rechaza %o → VALIDATION en %s', (over, field) => {
    expect(validateDepositDraft({ ...input, ...over })).toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'VALIDATION', details: { field } }),
    });
  });
});

describe('buildDepositView (HU-DIN-04)', () => {
  const deposit: LeaderDeposit = {
    id: 'd1',
    title: null,
    depositNumber: null,
    depositDate: TODAY,
    cashAmount: 231_000,
    transferAmount: 105_000,
    note: null,
    status: 'draft',
    confirmedAt: null,
  };
  const payments: DepositPayment[] = [
    {
      paymentId: 'a',
      customerName: 'Ana',
      paidAt: localDate('2026-10-20'),
      paidAmount: 46_000,
      method: 'cash',
    },
    {
      paymentId: 'b',
      customerName: 'Beto',
      paidAt: localDate('2026-11-02'),
      paidAmount: 105_000,
      method: 'transfer',
    },
    {
      paymentId: 'c',
      customerName: 'Ana',
      paidAt: localDate('2026-11-01'),
      paidAmount: 190_000,
      method: 'cash',
    },
  ];

  it('CA-4: lo escrito a mano (231.000) frente a lo calculado (236.000), con su cuadre y bloqueos', () => {
    const view = buildDepositView({ deposit, payments, receipts: [], nextNumber: 4 });
    expect(view).toMatchObject({
      displayTitle: 'Abibono (4)',
      cash: 231_000,
      transfer: 105_000,
      calculated: { cash: 236_000, transfer: 105_000 },
      summary: { total: 336_000, expected: 341_000, difference: -5_000 },
      blockers: ['NO_RECEIPT', 'NOTE_REQUIRED'],
      can: { edit: true, confirm: false, reopen: false, delete: true },
    });
    expect(view.payments.map((p) => p.paymentId)).toEqual(['b', 'c', 'a']);
  });

  it('un borrador listo se puede confirmar; uno reabierto (con número) no se borra; uno confirmado se reabre', () => {
    const ready = buildDepositView({
      deposit: { ...deposit, note: 'Me faltaron $5.000' },
      payments,
      receipts: [{ photoId: 'f1', thumbUrl: 'https://x/f1' }],
      nextNumber: 4,
    });
    expect(ready.can).toEqual({ edit: true, confirm: true, reopen: false, delete: true });

    const reopened = buildDepositView({
      deposit: { ...deposit, depositNumber: 2 },
      payments,
      receipts: [],
      nextNumber: 4,
    });
    expect([reopened.displayTitle, reopened.can.delete]).toEqual(['Abibono (2)', false]);

    const confirmed = buildDepositView({
      deposit: {
        ...deposit,
        title: 'Entrega de octubre',
        depositNumber: 3,
        status: 'confirmed',
        confirmedAt: new Date(),
      },
      payments,
      receipts: [],
      nextNumber: 4,
    });
    expect([confirmed.displayTitle, confirmed.can]).toEqual([
      'Entrega de octubre',
      { edit: false, confirm: false, reopen: true, delete: false },
    ]);
  });
});
