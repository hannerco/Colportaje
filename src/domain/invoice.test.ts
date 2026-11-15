import { describe, expect, it } from 'vitest';
import { sortInvoices, validateInvoicePatch, type Invoice } from './invoice';
import { localDate } from './time';

const at = (iso: string) => new Date(iso);
const invoice = (id: string, date: string | null, created: string, photos: string[] = []): Invoice => ({
  id,
  number: null,
  date: date === null ? null : localDate(date),
  createdAt: at(created),
  photos: photos.map((p, i) => ({
    id: p,
    path: p,
    thumbPath: p,
    createdAt: at(`2026-11-0${i + 1}T12:00:00Z`),
  })),
});

describe('facturas (HU-CLI-08)', () => {
  it('orden: fecha descendente, sin fecha al final; a igual fecha, la más reciente primero', () => {
    const list = [
      invoice('a', null, '2026-11-05T12:00:00Z'),
      invoice('b', '2026-11-01', '2026-11-01T12:00:00Z'),
      invoice('c', '2026-11-03', '2026-11-03T12:00:00Z'),
      invoice('d', '2026-11-03', '2026-11-04T12:00:00Z'),
      invoice('e', null, '2026-11-06T12:00:00Z'),
      invoice('f', '2026-11-03', '2026-11-04T12:00:00Z'),
    ];
    expect(sortInvoices(list).map((i) => i.id)).toEqual(['f', 'd', 'c', 'b', 'e', 'a']);
  });

  it('las fotos van en el orden en que se subieron', () => {
    const [sorted] = sortInvoices([
      {
        ...invoice('a', '2026-11-03', '2026-11-03T12:00:00Z'),
        photos: [
          { id: 'reverso', path: 'r', thumbPath: 'r', createdAt: at('2026-11-03T12:05:00Z') },
          { id: 'frente', path: 'f', thumbPath: 'f', createdAt: at('2026-11-03T12:00:00Z') },
        ],
      },
    ]);
    expect(sorted!.photos.map((p) => p.id)).toEqual(['frente', 'reverso']);
  });

  it('R2 / R3: el N.º se recorta y vacío es null; la fecha se valida o se vacía; lo ausente no cambia', () => {
    expect(validateInvoicePatch({ number: ' 0123 ' })).toEqual({ ok: true, value: { number: '0123' } });
    expect(validateInvoicePatch({ number: '   ' })).toEqual({ ok: true, value: { number: null } });
    expect(validateInvoicePatch({ number: null, date: null })).toEqual({
      ok: true,
      value: { number: null, date: null },
    });
    expect(validateInvoicePatch({ date: '2026-11-03' })).toEqual({ ok: true, value: { date: '2026-11-03' } });
    expect(validateInvoicePatch({})).toEqual({ ok: true, value: {} });
    for (const bad of ['2026-02-30', '03/11/2026', ''])
      expect(validateInvoicePatch({ date: bad })).toMatchObject({
        ok: false,
        error: { code: 'VALIDATION', details: { field: 'date' } },
      });
  });
});
