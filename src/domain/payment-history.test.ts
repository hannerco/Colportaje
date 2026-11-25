import { describe, expect, it } from 'vitest';
import { buildPaymentHistory } from './payment-history';
import { localDate } from './time';

const base = {
  kind: 'scheduled' as const,
  status: 'scheduled' as const,
  agreedAmount: 30_000,
  originalDueDate: localDate('2026-10-26'),
  dueDate: localDate('2026-11-02'),
  paidAmount: null,
  paidAt: null,
  method: null,
  createdAt: new Date('2026-10-03T15:00:00Z'),
};

describe('buildPaymentHistory (#72)', () => {
  it('programado y más plazo con su nota, del más reciente al más antiguo', () => {
    const history = buildPaymentHistory({
      payment: base,
      reschedules: [
        {
          previousDueDate: localDate('2026-10-26'),
          newDueDate: localDate('2026-11-02'),
          changedAt: new Date('2026-10-24T20:00:00Z'),
          note: 'Pidió esperar a la quincena',
        },
      ],
      events: [],
      deposit: null,
    });
    expect(history).toEqual([
      {
        id: 'rescheduled-0',
        kind: 'rescheduled',
        date: '2026-10-24',
        from: '2026-10-26',
        to: '2026-11-02',
        note: 'Pidió esperar a la quincena',
      },
      { id: 'scheduled', kind: 'scheduled', date: '2026-10-03', amount: 30_000, dueDate: '2026-10-26' },
    ]);
  });

  it('cobrado y entregado al líder; el programado conserva el valor de antes de un recorte', () => {
    const history = buildPaymentHistory({
      payment: {
        ...base,
        status: 'delivered',
        agreedAmount: 20_000,
        paidAmount: 20_000,
        paidAt: localDate('2026-10-19'),
        method: 'cash',
      },
      reschedules: [],
      events: [
        {
          type: 'amount_reduced',
          at: new Date('2026-10-10T15:00:00Z'),
          previousAmount: 30_000,
          newAmount: 20_000,
        },
      ],
      deposit: { title: 'Abibono – 25/10/2026', date: localDate('2026-10-25') },
    });
    expect(history.map((h) => h.kind)).toEqual(['delivered', 'collected', 'reduced', 'scheduled']);
    expect(history.at(-1)).toMatchObject({ amount: 30_000 });
  });

  it('ronda 38: «Cobro corregido» con solo lo que cambió; «Cobrado» muestra lo que se cobró la primera vez', () => {
    const history = buildPaymentHistory({
      payment: {
        ...base,
        status: 'collected',
        paidAmount: 35_000,
        paidAt: localDate('2026-11-05'),
        method: 'transfer',
      },
      reschedules: [],
      events: [
        {
          type: 'collect_corrected',
          at: new Date('2026-11-25T15:00:00Z'),
          previousAmount: 30_000,
          newAmount: 35_000,
          previousPaidAt: localDate('2026-11-05'),
          newPaidAt: localDate('2026-11-05'),
          previousMethod: 'cash',
          newMethod: 'transfer',
        },
      ],
      deposit: null,
    });
    expect(history.slice(0, 2)).toEqual([
      {
        id: 'collect_corrected-0',
        kind: 'corrected',
        date: '2026-11-25',
        amount: { from: 30_000, to: 35_000 },
        method: { from: 'cash', to: 'transfer' },
      },
      { id: 'collected', kind: 'collected', date: '2026-11-05', amount: 30_000, method: 'cash' },
    ]);
  });

  it('una cuota inicial no tiene «Programado»', () => {
    const history = buildPaymentHistory({
      payment: {
        ...base,
        kind: 'down_payment',
        status: 'collected',
        paidAmount: 50_000,
        paidAt: localDate('2026-10-03'),
        method: 'transfer',
      },
      reschedules: [],
      events: [],
      deposit: null,
    });
    expect(history.map((h) => h.kind)).toEqual(['collected']);
  });
});
