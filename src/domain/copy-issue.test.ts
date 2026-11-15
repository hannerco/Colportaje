import { describe, expect, it } from 'vitest';
import { COPY_TRANSITIONS, type CopyEvent } from './copy';
import { RESOLUTION_TARGET, resolutionNote, undoableResolution, validateIssueNote } from './copy-issue';

const ev = (type: CopyEvent['type'], data: CopyEvent['data'] = {}) => ({ type, data });

describe('validateIssueNote (HU-INV-07 R1)', () => {
  it('la nota es obligatoria y se guarda sin espacios sobrantes', () => {
    expect(validateIssueNote('  El líder contó 3 y tengo 2 ')).toEqual({
      ok: true,
      value: 'El líder contó 3 y tengo 2',
    });
    for (const note of ['', '   '])
      expect(validateIssueNote(note)).toMatchObject({
        ok: false,
        error: { code: 'VALIDATION', details: { field: 'note' } },
      });
  });

  it('al resolver la nota es opcional: vacía = sin nota', () => {
    expect(resolutionNote(undefined)).toBeNull();
    expect(resolutionNote(null)).toBeNull();
    expect(resolutionNote('   ')).toBeNull();
    expect(resolutionNote(' Estaba en la caja ')).toBe('Estaba en la caja');
  });
});

describe('resoluciones y transiciones (R3)', () => {
  it('cada resolución lleva al mismo estado que la tabla de transiciones', () => {
    expect(RESOLUTION_TARGET.found).toBe(COPY_TRANSITIONS.resolve_found.to);
    expect(RESOLUTION_TARGET.lost).toBe(COPY_TRANSITIONS.resolve_lost.to);
    expect(RESOLUTION_TARGET.removed).toBe(COPY_TRANSITIONS.resolve_removed.to);
  });
});

describe('undoableResolution (R4)', () => {
  const resolved = (resolution: string) => ev('resolved', { resolution });

  it('CA-3 / CA-4 / CA-6: la última resolución vigente se puede deshacer', () => {
    expect(undoableResolution([resolved('found'), ev('flagged')], 'in_stock')).toBe('found');
    expect(undoableResolution([resolved('lost'), ev('flagged')], 'lost')).toBe('lost');
    expect(undoableResolution([resolved('removed'), ev('flagged')], 'deleted')).toBe('removed');
  });

  it('los eventos que no cambian el estado (precio, fecha de recibido) no estorban', () => {
    expect(
      undoableResolution([ev('received_date_changed'), ev('price_changed'), resolved('found')], 'in_stock'),
    ).toBe('found');
  });

  it('CA-5: Apareció y luego vendido → ya no se deshace', () => {
    expect(undoableResolution([ev('sold'), resolved('found'), ev('flagged')], 'sold')).toBeNull();
    // Aunque volviera a físico, el último cambio ya no es la resolución.
    expect(undoableResolution([ev('returned'), ev('sold'), resolved('found')], 'in_stock')).toBeNull();
  });

  it('si el estado no corresponde a la resolución, o no hay resolución, no se deshace', () => {
    expect(undoableResolution([resolved('found')], 'lost')).toBeNull();
    expect(undoableResolution([resolved('lost')], 'in_stock')).toBeNull();
    expect(undoableResolution([resolved('removed')], 'flagged')).toBeNull();
    expect(undoableResolution([ev('undo_resolved'), resolved('found')], 'flagged')).toBeNull();
    expect(undoableResolution([ev('resolved', {})], 'in_stock')).toBeNull();
    expect(undoableResolution([], 'in_stock')).toBeNull();
  });
});
