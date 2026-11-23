import { describe, expect, it, vi } from 'vitest';
import { appError } from '@/domain/shared/errors';
import { err, ok } from '@/domain/shared/result';
import type { ImageCodec } from '@/repositories';
import { fakeConnectivity } from '../../../tests/support/fake-connectivity';
import { fakeTitleRepository } from '../../../tests/support/fake-repositories';
import { createTitle, removeTitleCover, setTitleCover, updateTitle } from './use-cases/manage-titles';

const codec: ImageCodec = {
  decode: async () => ({ width: 1200, height: 1800, source: null }),
  encodeImage: async () => new Blob([new Uint8Array(100)], { type: 'image/webp' }),
};
const file = new Blob([new Uint8Array(10)], { type: 'image/jpeg' });

const fields = {
  name: ' Psiconutrición ',
  author: '',
  description: null,
  publicPrice: 156_000,
  colportorPrice: 78_000,
  category: 'cultural' as const,
  isActive: true,
};

const deps = (online = true) => ({
  connectivity: fakeConnectivity(online),
  imageCodec: codec,
  titles: fakeTitleRepository({
    create: vi.fn(async () => ok(undefined)),
    update: vi.fn(async () => ok(undefined)),
    uploadCover: vi.fn(async () => ok(undefined)),
  }),
});

describe('Admin · Catálogo (HU-PAN-ADM-01)', () => {
  it('CA-2 / BR-TIT-02: crear guarda los datos limpios con el id del cliente', async () => {
    const d = deps();
    expect(await createTitle(d, { id: 't-1', fields })).toEqual(ok(undefined));
    expect(d.titles.create).toHaveBeenCalledWith('t-1', {
      ...fields,
      name: 'Psiconutrición',
      author: null,
    });
  });

  it('CA-3 / BR-TIT-04: datos inválidos no llegan a la base (VALIDATION con el campo)', async () => {
    const d = deps();
    const result = await createTitle(d, { id: 't-1', fields: { ...fields, publicPrice: null } });
    expect(!result.ok && result.error.details?.field).toBe('publicPrice');
    expect(d.titles.create).not.toHaveBeenCalled();
  });

  it('CA-4 / BR-TIT-03 / BR-TIT-07: editar cambia los datos (desactivar incluido); sin conexión no intenta', async () => {
    const d = deps();
    expect(await updateTitle(d, { id: 't-1', fields: { ...fields, isActive: false } })).toEqual(
      ok(undefined),
    );
    expect(d.titles.update).toHaveBeenCalledWith('t-1', expect.objectContaining({ isActive: false }));
    const offline = deps(false);
    expect(await updateTitle(offline, { id: 't-1', fields })).toEqual(err(appError('OFFLINE')));
    expect(offline.titles.update).not.toHaveBeenCalled();
  });

  it('CA-5 / DT-10: la portada se comprime, se sube con nombre nuevo y solo entonces se asigna', async () => {
    const d = deps();
    expect(await setTitleCover(d, { titleId: 't-1', coverId: 'c-9', file })).toEqual(ok(undefined));
    expect(d.titles.uploadCover).toHaveBeenCalledWith('t-1/c-9.webp', expect.any(Blob));
    expect(d.titles.update).toHaveBeenCalledWith('t-1', { imagePath: 't-1/c-9.webp' });
  });

  it('CA-5: si la subida falla, el título conserva su portada y el error es reintentable', async () => {
    const d = deps();
    vi.mocked(d.titles.uploadCover).mockResolvedValueOnce(err(appError('NETWORK_ERROR')));
    expect(await setTitleCover(d, { titleId: 't-1', coverId: 'c-9', file })).toEqual(
      err({ code: 'NETWORK_ERROR', retryable: true }),
    );
    expect(d.titles.update).not.toHaveBeenCalled();
  });

  it('CA-5: quitar la portada la deja sin imagen', async () => {
    const d = deps();
    expect(await removeTitleCover(d, 't-1')).toEqual(ok(undefined));
    expect(d.titles.update).toHaveBeenCalledWith('t-1', { imagePath: null });
  });
});
