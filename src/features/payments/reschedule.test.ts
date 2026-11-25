import { describe, expect, it, vi } from 'vitest';
import { appError } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import { fixedClock, localDate } from '@/domain/time';
import { fakeConnectivity } from '../../../tests/support/fake-connectivity';
import { fakePaymentRepository } from '../../../tests/support/fake-repositories';
import { reschedulePayment } from './use-cases/reschedule';

const clock = fixedClock('2026-11-05T15:00:00Z');
const moved = {
  paymentId: 'p1',
  previousDueDate: localDate('2026-10-17'),
  newDueDate: localDate('2026-11-15'),
};

const depsWith = (online = true) => ({
  payments: fakePaymentRepository({ reschedule: vi.fn(async () => ok({ moved: [moved] })) }),
  connectivity: fakeConnectivity(online),
  clock,
});

describe('reschedulePayment (HU-ABO-05)', () => {
  it('CA-1: prorroga y devuelve lo que se movió', async () => {
    const deps = depsWith();
    expect(
      await reschedulePayment(deps, 'p1', { newDueDate: localDate('2026-11-15'), note: 'Pidió plazo' }),
    ).toEqual(ok({ moved: [moved] }));
    expect(deps.payments.reschedule).toHaveBeenCalledWith('p1', {
      newDueDate: '2026-11-15',
      note: 'Pidió plazo',
    });
  });

  it('ronda 38: a más de 2 meses o hacia atrás va directo a la base, sin confirmar', async () => {
    const deps = depsWith();
    await reschedulePayment(deps, 'p1', {
      newDueDate: localDate('2027-06-10'),
      currentDueDate: localDate('2026-11-30'),
    });
    await reschedulePayment(deps, 'p1', {
      newDueDate: localDate('2026-11-20'),
      currentDueDate: localDate('2026-11-30'),
    });
    expect(deps.payments.reschedule).toHaveBeenCalledTimes(2);
  });

  it('a la misma fecha → VALIDATION sin ir a la red; sin conexión → OFFLINE', async () => {
    const deps = depsWith();
    expect(
      await reschedulePayment(deps, 'p1', {
        newDueDate: localDate('2026-11-30'),
        currentDueDate: localDate('2026-11-30'),
      }),
    ).toMatchObject({ ok: false, error: { code: 'VALIDATION' } });
    expect(await reschedulePayment(depsWith(false), 'p1', { newDueDate: localDate('2026-11-20') })).toEqual(
      err(appError('OFFLINE')),
    );
    expect(deps.payments.reschedule).not.toHaveBeenCalled();
  });

  it('los errores de la base pasan tal cual', async () => {
    const deps = depsWith();
    vi.mocked(deps.payments.reschedule).mockResolvedValue(err(appError('PAYMENT_NOT_SCHEDULED')));
    expect(await reschedulePayment(deps, 'p1', { newDueDate: localDate('2026-11-20') })).toEqual(
      err(appError('PAYMENT_NOT_SCHEDULED')),
    );
  });
});
