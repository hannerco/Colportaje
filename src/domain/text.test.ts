import { describe, expect, it } from 'vitest';
import { compareEs, compareIds, normalizeForSearch } from './text';

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

describe('compareIds (BR-GEN-14: desempate determinista)', () => {
  it('compara por código, sin idioma', () => {
    expect(compareIds('a', 'b')).toBe(-1);
    expect(compareIds('b', 'a')).toBe(1);
    expect(compareIds('a', 'a')).toBe(0);
    expect(compareIds('B', 'a')).toBe(-1);
  });
});
