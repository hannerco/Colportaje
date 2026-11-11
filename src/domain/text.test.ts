import { describe, expect, it } from 'vitest';
import { compareEs, normalizeForSearch } from './text';

describe('text', () => {
  it('CA-5: "María José  Gómez" se normaliza a "maria jose gomez"', () => {
    expect(normalizeForSearch('María José  Gómez')).toBe('maria jose gomez');
  });

  it('normalizeForSearch: recorta, colapsa tabs y saltos, quita diéresis y la virgulilla de la ñ', () => {
    expect(normalizeForSearch('  PEÑA\t\tGüiza \n ')).toBe('pena guiza');
  });

  it('compareEs ignora mayúsculas y tildes', () => {
    expect(compareEs('álvaro', 'Alvaro')).toBe(0);
  });

  it('compareEs ordena en español (ñ después de n) y los números por valor', () => {
    expect(['Ñoño', 'Nubia', 'Óscar', 'andrés'].sort(compareEs)).toEqual([
      'andrés',
      'Nubia',
      'Ñoño',
      'Óscar',
    ]);
    expect(['Calle 10', 'Calle 9'].sort(compareEs)).toEqual(['Calle 9', 'Calle 10']);
  });
});
