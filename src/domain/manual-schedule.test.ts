import { describe, expect, it } from 'vitest';
import {
  dateChangeNotes,
  farAheadLimit,
  isSavable,
  proposedAmount,
  rowNotes,
  scheduleTotals,
  sortByDueDate,
} from './manual-schedule';
import { localDate } from './time';

const d = localDate;
const today = d('2026-11-24');

describe('abonos a mano (ronda 38, ADR-0052)', () => {
  it('se ordenan por fecha; los que no tienen fecha van al final, en el orden en que se agregaron', () => {
    const rows = [
      { id: 'a', dueDate: d('2026-12-22') },
      { id: 'b', dueDate: null },
      { id: 'c', dueDate: d('2026-12-08') },
      { id: 'd', dueDate: null },
    ];
    expect(sortByDueDate(rows).map((r) => r.id)).toEqual(['c', 'a', 'b', 'd']);
  });

  it('«+ Agregar abono» propone lo que falta; $0 si ya está cubierto', () => {
    expect(proposedAmount(140_000, 105_000)).toBe(35_000);
    expect(proposedAmount(140_000, 140_000)).toBe(0);
    expect(proposedAmount(140_000, 175_000)).toBe(0);
  });

  it('solo se guarda un abono con fecha y valor mayor que 0', () => {
    expect(isSavable({ dueDate: d('2026-12-08'), amount: 35_000 })).toBe(true);
    expect(isSavable({ dueDate: d('2026-12-08'), amount: 0 })).toBe(false);
    expect(isSavable({ dueDate: null, amount: 35_000 })).toBe(false);
  });

  describe('totalizador', () => {
    it('todo programado', () => {
      expect(scheduleTotals(140_000, [35_000, 35_000, 35_000, 35_000])).toEqual({
        pending: 140_000,
        scheduled: 140_000,
        state: 'exact',
        difference: 0,
      });
    });
    it('falta programar', () => {
      const totals = scheduleTotals(140_000, [35_000, 35_000, 35_000]);
      expect(totals.state).toBe('missing');
      expect(totals.difference).toBe(35_000);
    });
    it('programaste de más', () => {
      const totals = scheduleTotals(140_000, [35_000, 35_000, 35_000, 70_000]);
      expect(totals.state).toBe('over');
      expect(totals.difference).toBe(35_000);
    });
    it('un saldo a favor cuenta como 0 pendiente', () => {
      expect(scheduleTotals(-10_000, [20_000])).toMatchObject({
        pending: 0,
        state: 'over',
        difference: 20_000,
      });
    });
  });

  describe('avisos de la fila', () => {
    it('al crear, una fecha pasada «ya pasó»; guardado, está vencido hace N días', () => {
      expect(rowNotes({ dueDate: d('2026-11-10'), amount: 1, today, saved: false })).toEqual([
        { kind: 'past' },
      ]);
      expect(rowNotes({ dueDate: d('2026-11-21'), amount: 1, today, saved: true })).toEqual([
        { kind: 'overdue', days: 3 },
      ]);
    });
    it('sin fecha, en $0, a más de 2 meses y aplazado', () => {
      expect(rowNotes({ dueDate: null, amount: 0, today, saved: false })).toEqual([
        { kind: 'noDate' },
        { kind: 'zero' },
      ]);
      expect(rowNotes({ dueDate: d('2027-02-05'), amount: 1, today, saved: false })).toEqual([
        { kind: 'farAhead' },
      ]);
      expect(
        rowNotes({
          dueDate: d('2026-12-12'),
          amount: 1,
          today,
          saved: true,
          rescheduledFrom: d('2026-12-05'),
        }),
      ).toEqual([{ kind: 'rescheduled', before: '2026-12-05' }]);
    });
    it('el límite de 2 meses exacto no avisa (OQ-31)', () => {
      expect(farAheadLimit(today)).toBe('2027-01-24');
      expect(rowNotes({ dueDate: d('2027-01-24'), amount: 1, today, saved: false })).toEqual([]);
    });
  });

  describe('avisos al cambiar la fecha (nunca bloquean)', () => {
    const others = [d('2026-12-15'), d('2026-12-29')];
    it('hacia atrás: «Es antes de la fecha que tenía» y, si salta otro abono, «hay uno después»', () => {
      expect(
        dateChangeNotes({
          previous: d('2026-12-29'),
          next: d('2026-12-08'),
          today,
          others: [d('2026-12-15')],
          reason: 'correct',
        }),
      ).toEqual([
        { kind: 'earlier', previous: '2026-12-29' },
        { kind: 'paymentAfter', other: '2026-12-15' },
      ]);
    });
    it('hacia adelante: cuántos días se aplaza y, si salta otro, «hay uno antes»', () => {
      expect(
        dateChangeNotes({
          previous: d('2026-12-01'),
          next: d('2026-12-20'),
          today,
          others,
          reason: 'reschedule',
        }),
      ).toEqual([
        { kind: 'later', previous: '2026-12-01', days: 19, reason: 'reschedule' },
        { kind: 'paymentBefore', other: '2026-12-15' },
      ]);
    });
    it('sin saltar otro abono, solo el cambio', () => {
      expect(
        dateChangeNotes({
          previous: d('2026-12-01'),
          next: d('2026-12-10'),
          today,
          others,
          reason: 'correct',
        }),
      ).toEqual([{ kind: 'later', previous: '2026-12-01', days: 9, reason: 'correct' }]);
    });
    it('una fecha pasada y otra a más de 2 meses solo avisan', () => {
      expect(
        dateChangeNotes({ previous: null, next: d('2026-11-01'), today, others: [], reason: 'correct' }),
      ).toEqual([{ kind: 'past' }]);
      expect(
        dateChangeNotes({
          previous: d('2026-12-01'),
          next: d('2027-03-01'),
          today,
          others: [],
          reason: 'reschedule',
        }),
      ).toContainEqual({ kind: 'farAhead' });
    });
  });
});
