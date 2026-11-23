import { describe, expect, it } from 'vitest';
import { EMOJI_GROUPS, filterEmojis } from './emoji-data';

describe('filterEmojis (#34)', () => {
  it('sin búsqueda devuelve todos los grupos', () => {
    expect(filterEmojis('')).toHaveLength(EMOJI_GROUPS.length);
  });

  it('busca por nombre en español, sin tildes ni mayúsculas', () => {
    const found = filterEmojis('PANADERIA');
    expect(found.flatMap((g) => g.items.map((i) => i.emoji))).toEqual(['🍞']);
  });

  it('sin resultados devuelve una lista vacía', () => {
    expect(filterEmojis('zzz')).toEqual([]);
  });

  it('cada emoji es uno solo (BR-CUS-15) y no se repite', () => {
    const all = EMOJI_GROUPS.flatMap((g) => g.items.map((i) => i.emoji));
    expect(new Set(all).size).toBe(all.length);
  });
});
