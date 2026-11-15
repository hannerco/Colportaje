import { describe, expect, it } from 'vitest';
import { buildArchivePreview } from './customer-archive';
import type { PaymentStatus } from './payment';
import { localDate } from './time';

const payment = (id: string, status: PaymentStatus, due: string | null, amount: number | null) => ({
  id,
  status,
  dueDate: due === null ? null : localDate(due),
  agreedAmount: amount,
});

describe('buildArchivePreview (HU-CLI-11)', () => {
  it('CA-1 / R1: con un libro vendido no se puede archivar', () => {
    expect(buildArchivePreview(1, [])).toEqual({ canArchive: false, soldCount: 1, scheduledToCancel: [] });
  });

  it('CA-2 / R2 / R3: prospecto con 2 programados y un cobrado → se cancelan solo los 2, por fecha', () => {
    expect(
      buildArchivePreview(0, [
        payment('p2', 'scheduled', '2026-12-15', 50_000),
        payment('cobrado', 'collected', null, null),
        payment('p1', 'scheduled', '2026-11-30', 40_000),
        payment('viejo', 'canceled', '2026-11-01', 10_000),
        payment('entregado', 'delivered', null, null),
      ]),
    ).toEqual({
      canArchive: true,
      soldCount: 0,
      scheduledToCancel: [
        { paymentId: 'p1', dueDate: '2026-11-30', agreedAmount: 40_000 },
        { paymentId: 'p2', dueDate: '2026-12-15', agreedAmount: 50_000 },
      ],
    });
  });

  it('ordena por fecha venga como venga', () => {
    const early = payment('x', 'scheduled', '2026-11-20', 1);
    const late = payment('y', 'scheduled', '2026-12-20', 1);
    for (const input of [
      [early, late],
      [late, early],
    ])
      expect(buildArchivePreview(0, input).scheduledToCancel.map((p) => p.paymentId)).toEqual(['x', 'y']);
  });

  it('a igual fecha ordena por id; un programado incompleto (dato imposible) se ignora', () => {
    const preview = buildArchivePreview(0, [
      payment('b', 'scheduled', '2026-12-01', 1),
      payment('a', 'scheduled', '2026-12-01', 1),
      payment('c', 'scheduled', '2026-12-01', 1),
      payment('sin-fecha', 'scheduled', null, 1),
      payment('sin-valor', 'scheduled', '2026-12-01', null),
    ]);
    expect(preview.scheduledToCancel.map((p) => p.paymentId)).toEqual(['a', 'b', 'c']);
  });
});
