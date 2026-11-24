import { describe, expect, it } from 'vitest';
import type { LocalDate } from '@/domain/time';
import {
  removeInvoicePhoto,
  removePhoto,
  replaceInvoicePhoto,
  replacePhoto,
  type LocalInvoice,
  type LocalPhoto,
} from './local-photos';

const photo = (photoId: string): LocalPhoto => ({
  photoId,
  file: new File(['x'], `${photoId}.jpg`, { type: 'image/jpeg' }),
  thumbUrl: `blob:${photoId}`,
});

const invoice = (invoiceId: string, ...photoIds: string[]): LocalInvoice => ({
  invoiceId,
  number: '0012',
  date: '2026-11-24' as LocalDate,
  photos: photoIds.map(photo),
});

describe('fotos antes de guardar el cliente', () => {
  it('cambiar una imagen la deja en el mismo lugar', () => {
    const result = replacePhoto([photo('a'), photo('b')], 'a', photo('c'));
    expect(result.map((p) => p.photoId)).toEqual(['c', 'b']);
  });

  it('quitar una imagen deja las demás', () => {
    expect(removePhoto([photo('a'), photo('b')], 'a').map((p) => p.photoId)).toEqual(['b']);
  });

  it('cambiar la foto de una factura no toca las otras facturas', () => {
    const result = replaceInvoicePhoto([invoice('f1', 'a'), invoice('f2', 'b')], 'f1', 'a', photo('c'));
    expect(result.map((i) => i.photos.map((p) => p.photoId))).toEqual([['c'], ['b']]);
    expect(result[0]?.number).toBe('0012');
  });

  it('quitar una de varias fotos deja la factura con las demás', () => {
    const result = removeInvoicePhoto([invoice('f1', 'a', 'b')], 'a');
    expect(result).toHaveLength(1);
    expect(result[0]?.photos.map((p) => p.photoId)).toEqual(['b']);
  });

  it('quitar la única foto quita la factura (BR-CUS-17)', () => {
    const result = removeInvoicePhoto([invoice('f1', 'a'), invoice('f2', 'b')], 'a');
    expect(result.map((i) => i.invoiceId)).toEqual(['f2']);
  });
});
