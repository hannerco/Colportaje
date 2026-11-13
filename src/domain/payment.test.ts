import { describe, expect, it } from 'vitest';
import { isOverdue, overdueDays } from './payment';
import { localDate } from './time';

const today = localDate('2026-11-08');
const scheduledDue = (dueDate: string) => ({ status: 'scheduled' as const, dueDate: localDate(dueDate) });

describe('payment: vencido (BR-PAY-08)', () => {
  it('un abono por cobrar con fecha anterior a hoy está vencido; hoy o después, no', () => {
    expect(isOverdue(scheduledDue('2026-11-07'), today)).toBe(true);
    expect(isOverdue(scheduledDue('2026-11-08'), today)).toBe(false);
    expect(isOverdue(scheduledDue('2026-11-09'), today)).toBe(false);
  });

  it('cobrado, entregado o cancelado nunca está vencido, aunque su fecha haya pasado', () => {
    for (const status of ['collected', 'delivered', 'canceled'] as const) {
      expect(isOverdue({ status, dueDate: localDate('2026-01-01') }, today)).toBe(false);
    }
    expect(isOverdue({ status: 'scheduled', dueDate: null }, today)).toBe(false);
  });

  it('"Vencido · hace N días": días desde la fecha acordada; 0 si no está vencido', () => {
    expect(overdueDays(scheduledDue('2026-11-07'), today)).toBe(1);
    expect(overdueDays(scheduledDue('2026-10-29'), today)).toBe(10);
    expect(overdueDays(scheduledDue('2026-11-08'), today)).toBe(0);
    expect(overdueDays({ status: 'collected', dueDate: localDate('2026-10-01') }, today)).toBe(0);
  });
});
