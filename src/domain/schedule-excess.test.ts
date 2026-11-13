import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  EXCESS_TRIGGERS,
  evaluateScheduleExcess,
  scheduledForExcess,
  sortForTrim,
  trimPlan,
  type ExcessPayment,
} from './schedule-excess';
import { computeCustomerAccount } from './customer';
import { localDate } from './time';

const pay = (
  id: string,
  dueDate: string,
  agreedAmount = 10_000,
  createdAt = '2026-10-01T15:00:00Z',
): ExcessPayment => ({
  paymentId: id,
  dueDate: localDate(dueDate),
  agreedAmount,
  createdAt: new Date(createdAt),
});

/** 4 × 10.000 programados: 15/11, 30/11, 15/12 y 30/12. */
const FOUR = [
  pay('p3', '2026-12-15'),
  pay('p1', '2026-11-15'),
  pay('p4', '2026-12-30'),
  pay('p2', '2026-11-30'),
];

describe('schedule-excess: tabla de disparadores (BR-PAY-13, ADR-0033)', () => {
  it('cada disparador con su presentación, orden y motivo', () => {
    expect(EXCESS_TRIGGERS).toEqual({
      extra_payment: { presentation: 'modal', order: 'nearest', cancelReason: 'overpaid' },
      overpayment: { presentation: 'modal', order: 'nearest', cancelReason: 'overpaid' },
      return: { presentation: 'modal', order: 'farthest', cancelReason: 'book_returned' },
      price_decrease: { presentation: 'modal', order: 'farthest', cancelReason: 'manual' },
      edit_collected: { presentation: 'banner', order: 'nearest', cancelReason: 'overpaid' },
      delete_collected: { presentation: 'banner', order: 'nearest', cancelReason: 'manual' },
      form_edit: { presentation: 'banner', order: 'farthest', cancelReason: 'manual' },
      review: { presentation: 'modal', order: 'farthest', cancelReason: 'manual' },
    });
  });
});

describe('schedule-excess: evaluación (R1)', () => {
  it('CA-1 / AF-20: saldo 20.000 y 4 × 10.000 tras un abono extra → modal, sobrante 20.000, cancela los 2 más próximos', () => {
    const evaluation = evaluateScheduleExcess({ balance: 20_000 }, FOUR, 'extra_payment');
    expect(evaluation).toEqual({
      trigger: 'extra_payment',
      remaining: 20_000,
      scheduledTotal: 40_000,
      excess: 20_000,
      presentation: 'modal',
      suggestedOrder: 'nearest',
      cancelReason: 'overpaid',
      canLeaveAsIs: true,
      payments: [
        { paymentId: 'p1', dueDate: '2026-11-15', agreedAmount: 10_000 },
        { paymentId: 'p2', dueDate: '2026-11-30', agreedAmount: 10_000 },
        { paymentId: 'p3', dueDate: '2026-12-15', agreedAmount: 10_000 },
        { paymentId: 'p4', dueDate: '2026-12-30', agreedAmount: 10_000 },
      ],
      suggestedPlan: [
        { paymentId: 'p1', action: 'cancel' },
        { paymentId: 'p2', action: 'cancel' },
      ],
    });
  });

  it('CA-2 / AF-05: el mismo sobrante tras una devolución → cancela los 2 más lejanos con motivo book_returned', () => {
    const evaluation = evaluateScheduleExcess({ balance: 20_000 }, FOUR, 'return');
    expect(evaluation).toMatchObject({
      presentation: 'modal',
      suggestedOrder: 'farthest',
      cancelReason: 'book_returned',
      suggestedPlan: [
        { paymentId: 'p4', action: 'cancel' },
        { paymentId: 'p3', action: 'cancel' },
      ],
    });
  });

  it('CA-3: sobrante 15.000 con programados de 10.000 → cancela uno y el siguiente baja de 10.000 a 5.000', () => {
    expect(trimPlan(FOUR, 15_000, 'nearest')).toEqual([
      { paymentId: 'p1', action: 'cancel' },
      { paymentId: 'p2', action: 'reduce', newAmount: 5_000 },
    ]);
  });

  it('CA-4 / AF-25: saldo 0 con 2 programados → no se puede dejar como está y el recorte cancela los dos', () => {
    const evaluation = evaluateScheduleExcess({ balance: 0 }, FOUR.slice(0, 2), 'extra_payment');
    expect(evaluation?.canLeaveAsIs).toBe(false);
    expect(evaluation?.suggestedPlan).toEqual([
      { paymentId: 'p1', action: 'cancel' },
      { paymentId: 'p3', action: 'cancel' },
    ]);
  });

  it('R5: con saldo a favor tampoco se ofrece dejar como está; lo que falta pagar es 0', () => {
    const evaluation = evaluateScheduleExcess({ balance: -5_000 }, [pay('p1', '2026-11-15')], 'review');
    expect(evaluation).toMatchObject({ remaining: 0, excess: 10_000, canLeaveAsIs: false });
  });

  it('CA-5: saldo 30.000 y programados por 20.000 → no hay evaluación (lo sin programar no alerta)', () => {
    expect(evaluateScheduleExcess({ balance: 30_000 }, FOUR.slice(0, 2), 'form_edit')).toBeNull();
    expect(evaluateScheduleExcess({ balance: 20_000 }, FOUR.slice(0, 2), 'form_edit')).toBeNull();
    expect(evaluateScheduleExcess({ balance: 0 }, [], 'review')).toBeNull();
  });

  it('CA-6: dejar como está no cambia nada: la cuenta sigue con el aviso de sobrante (franja persistente)', () => {
    const account = computeCustomerAccount(
      {
        customer: { createdAt: new Date('2026-10-01T15:00:00Z') },
        soldCopies: [{ agreedPrice: 20_000, soldAt: new Date('2026-10-01T15:00:00Z') }],
        payments: FOUR.map((p) => ({
          status: 'scheduled' as const,
          agreedAmount: p.agreedAmount,
          paidAmount: null,
          dueDate: p.dueDate,
          paidAt: null,
        })),
      },
      localDate('2026-11-08'),
    );
    expect(account).toMatchObject({ balance: 20_000, scheduledTotal: 40_000, excess: 20_000 });
    expect(account.notices.excess).toBe(true);
    expect(evaluateScheduleExcess(account, FOUR, 'review')?.canLeaveAsIs).toBe(true);
  });

  it('CA-8 / OQ-36: un cobro borrado que deja sobrante → franja, orden más próximo, motivo manual', () => {
    expect(evaluateScheduleExcess({ balance: 30_000 }, FOUR, 'delete_collected')).toMatchObject({
      presentation: 'banner',
      suggestedOrder: 'nearest',
      cancelReason: 'manual',
      excess: 10_000,
    });
  });
});

describe('schedule-excess: recorte (R2)', () => {
  it('OQ-30: con la misma fecha se recorta primero el más antiguo por creación, y luego por id (en ambos órdenes)', () => {
    const tied = [
      pay('b', '2026-11-15', 10_000, '2026-10-02T00:00:00Z'),
      pay('c', '2026-11-15', 10_000, '2026-10-01T00:00:00Z'),
      pay('a', '2026-11-15', 10_000, '2026-10-02T00:00:00Z'),
    ];
    expect(sortForTrim(tied, 'nearest').map((p) => p.paymentId)).toEqual(['c', 'a', 'b']);
    expect(sortForTrim(tied, 'farthest').map((p) => p.paymentId)).toEqual(['c', 'a', 'b']);
  });

  it('un abono mayor que lo que falta recortar se reduce sin cancelar', () => {
    expect(trimPlan([pay('x', '2026-11-15', 50_000)], 12_000, 'farthest')).toEqual([
      { paymentId: 'x', action: 'reduce', newAmount: 38_000 },
    ]);
  });

  it('sin sobrante no hay plan', () => {
    expect(trimPlan(FOUR, 0, 'nearest')).toEqual([]);
  });

  it('propiedad: tras aplicar el plan, lo programado = lo que falta pagar', () => {
    const payments = fc.array(
      fc.record({
        due: fc.integer({ min: 0, max: 60 }),
        amount: fc.integer({ min: 1, max: 200_000 }),
        created: fc.integer({ min: 0, max: 1_000 }),
      }),
      { minLength: 1, maxLength: 12 },
    );
    fc.assert(
      fc.property(
        payments,
        fc.integer({ min: -100_000, max: 1_000_000 }),
        fc.constantFrom('nearest' as const, 'farthest' as const),
        (raw, balance, order) => {
          const scheduled = raw.map((r, i) =>
            pay(
              `p${i}`,
              `2026-12-${String((r.due % 28) + 1).padStart(2, '0')}`,
              r.amount,
              new Date(Date.UTC(2026, 9, 1) + r.created * 1000).toISOString(),
            ),
          );
          const evaluation = evaluateScheduleExcess({ balance }, scheduled, 'review');
          if (!evaluation) return;
          const plan = trimPlan(scheduled, evaluation.excess, order);
          const after = scheduled.reduce((sum, p) => {
            const step = plan.find((s) => s.paymentId === p.paymentId);
            if (!step) return sum + p.agreedAmount;
            return step.action === 'cancel' ? sum : sum + step.newAmount;
          }, 0);
          expect(after).toBe(evaluation.remaining);
          // A lo sumo uno se reduce, y nunca a 0 ni a negativo.
          const reduced = plan.filter((s) => s.action === 'reduce');
          expect(reduced.length).toBeLessThanOrEqual(1);
          for (const step of reduced) if (step.action === 'reduce') expect(step.newAmount).toBeGreaterThan(0);
        },
      ),
    );
  });
});

describe('schedule-excess: programados vigentes', () => {
  it('solo por cobrar, no borrados y con fecha y valor', () => {
    const base = {
      dueDate: localDate('2026-11-15'),
      agreedAmount: 10_000,
      createdAt: new Date('2026-10-01T15:00:00Z'),
    };
    expect(
      scheduledForExcess([
        { ...base, id: 'ok', status: 'scheduled' },
        { ...base, id: 'cobrado', status: 'collected' },
        { ...base, id: 'cancelado', status: 'canceled' },
        { ...base, id: 'borrado', status: 'scheduled', deletedAt: new Date() },
        { ...base, id: 'sin-fecha', status: 'scheduled', dueDate: null },
        { ...base, id: 'sin-valor', status: 'scheduled', agreedAmount: null },
      ]),
    ).toEqual([{ paymentId: 'ok', ...base }]);
  });
});
