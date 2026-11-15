import { describe, expect, it } from 'vitest';
import type { CopyState } from './copy';
import { DELETE_NOTE_REQUIRED, deleteNote, isDeletable } from './copy-delete';

const COPY_STATES: CopyState[] = ['in_stock', 'flagged', 'sold', 'lost', 'returned_to_leader', 'deleted'];

describe('isDeletable (HU-INV-08 R1–R3)', () => {
  it('solo en físico o con novedad; nunca vendido, perdido, devuelto al líder ni ya eliminado', () => {
    expect(Object.fromEntries(COPY_STATES.map((s) => [s, isDeletable(s)]))).toEqual({
      in_stock: true,
      flagged: true,
      sold: false,
      lost: false,
      returned_to_leader: false,
      deleted: false,
    });
  });
});

describe('deleteNote (R4, BR-GEN-15)', () => {
  it('hoy la nota es opcional (configuración)', () => {
    expect(DELETE_NOTE_REQUIRED).toBe(false);
    expect(deleteNote(undefined)).toEqual({ ok: true, value: null });
    expect(deleteNote('   ')).toEqual({ ok: true, value: null });
    expect(deleteNote(' Lo registré dos veces ')).toEqual({ ok: true, value: 'Lo registré dos veces' });
  });

  it('CA-5: si la configuración la exige, sin nota → NOTE_REQUIRED', () => {
    expect(deleteNote(null, true)).toEqual({
      ok: false,
      error: { code: 'NOTE_REQUIRED', retryable: false },
    });
    expect(deleteNote('  ', true)).toMatchObject({ ok: false, error: { code: 'NOTE_REQUIRED' } });
    expect(deleteNote('Sobraba', true)).toEqual({ ok: true, value: 'Sobraba' });
  });
});
