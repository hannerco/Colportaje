import { describe, expect, it, vi } from 'vitest';
import { appError } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import { fakeConnectivity } from '../../../tests/support/fake-connectivity';
import { fakeCopyRepository } from '../../../tests/support/fake-repositories';
import { deleteCopy, undoDeleteCopy } from './use-cases/copy-delete';

const depsWith = (online = true) => ({
  connectivity: fakeConnectivity(online),
  copies: fakeCopyRepository({
    delete: vi.fn(async () => ok(undefined)),
    undoDelete: vi.fn(async () => ok(undefined)),
  }),
});

describe('eliminar un ejemplar (HU-INV-08)', () => {
  it('CA-1: elimina con la nota sin espacios sobrantes; sin nota pasa null', async () => {
    const deps = depsWith();
    expect(await deleteCopy(deps, 'k9', ' Lo registré dos veces ')).toEqual(ok(undefined));
    expect(await deleteCopy(deps, 'k9')).toEqual(ok(undefined));
    expect(vi.mocked(deps.copies.delete).mock.calls).toEqual([
      ['k9', 'Lo registré dos veces'],
      ['k9', null],
    ]);
  });

  it('CA-5: con la nota obligatoria por configuración, sin nota → NOTE_REQUIRED sin ir a la red', async () => {
    const deps = depsWith();
    expect(await deleteCopy(deps, 'k9', '  ', { noteRequired: true })).toEqual(
      err(appError('NOTE_REQUIRED')),
    );
    expect(deps.copies.delete).not.toHaveBeenCalled();
    expect(await deleteCopy(deps, 'k9', 'Sobraba', { noteRequired: true })).toEqual(ok(undefined));
  });

  it('CA-3: los errores de la base pasan; sin conexión → OFFLINE', async () => {
    const deps = depsWith();
    vi.mocked(deps.copies.delete).mockResolvedValueOnce(err(appError('COPY_NOT_DELETABLE')));
    expect(await deleteCopy(deps, 'k9')).toEqual(err(appError('COPY_NOT_DELETABLE')));
    expect(await undoDeleteCopy(deps, 'k9')).toEqual(ok(undefined));
    const offline = depsWith(false);
    expect(await deleteCopy(offline, 'k9')).toEqual(err(appError('OFFLINE')));
    expect(await undoDeleteCopy(offline, 'k9')).toEqual(err(appError('OFFLINE')));
    expect(offline.copies.undoDelete).not.toHaveBeenCalled();
  });
});
