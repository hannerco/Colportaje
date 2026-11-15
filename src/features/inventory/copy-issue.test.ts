import { describe, expect, it, vi } from 'vitest';
import { appError } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import { fakeConnectivity } from '../../../tests/support/fake-connectivity';
import { fakeCopyRepository } from '../../../tests/support/fake-repositories';
import { flagCopy, resolveCopyIssue, undoResolveCopyIssue } from './use-cases/copy-issue';

const depsWith = (online = true) => ({
  connectivity: fakeConnectivity(online),
  copies: fakeCopyRepository({
    flag: vi.fn(async () => ok(undefined)),
    resolveIssue: vi.fn(async () => ok(undefined)),
    undoResolveIssue: vi.fn(async () => ok(undefined)),
  }),
});

describe('novedades (HU-INV-07)', () => {
  it('CA-1: marca con la nota sin espacios sobrantes; sin nota → VALIDATION sin ir a la red', async () => {
    const deps = depsWith();
    expect(await flagCopy(deps, 'k4', ' El líder contó 3 y tengo 2 ')).toEqual(ok(undefined));
    expect(deps.copies.flag).toHaveBeenCalledWith('k4', 'El líder contó 3 y tengo 2');
    expect(await flagCopy(deps, 'k4', '  ')).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION', details: { field: 'note' } },
    });
    expect(deps.copies.flag).toHaveBeenCalledTimes(1);
  });

  it('CA-2: resolver pasa la resolución y la nota opcional (vacía = null)', async () => {
    const deps = depsWith();
    await resolveCopyIssue(deps, 'k4', 'found');
    await resolveCopyIssue(deps, 'k4', 'lost', '  ');
    await resolveCopyIssue(deps, 'k4', 'removed', 'Error de registro');
    expect(vi.mocked(deps.copies.resolveIssue).mock.calls).toEqual([
      ['k4', 'found', null],
      ['k4', 'lost', null],
      ['k4', 'removed', 'Error de registro'],
    ]);
  });

  it('CA-5: UNDO_NOT_AVAILABLE pasa tal cual; sin conexión → OFFLINE en las tres acciones', async () => {
    const deps = depsWith();
    vi.mocked(deps.copies.undoResolveIssue).mockResolvedValueOnce(err(appError('UNDO_NOT_AVAILABLE')));
    expect(await undoResolveCopyIssue(deps, 'k4')).toEqual(err(appError('UNDO_NOT_AVAILABLE')));
    const offline = depsWith(false);
    expect(await flagCopy(offline, 'k4', 'nota')).toEqual(err(appError('OFFLINE')));
    expect(await resolveCopyIssue(offline, 'k4', 'found')).toEqual(err(appError('OFFLINE')));
    expect(await undoResolveCopyIssue(offline, 'k4')).toEqual(err(appError('OFFLINE')));
    expect(offline.copies.flag).not.toHaveBeenCalled();
  });
});
