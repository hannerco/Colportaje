import { describe, expect, it, vi } from 'vitest';
import { appError } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import { localDate } from '@/domain/time';
import type { Title } from '@/domain/title';
import { fakeConnectivity } from '../../../tests/support/fake-connectivity';
import { fakeCopyRepository, fakeTitleRepository } from '../../../tests/support/fake-repositories';
import {
  loadReturnCandidatesData,
  returnCandidatesFrom,
  returnCopiesToLeader,
  undoReturnToLeader,
} from './use-cases/return-to-leader';

const depsWith = (online = true) => ({
  connectivity: fakeConnectivity(online),
  copies: fakeCopyRepository({
    returnToLeader: vi.fn(async () => ok({ returnedCopyIds: ['a'] })),
    undoReturnToLeader: vi.fn(async () => ok(undefined)),
    listStock: vi.fn(async () =>
      ok([
        {
          id: 'a',
          titleId: 't1',
          number: 1,
          status: 'in_stock' as const,
          receivedAt: localDate('2026-10-01'),
        },
        {
          id: 'f',
          titleId: 't2',
          number: 1,
          status: 'flagged' as const,
          receivedAt: localDate('2026-10-01'),
        },
      ]),
    ),
  }),
  titles: fakeTitleRepository({
    getMany: vi.fn(async () => ok([{ id: 't1', name: 'Salud', category: 'cultural' } as Title])),
  }),
});

describe('devolver al líder (HU-INV-09)', () => {
  it('candidatos: solo en físico (pide solo esos títulos) y búsqueda en el teléfono', async () => {
    const deps = depsWith();
    const data = await loadReturnCandidatesData(deps);
    expect(deps.titles.getMany).toHaveBeenCalledWith(['t1']);
    expect(data.ok && returnCandidatesFrom(data.value).books.map((b) => b.copyId)).toEqual(['a']);
    expect(data.ok && returnCandidatesFrom(data.value, 'xyz').books).toEqual([]);
    vi.mocked(deps.titles.getMany).mockResolvedValueOnce(err(appError('NETWORK_ERROR')));
    expect(await loadReturnCandidatesData(deps)).toEqual(err(appError('NETWORK_ERROR')));
    vi.mocked(deps.copies.listStock).mockResolvedValueOnce(err(appError('NETWORK_ERROR')));
    expect(await loadReturnCandidatesData(deps)).toEqual(err(appError('NETWORK_ERROR')));
  });

  it('CA-1: devuelve con la selección validada (nota recortada, sin repetidos)', async () => {
    const deps = depsWith();
    expect(
      await returnCopiesToLeader(deps, {
        opId: 'op-1',
        copyIds: ['a', 'a'],
        minibookLines: [{ titleId: 'm', quantity: 2 }],
        note: ' Fin de campaña ',
      }),
    ).toEqual(ok({ returnedCopyIds: ['a'] }));
    expect(deps.copies.returnToLeader).toHaveBeenCalledWith({
      opId: 'op-1',
      copyIds: ['a'],
      minibookLines: [{ titleId: 'm', quantity: 2 }],
      note: 'Fin de campaña',
    });
  });

  it('CA-3: sin nota → NOTE_REQUIRED sin ir a la red (también al deshacer)', async () => {
    const deps = depsWith();
    expect(
      await returnCopiesToLeader(deps, { opId: 'op', copyIds: ['a'], minibookLines: [], note: ' ' }),
    ).toEqual(err(appError('NOTE_REQUIRED')));
    expect(await undoReturnToLeader(deps, 'a', '')).toEqual(err(appError('NOTE_REQUIRED')));
    expect(deps.copies.returnToLeader).not.toHaveBeenCalled();
    expect(deps.copies.undoReturnToLeader).not.toHaveBeenCalled();
  });

  it('CA-5: deshacer con nota; sin conexión → OFFLINE', async () => {
    const deps = depsWith();
    expect(await undoReturnToLeader(deps, 'a', ' Me equivoqué de libro ')).toEqual(ok(undefined));
    expect(deps.copies.undoReturnToLeader).toHaveBeenCalledWith('a', 'Me equivoqué de libro');
    const offline = depsWith(false);
    expect(
      await returnCopiesToLeader(offline, { opId: 'op', copyIds: ['a'], minibookLines: [], note: 'x' }),
    ).toEqual(err(appError('OFFLINE')));
    expect(await undoReturnToLeader(offline, 'a', 'x')).toEqual(err(appError('OFFLINE')));
  });
});
