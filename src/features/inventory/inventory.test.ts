import { describe, expect, it, vi } from 'vitest';
import { appError } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import { fixedClock, localDate } from '@/domain/time';
import type { CopyRepository } from '@/repositories';
import { fakeConnectivity } from '../../../tests/support/fake-connectivity';
import { addCopiesBatch } from './use-cases/add-copies-batch';

const TITLE = '00000000-0000-4000-8000-000000000101';
const COPY = '20000000-0000-4000-8000-000000000001';
// 04/11/2026 a las 22:00 en Bogotá (ya es 05/11 en UTC).
const clock = fixedClock('2026-11-05T03:00:00Z');

const input = (receivedAt = '2026-11-04') => ({
  batchId: '10000000-0000-4000-8000-000000000001',
  receivedAt: localDate(receivedAt),
  lines: [{ titleId: TITLE, copyIds: [COPY] }],
});

const copiesWith = (addBatch: CopyRepository['addBatch']): CopyRepository => ({
  getHistory: vi.fn(),
  addBatch: vi.fn(addBatch),
});

describe('addCopiesBatch (HU-INV-02)', () => {
  it('confirma el lote y devuelve los ejemplares creados', async () => {
    const created = [{ copyId: COPY, titleId: TITLE, number: 1 }];
    const copies = copiesWith(async () => ok({ created }));
    const result = await addCopiesBatch({ copies, connectivity: fakeConnectivity(), clock }, input());
    expect(result).toEqual(ok({ created }));
    expect(copies.addBatch).toHaveBeenCalledWith(input());
  });

  it('sin conexión → OFFLINE sin llamar a la base (BR-GEN-08)', async () => {
    const copies = copiesWith(async () => ok({ created: [] }));
    const result = await addCopiesBatch({ copies, connectivity: fakeConnectivity(false), clock }, input());
    expect(result).toEqual(err(appError('OFFLINE')));
    expect(copies.addBatch).not.toHaveBeenCalled();
  });

  it('CA-5: fecha 05/11/2026 con hoy 04/11/2026 en Bogotá → DATE_IN_FUTURE sin llamar a la base', async () => {
    const copies = copiesWith(async () => ok({ created: [] }));
    const result = await addCopiesBatch(
      { copies, connectivity: fakeConnectivity(), clock },
      input('2026-11-05'),
    );
    expect(result).toEqual(err(appError('DATE_IN_FUTURE')));
    expect(copies.addBatch).not.toHaveBeenCalled();
  });

  it('un fallo de red a mitad → NETWORK_ERROR reintentable', async () => {
    const copies = copiesWith(async () => {
      throw new TypeError('Failed to fetch');
    });
    const result = await addCopiesBatch({ copies, connectivity: fakeConnectivity(), clock }, input());
    expect(result).toEqual(err(appError('NETWORK_ERROR')));
    expect(!result.ok && result.error.retryable).toBe(true);
  });

  it('los errores de la base pasan tal cual (TITLE_INACTIVE con sus títulos)', async () => {
    const failure = err(appError('TITLE_INACTIVE', { titleIds: [TITLE] }));
    const copies = copiesWith(async () => failure);
    expect(await addCopiesBatch({ copies, connectivity: fakeConnectivity(), clock }, input())).toEqual(
      failure,
    );
  });
});
